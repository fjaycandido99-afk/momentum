import { describe, it, expect } from 'vitest'
import {
  MAX_ROUTINE_STEPS,
  ROUTINE_STEP_KINDS,
  STEP_KINDS,
  allStepNotificationIds,
  isRoutineStepKind,
  isValidTime,
  parseTime,
  sortSteps,
  stepNotification,
  stepNotificationId,
  timeLabel,
  validateSteps,
  type StepLite,
} from '@/lib/routines/steps'
import { NOTIFICATION_IDS } from '@/lib/notifications'

const step = (over: Partial<StepLite> = {}): StepLite => ({ kind: 'promise', time: '07:30', ...over })

describe('times, which a notification depends on', () => {
  it('takes a real 24-hour time', () => {
    expect(isValidTime('00:00')).toBe(true)
    expect(isValidTime('07:30')).toBe(true)
    expect(isValidTime('23:59')).toBe(true)
  })

  it('refuses anything that would fire at the wrong hour or throw', () => {
    // This string becomes an hour and a minute for a notification that has
    // to be right for months.
    expect(isValidTime('7:30')).toBe(false)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('23:60')).toBe(false)
    expect(isValidTime('07:5')).toBe(false)
    expect(isValidTime('')).toBe(false)
    expect(isValidTime('morning')).toBe(false)
    expect(isValidTime(730)).toBe(false)
    expect(isValidTime(null)).toBe(false)
  })

  it('parses into what the scheduler needs', () => {
    expect(parseTime('07:30')).toEqual({ hour: 7, minute: 30 })
    expect(parseTime('00:05')).toEqual({ hour: 0, minute: 5 })
    expect(parseTime('nope')).toBeNull()
  })

  it('reads back in 12-hour for a list', () => {
    expect(timeLabel('07:30')).toBe('7:30 am')
    expect(timeLabel('00:00')).toBe('12:00 am')
    expect(timeLabel('12:00')).toBe('12:00 pm')
    expect(timeLabel('21:05')).toBe('9:05 pm')
    // Never throws on bad input — shows it back rather than blanking.
    expect(timeLabel('garbage')).toBe('garbage')
  })
})

describe('the day in order', () => {
  it('sorts by time', () => {
    const got = sortSteps([step({ time: '21:30' }), step({ time: '07:00' }), step({ time: '12:00' })])
    expect(got.map(s => s.time)).toEqual(['07:00', '12:00', '21:30'])
  })

  it('breaks a tie by position, so the list does not shuffle', () => {
    // Two steps at 07:00 would otherwise swap between renders, and a list
    // that reorders while you look at it is one you stop trusting.
    const got = sortSteps([
      step({ time: '07:00', position: 2, label: 'second' }),
      step({ time: '07:00', position: 1, label: 'first' }),
    ])
    expect(got.map(s => s.label)).toEqual(['first', 'second'])
  })

  it('does not mutate what it was given', () => {
    const input = [step({ time: '21:00' }), step({ time: '06:00' })]
    sortSteps(input)
    expect(input[0].time).toBe('21:00')
  })
})

describe('what can be saved', () => {
  it('accepts a normal routine', () => {
    expect(validateSteps([step({ kind: 'audio', time: '07:00' }), step({ kind: 'promise', time: '07:30' })])).toBeNull()
  })

  it('refuses an unknown kind', () => {
    expect(validateSteps([step({ kind: 'nonsense' as never })])).toBe('BAD_KIND')
  })

  it('refuses a bad time', () => {
    expect(validateSteps([step({ time: '7:30' })])).toBe('BAD_TIME')
  })

  it('needs to know WHICH discipline', () => {
    expect(validateSteps([step({ kind: 'practice' })])).toBe('MISSING_REF')
    expect(validateSteps([step({ kind: 'practice', ref: '  ' })])).toBe('MISSING_REF')
    expect(validateSteps([step({ kind: 'practice', ref: 'p1' })])).toBeNull()
  })

  it('needs words for a step of their own', () => {
    // A reminder with nothing written on it says nothing.
    expect(validateSteps([step({ kind: 'own' })])).toBe('MISSING_LABEL')
    expect(validateSteps([step({ kind: 'own', label: '   ' })])).toBe('MISSING_LABEL')
    expect(validateSteps([step({ kind: 'own', label: 'Phone out of the room' })])).toBeNull()
  })

  it('caps the day', () => {
    const many = Array.from({ length: MAX_ROUTINE_STEPS + 1 }, () => step())
    expect(validateSteps(many)).toBe('TOO_MANY')
    expect(validateSteps(many.slice(0, MAX_ROUTINE_STEPS))).toBeNull()
  })

  it('accepts an empty routine', () => {
    // Deleting the last step must not be refused — a routine with nothing
    // in it is how somebody starts, and how they clear one out.
    expect(validateSteps([])).toBeNull()
  })
})

