import { describe, expect, it } from 'vitest'
import {
  GLANCE_HREF,
  routineGlance,
  runsOn,
  type GlanceInput,
  type GlanceRoutine,
} from '@/lib/routines/glance'

const timed: GlanceRoutine = {
  label: 'Training day',
  mode: 'timed',
  start_time: null,
  days: [],
  enabled: true,
  steps: [
    { kind: 'promise', ref: null, label: null, time: '07:00', position: 0 },
    { kind: 'practice', ref: 'p1', label: null, time: '18:00', position: 1 },
    { kind: 'journal', ref: null, label: null, time: '21:30', position: 2 },
  ],
}

const at = (minutes: number, over: Partial<GlanceInput> = {}): GlanceInput => ({
  routine: timed,
  now: minutes,
  weekday: 1,
  run: null,
  ...over,
})

describe('when home says nothing', () => {
  it('no routine, or one with no steps', () => {
    expect(routineGlance(at(0, { routine: null }))).toBeNull()
    expect(routineGlance(at(0, { routine: { ...timed, steps: [] } }))).toBeNull()
  })

  it('paused — their decision, made on purpose', () => {
    expect(routineGlance(at(360, { routine: { ...timed, enabled: false } }))).toBeNull()
  })

  it('a day it does not run', () => {
    // "Not today" every Sunday is a notification in a place you cannot
    // turn off.
    const weekdaysOnly = { ...timed, days: [1, 2, 3, 4, 5] }
    expect(routineGlance(at(360, { routine: weekdaysOnly, weekday: 0 }))).toBeNull()
    expect(routineGlance(at(360, { routine: weekdaysOnly, weekday: 3 }))).not.toBeNull()
  })
})

describe('a timed routine', () => {
  it('names the next step and its time', () => {
    const glance = routineGlance(at(6 * 60))
    expect(glance?.label).toBe('Training day')
    expect(glance?.line).toBe('next up Today’s promise at 7:00 am')
    expect(glance?.href).toBe(GLANCE_HREF)
  })

  it('moves through the day', () => {
    expect(routineGlance(at(7 * 60 + 1))?.line).toContain('6:00 pm')
    expect(routineGlance(at(19 * 60))?.line).toContain('9:30 pm')
  })

  it('reads a discipline step as the discipline', () => {
    const glance = routineGlance(at(12 * 60, { practiceLabels: { p1: 'Push Pull Legs' } }))
    expect(glance?.line).toBe('next up Push Pull Legs at 6:00 pm')
  })

  it('prefers their own words for a step', () => {
    const glance = routineGlance(
      at(0, {
        routine: {
          ...timed,
          steps: [{ kind: 'own', ref: null, label: 'Phone in another room', time: '06:00', position: 0 }],
        },
      }),
    )
    expect(glance?.line).toBe('next up Phone in another room at 6:00 am')
  })

  /**
   * The rule the module exists for. A timed routine records nothing about
   * its steps — the disciplines do — so home must never imply it knows.
   */
  it('talks about the clock, never about what they did', () => {
    const late = routineGlance(at(23 * 60))
    expect(late?.line).toBe('nothing left on the clock today')
    expect(late?.line).not.toMatch(/done|complete|finished|well done|missed|behind/i)
  })

  it('ignores a step with no time rather than guessing one', () => {
    const glance = routineGlance(
      at(0, {
        routine: {
          ...timed,
          steps: [
            { kind: 'promise', ref: null, label: null, time: null, position: 0 },
            { kind: 'journal', ref: null, label: null, time: '21:30', position: 1 },
          ],
        },
      }),
    )
    expect(glance?.line).toContain('9:30 pm')
  })
})

describe('a sequence routine', () => {
  const seq: GlanceRoutine = {
    label: 'My mornings',
    mode: 'sequence',
    start_time: '07:00',
    days: [],
    enabled: true,
    steps: [
      { kind: 'promise', ref: null, label: null, time: null, position: 0 },
      { kind: 'journal', ref: null, label: null, time: null, position: 1 },
    ],
  }

  it('offers its start time before it has been run', () => {
    expect(routineGlance(at(360, { routine: seq }))?.line).toBe('starts at 7:00 am')
  })

  it('says so plainly when there is no start time', () => {
    expect(routineGlance(at(360, { routine: { ...seq, start_time: null } }))?.line)
      .toBe('ready when you are')
  })

  it('counts what was actually tapped, with its denominator', () => {
    const glance = routineGlance(
      at(480, { routine: seq, run: { steps_total: 5, steps_done: 3, completed: false } }),
    )
    // A fact: the runner reported it. Never a percentage.
    expect(glance?.line).toBe('3 of 5 so far')
  })

  it('and says it was run when it was finished', () => {
    const glance = routineGlance(
      at(600, { routine: seq, run: { steps_total: 5, steps_done: 5, completed: true } }),
    )
    expect(glance?.line).toBe('you ran it today')
  })
})

describe('runsOn', () => {
  it('treats no days as every day', () => {
    for (let d = 0; d < 7; d++) expect(runsOn([], d)).toBe(true)
  })

  it('otherwise only the chosen ones', () => {
    expect(runsOn([1, 3], 1)).toBe(true)
    expect(runsOn([1, 3], 2)).toBe(false)
  })
})
