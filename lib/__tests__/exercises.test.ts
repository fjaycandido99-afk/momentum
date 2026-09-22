import { describe, it, expect } from 'vitest'
import { ALL_EXERCISES, ERA_TOOLKITS, EXERCISES_BY_ID, exerciseSeconds } from '@/lib/exercises/library'
import { cueAt, pickExercise, pickFromId, poolFor } from '@/lib/exercises/select'
import { ATTRIBUTES_BY_ID, ERA_ATTRIBUTES, attributesForEra } from '@/lib/exercises/attributes'
import { ERA_PRESETS, CUSTOM_ERA_KEY } from '@/lib/era/presets'
import { eraStage } from '@/lib/era/logic'

describe('the library itself', () => {
  it('has no duplicate ids', () => {
    expect(EXERCISES_BY_ID.size).toBe(ALL_EXERCISES.length)
  })

  it('trains something nameable, and not more than two things', () => {
    for (const e of ALL_EXERCISES) {
      expect(e.trains.length, e.id).toBeGreaterThan(0)
      expect(e.trains.length, e.id).toBeLessThanOrEqual(2)
      for (const a of e.trains) expect(ATTRIBUTES_BY_ID.has(a), `${e.id} → ${a}`).toBe(true)
    }
  })

  it('starts every exercise at 0 and keeps cues in order and inside the clock', () => {
    for (const e of ALL_EXERCISES) {
      expect(e.cues.length, e.id).toBeGreaterThan(0)
      expect(e.cues[0].at, e.id).toBe(0)
      for (let i = 1; i < e.cues.length; i++) {
        expect(e.cues[i].at, `${e.id} cue ${i}`).toBeGreaterThan(e.cues[i - 1].at)
      }
      const last = e.cues[e.cues.length - 1]
      expect(last.at, e.id).toBeLessThan(exerciseSeconds(e))
    }
  })

  it('tells the person what to do and asks one thing afterwards', () => {
    for (const e of ALL_EXERCISES) {
      expect(e.steps.length, e.id).toBeGreaterThan(1)
      expect(e.why.length, e.id).toBeGreaterThan(20)
      expect(e.after.endsWith('?'), e.id).toBe(true)
    }
  })

  it('every era key has attributes, and every attribute is real', () => {
    for (const preset of ERA_PRESETS) {
      const attrs = ERA_ATTRIBUTES[preset.key]
      expect(attrs, preset.key).toBeTruthy()
      for (const a of attrs) expect(ATTRIBUTES_BY_ID.has(a), `${preset.key} → ${a}`).toBe(true)
    }
    expect(attributesForEra(CUSTOM_ERA_KEY).length).toBeGreaterThan(0)
    // An era key nobody has heard of still gets a sensible answer.
    expect(attributesForEra('no_such_era').length).toBeGreaterThan(0)
  })

  it('claims no attribute percentages anywhere', () => {
    // Guards the decision, not the code: a weighted mix would be a design
    // opinion presented as a measurement.
    for (const attrs of Object.values(ERA_ATTRIBUTES)) {
      expect(Array.isArray(attrs)).toBe(true)
      for (const a of attrs) expect(typeof a).toBe('string')
    }
  })
})

describe('poolFor', () => {
  it('gives an authored era its own exercises plus the shared ones', () => {
    const pool = poolFor('locked_in')
    const own = ERA_TOOLKITS.locked_in
    for (const e of own) expect(pool).toContain(e)
    expect(pool.length).toBeGreaterThan(own.length)
  })

  it('falls back to the shared ones for an era with no toolkit of its own', () => {
    // A custom era is the real case: someone names their own, so there is
    // nothing authored for it and there never will be.
    const pool = poolFor(CUSTOM_ERA_KEY)
    expect(pool.length).toBeGreaterThan(0)
    expect(pool.every(e => !ERA_TOOLKITS.locked_in.includes(e))).toBe(true)
  })
})

describe('pickExercise', () => {
  const base = { eraKey: 'locked_in', lengthDays: 30 }

  it('is deterministic', () => {
    const a = pickExercise({ ...base, day: 4 })
    const b = pickExercise({ ...base, day: 4 })
    expect(a?.exercise.id).toBe(b?.exercise.id)
  })

  it('follows the phase for difficulty', () => {
    // Week 1 is light, week 3 is hard — the era's own contract.
    expect(pickExercise({ ...base, day: 2 })?.difficulty).toBe(eraStage(2, 30).difficulty)
    expect(pickExercise({ ...base, day: 16 })?.difficulty).toBe('hard')
    expect(pickExercise({ ...base, day: 16 })?.exercise.difficulty).toBe('hard')
  })

  it('moves through the band on consecutive days', () => {
    const ids = [1, 2, 3, 4, 5].map(day => pickExercise({ ...base, day })?.exercise.id)
    expect(new Set(ids).size).toBeGreaterThan(1)
  })

  it('avoids what was just done', () => {
    const first = pickExercise({ ...base, day: 3 })!
    const second = pickExercise({ ...base, day: 3, recentIds: [first.exercise.id] })!
    expect(second.exercise.id).not.toBe(first.exercise.id)
    expect(second.repeat).toBe(false)
  })

  it('repeats rather than returning nothing, and says that it repeated', () => {
    const everything = poolFor('locked_in').map(e => e.id)
    const pick = pickExercise({ ...base, day: 9, recentIds: everything })!
    expect(pick.exercise).toBeTruthy()
    expect(pick.repeat).toBe(true)
  })

  it('works for an era with no toolkit of its own', () => {
    const pick = pickExercise({ eraKey: CUSTOM_ERA_KEY, day: 1, lengthDays: 30 })
    expect(pick?.exercise).toBeTruthy()
    expect(pick?.trains).toEqual(attributesForEra(CUSTOM_ERA_KEY))
  })

  it('carries the era’s attributes, not the exercise’s', () => {
    const pick = pickExercise({ ...base, day: 1 })!
    expect(pick.trains).toEqual(ERA_ATTRIBUTES.locked_in)
  })
})