describe('what the notification says', () => {
  it('uses their own words when they wrote some', () => {
    // It is what they will recognise at 21:30.
    const got = stepNotification(step({ kind: 'own', label: 'Phone out of the room', time: '22:00' }))
    expect(got.title).toBe('Phone out of the room')
  })

  it('falls back to the kind when they wrote nothing', () => {
    expect(stepNotification(step({ kind: 'journal' })).title).toBe('Journal')
  })

  it('names the era when there is one, and never invents one', () => {
    const withEra = stepNotification(step({ kind: 'own', label: 'Cold shower' }), 'Discipline Era')
    expect(withEra.body).toContain('Discipline Era')
    const without = stepNotification(step({ kind: 'own', label: 'Cold shower' }))
    expect(without.body).not.toMatch(/era/i)
    expect(without.body.length).toBeGreaterThan(0)
  })

  it('always says something', () => {
    for (const kind of ROUTINE_STEP_KINDS) {
      const got = stepNotification(step({ kind, label: kind === 'own' ? 'x' : null }))
      expect(got.title.length, kind).toBeGreaterThan(0)
      expect(got.body.length, kind).toBeGreaterThan(0)
    }
  })
})

describe('notification ids', () => {
  it('never collides with the reminders that already exist', () => {
    // LocalNotifications keys everything by one integer, and NOTIFICATION_IDS
    // owns 1-8. A collision would silently replace somebody's morning
    // reminder with a routine step.
    const taken = new Set(Object.values(NOTIFICATION_IDS))
    for (const id of allStepNotificationIds()) {
      expect(taken.has(id), `id ${id}`).toBe(false)
      expect(id).toBeGreaterThan(8)
    }
  })

  it('gives one id per possible step, all distinct', () => {
    const ids = allStepNotificationIds()
    expect(ids).toHaveLength(MAX_ROUTINE_STEPS)
    expect(new Set(ids).size).toBe(MAX_ROUTINE_STEPS)
    expect(ids[0]).toBe(stepNotificationId(0))
  })
})

describe('the kind table', () => {
  it('describes every kind', () => {
    for (const kind of ROUTINE_STEP_KINDS) {
      const meta = STEP_KINDS[kind]
      expect(meta, kind).toBeDefined()
      expect(meta.label.length, kind).toBeGreaterThan(0)
    }
  })

  it('only asks for a ref where there is a choice to make', () => {
    // Exactly one kind points at something the user owns more than one of.
    const needing = ROUTINE_STEP_KINDS.filter(k => STEP_KINDS[k].needsRef)
    expect(needing).toEqual(['practice'])
  })

  it('gives "own" nowhere to go, because there is nothing to open', () => {
    expect(STEP_KINDS.own.href).toBeNull()
    for (const kind of ROUTINE_STEP_KINDS.filter(k => k !== 'own')) {
      expect(STEP_KINDS[kind].href, kind).toBeTruthy()
    }
  })

  it('agrees with isRoutineStepKind', () => {
    for (const kind of ROUTINE_STEP_KINDS) expect(isRoutineStepKind(kind)).toBe(true)
    expect(isRoutineStepKind('routine')).toBe(false)
    expect(isRoutineStepKind(null)).toBe(false)
  })
})
