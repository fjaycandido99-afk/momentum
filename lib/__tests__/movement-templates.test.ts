import { describe, it, expect } from 'vitest'
import {
  KIT_LABELS,
  TEMPLATES,
  TEMPLATES_BY_KEY,
  missingNote,
  movementFor,
  sessionFor,
  sessionsFor,
  type Kit,
} from '@/lib/movements/templates'
import { PATTERN_LABELS, type MovementPattern } from '@/lib/movements/library'

const KITS: Kit[] = ['gym', 'home', 'bodyweight']

describe('the templates themselves', () => {
  it('has unique keys, a label, and real patterns', () => {
    expect(TEMPLATES_BY_KEY.size).toBe(TEMPLATES.length)
    for (const t of TEMPLATES) {
      expect(t.name, t.key).toBeTruthy()
      expect(t.what.length, t.key).toBeGreaterThan(20)
      expect(t.days.length, t.key).toBeGreaterThan(0)
      for (const day of t.days) {
        expect(day.label, `${t.key}/${day.label}`).toBeTruthy()
        expect(day.patterns.length).toBeGreaterThan(0)
        for (const pattern of day.patterns) {
          expect(PATTERN_LABELS[pattern], `${t.key}: ${pattern}`).toBeTruthy()
        }
      }
    }
  })

  it('prescribes no dose anywhere', () => {
    // The line between a session SHAPE and a programme. Sets, reps, loads,
    // rest and week counts are a prescription for a body the app has never
    // seen — and they're the numbers the person actually owns.
    const dose = /\b(\d+\s*x\s*\d+|sets?|reps?|rir|kg|lbs?|1rm|%|rest|seconds?|minutes?|weeks?|progress(ion|ive)?)\b/i
    for (const t of TEMPLATES) {
      const text = [t.name, t.what, ...t.days.map(d => d.label)].join(' · ')
      const hit = text.match(dose)
      expect(hit?.[0], `${t.key} says "${hit?.[0]}" in: ${text}`).toBeUndefined()
    }
  })

  it('claims nothing about results or what is better', () => {
    const claim = /\b(best|optimal|fastest|maximi[sz]e|proven|research|studies|shredded|gains|burn|torch)\b/i
    for (const t of TEMPLATES) {
      const text = `${t.name} ${t.what}`
      const hit = text.match(claim)
      expect(hit?.[0], `${t.key} claims "${hit?.[0]}"`).toBeUndefined()
    }
  })

  it('has a full-body shape and a short one, because a bad day needs a floor', () => {
    const keys = TEMPLATES.map(t => t.key)
    expect(keys).toContain('full_body')
    expect(keys).toContain('minimum')
    const short = TEMPLATES_BY_KEY.get('minimum')!
    expect(short.days[0].patterns.length).toBeLessThanOrEqual(3)
  })
})

describe('movementFor', () => {
  it('only ever returns something the kit can actually reach', () => {
    for (const kit of KITS) {
      for (const t of TEMPLATES) {
        for (const day of t.days) {
          for (const pattern of day.patterns) {
            const movement = movementFor(pattern, kit)
            if (!movement) continue
            if (kit === 'bodyweight') {
              expect(movement.equipment, `${pattern}/${kit}`).toEqual(['bodyweight'])
            }
            if (kit === 'home') {
              expect(movement.equipment.some(e => e === 'machine' || e === 'cable' || e === 'rack' || e === 'barbell'))
                .toBe(false)
            }
          }
        }
      }
    }
  })

  it('is deterministic — the same session comes back tomorrow', () => {
    expect(movementFor('squat', 'gym')?.id).toBe(movementFor('squat', 'gym')?.id)
  })

  it('picks the simplest option the kit can reach', () => {
    // Someone accepting a suggested session isn't asking for the hardest
    // variation, and every alternative is one tap away.
    for (const kit of KITS) {
      const squat = movementFor('squat', kit)
      if (squat) expect(squat.level, kit).not.toBe('advanced')
    }
  })

  it('returns null rather than a wrong-kit movement', () => {
    // Nothing in the library trains a cable-only pattern with no kit, and
    // the answer to that is "nothing", not "here's a barbell".
    const cableOnly = movementFor('horizontal_pull', 'bodyweight')
    if (cableOnly) expect(cableOnly.equipment).toEqual(['bodyweight'])
  })
})

describe('sessions', () => {
  it('covers every pattern it can and reports the rest', () => {
    for (const kit of KITS) {
      for (const t of TEMPLATES) {
        const session = sessionFor(t, 0, kit)
        const asked = t.days[0].patterns.length
        expect(session.movements.length + session.missing.length, `${t.key}/${kit}`).toBe(asked)
      }
    }
  })

  it('never repeats a movement inside one session', () => {
    for (const kit of KITS) {
      for (const t of TEMPLATES) {
        for (let i = 0; i < t.days.length; i++) {
          const ids = sessionFor(t, i, kit).movements.map(m => m.id)
          expect(new Set(ids).size, `${t.key}/${i}/${kit}`).toBe(ids.length)
        }
      }
    }
  })

  it('gives a full-body day something to do with nothing but a body', () => {
    const session = sessionFor(TEMPLATES_BY_KEY.get('full_body')!, 0, 'bodyweight')
    expect(session.movements.length).toBeGreaterThanOrEqual(3)
  })

  it('cycles days across however many slots someone trains', () => {
    const ppl = TEMPLATES_BY_KEY.get('push_pull_legs')!
    const two = sessionsFor(ppl, 2, 'gym')
    expect(two.map(s => s.label)).toEqual(['Push', 'Pull'])
    const four = sessionsFor(ppl, 4, 'gym')
    expect(four.map(s => s.label)).toEqual(['Push', 'Pull', 'Legs', 'Push'])
  })

  it('handles zero slots without throwing', () => {
    expect(sessionsFor(TEMPLATES[0], 0, 'gym')).toEqual([])
  })

  it('says what it could not cover, in words, without blaming the person', () => {
    const note = missingNote(['vertical_pull', 'horizontal_pull'] as MovementPattern[])
    expect(note).toContain('vertical pull')
    expect(note).toMatch(/shorter/)
    expect(missingNote([])).toBeNull()
  })

  it('labels every kit', () => {
    for (const kit of KITS) expect(KIT_LABELS[kit], kit).toBeTruthy()
  })
})