describe('pickFromId', () => {
  it('renders a finished day from the stored id', () => {
    const pick = pickFromId('focus_reset_5', 'locked_in', 3, 30)
    expect(pick?.exercise.title).toBe('5-Minute Focus Reset')
  })

  it('returns null for an id that no longer exists', () => {
    expect(pickFromId('retired_exercise', 'locked_in', 3, 30)).toBeNull()
  })
})

describe('cueAt', () => {
  const exercise = EXERCISES_BY_ID.get('focus_reset_5')!

  it('shows the first cue from the very start', () => {
    expect(cueAt(exercise, 0)).toBe(exercise.cues[0].say)
  })

  it('holds a cue until the next one comes due', () => {
    const second = exercise.cues[1]
    expect(cueAt(exercise, second.at - 1)).toBe(exercise.cues[0].say)
    expect(cueAt(exercise, second.at)).toBe(second.say)
    expect(cueAt(exercise, second.at + 5)).toBe(second.say)
  })

  it('keeps the last cue to the end', () => {
    const last = exercise.cues[exercise.cues.length - 1]
    expect(cueAt(exercise, exerciseSeconds(exercise))).toBe(last.say)
  })
})

describe('every era has its own toolkit', () => {
  it('leaves no preset era running on the shared two', () => {
    // An era whose "practice" is the same breathing exercise as every other
    // era isn't an era, it's a label. Custom eras are the exception: someone
    // names their own, so nothing can be authored for it.
    for (const preset of ERA_PRESETS) {
      const own = ERA_TOOLKITS[preset.key] ?? []
      expect(own.length, `${preset.key} has no exercises of its own`).toBeGreaterThanOrEqual(3)
    }
  })

  it('covers all three phases, so week three is not still on week one', () => {
    // pickExercise asks for the phase's difficulty first. Without one in
    // each band an era quietly falls back to a shared exercise on the days
    // that are meant to ask more.
    for (const preset of ERA_PRESETS) {
      const own = ERA_TOOLKITS[preset.key] ?? []
      const bands = new Set(own.map(e => e.difficulty))
      for (const band of ['light', 'moderate', 'hard']) {
        expect(bands.has(band as never), `${preset.key} has nothing ${band}`).toBe(true)
      }
    }
  })

  it('gives every era something of its own on day 1, 10 and 25', () => {
    for (const preset of ERA_PRESETS) {
      const own = new Set((ERA_TOOLKITS[preset.key] ?? []).map(e => e.id))
      for (const day of [1, 10, 25]) {
        const pick = pickExercise({ eraKey: preset.key, day, lengthDays: 30 })!
        expect(own.has(pick.exercise.id), `${preset.key} day ${day} → ${pick.exercise.id}`).toBe(true)
      }
    }
  })

  it('prescribes no dose and diagnoses nothing, in any of them', () => {
    // Same line as the movement library: these are things to do with your
    // attention for a few minutes. Not sets, not medicine.
    // A dose needs a NUMBER. The first version of this banned the bare word
    // "set" and flagged "a standard you set on a good day" — and it would
    // have banned the title "The Smallest Rep", which is the whole metaphor.
    // What isn't allowed is a prescription: 3 x 8, 20kg, 140bpm.
    const dose = /\b\d+\s*(x\s*\d+|sets?|reps?|kg|lbs?|bpm|calories)\b|\b(sets?|reps?) of \d|heart rate zone/i
    const medical = /\b(cortisol|dopamine|vagus|vagal|anxiety disorder|depression|cures?|treats?|clinically)\b/i
    for (const e of ALL_EXERCISES) {
      const text = [e.title, e.why, ...e.steps, ...e.cues.map(c => c.say), e.after].join(' ')
      expect(text.match(dose)?.[0], `${e.id} prescribes "${text.match(dose)?.[0]}"`).toBeUndefined()
      expect(text.match(medical)?.[0], `${e.id} claims "${text.match(medical)?.[0]}"`).toBeUndefined()
    }
  })

  it('never tells anyone their feeling is wrong', () => {
    // "Stop overthinking", "don't be so sensitive" — the app doesn't get to
    // say that. It can ask someone to act anyway; it can't dismiss them.
    const dismissive = /\b(stop (over)?thinking|don’t be (so )?(sensitive|dramatic|weak)|man up|no excuses|stop feeling)\b/i
    for (const e of ALL_EXERCISES) {
      const text = [e.title, e.why, ...e.steps, ...e.cues.map(c => c.say), e.after].join(' ')
      expect(dismissive.test(text), `${e.id}: ${text.match(dismissive)?.[0]}`).toBe(false)
    }
  })
})
