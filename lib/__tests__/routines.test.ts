import { describe, it, expect } from 'vitest'
import {
  MAX_ROUTINE_STEPS,
  ROUTINE_NOTIFICATION_SLOTS,
  canRunMinimum,
  isRoutineMode,
  minimumSteps,
  normalSteps,
  STEP_WEIGHTS,
  STEP_WEIGHT_META,
  isStepWeight,
  stepWeight,
  moveStep,
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
  type StepWeight,
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

  it('gives every step a slot per weekday, all distinct', () => {
    // A step on Monday and Thursday is two notifications, because
    // `schedule.on` holds one weekday. Sharing an id would mean the
    // Thursday one quietly replaced the Monday one.
    const ids = allStepNotificationIds()
    const expected = MAX_ROUTINE_STEPS * ROUTINE_NOTIFICATION_SLOTS
    expect(ids).toHaveLength(expected)
    expect(new Set(ids).size).toBe(expected)
    expect(ids[0]).toBe(stepNotificationId(0))

    const used = new Set<number>()
    for (let step = 0; step < MAX_ROUTINE_STEPS; step++) {
      for (const weekday of [null, 0, 1, 2, 3, 4, 5, 6]) {
        const id = stepNotificationId(step, weekday)
        expect(used.has(id), `step ${step} weekday ${weekday}`).toBe(false)
        used.add(id)
        expect(ids).toContain(id)
      }
    }
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

describe('mode changes what "in order" means', () => {
  const timed = [
    { time: '21:30', position: 0, label: 'night' },
    { time: '07:00', position: 1, label: 'morning' },
  ]

  it('timed sorts by the clock, whatever the positions say', () => {
    expect(sortSteps(timed, 'timed').map(s => s.label)).toEqual(['morning', 'night'])
  })

  it('sequence sorts by position, and ignores any times lying around', () => {
    // This is exactly why dragging is worth building in sequence mode and
    // meaningless in the other.
    expect(sortSteps(timed, 'sequence').map(s => s.label)).toEqual(['night', 'morning'])
  })

  it('defaults to timed, so existing callers keep their behaviour', () => {
    expect(sortSteps(timed).map(s => s.label)).toEqual(['morning', 'night'])
  })

  it('handles sequence steps with no times at all', () => {
    const seq = [{ position: 1, label: 'b' }, { position: 0, label: 'a' }]
    expect(sortSteps(seq, 'sequence').map(s => s.label)).toEqual(['a', 'b'])
  })
})

describe('what a bad day still asks for', () => {
  const steps: StepLite[] = [
    { kind: 'own', label: 'Meditate', time: '07:00', inMinimum: true, minimum: '2 min' },
    { kind: 'own', label: 'Deep work', time: '09:00', inMinimum: false },
    { kind: 'own', label: 'Read', time: '21:00', inMinimum: true, minimum: '5 pages' },
  ]

  it('keeps only the steps that survive it, in order', () => {
    expect(minimumSteps(steps).map(s => s.label)).toEqual(['Meditate', 'Read'])
  })

  it('is offered only once they have chosen something', () => {
    // Defaulting every step in would make a "bad day" ask for everything,
    // which is the opposite of the idea. Nothing chosen means the mode says
    // so rather than running an empty day.
    expect(canRunMinimum(steps)).toBe(true)
    expect(canRunMinimum([{ inMinimum: false }, {}])).toBe(false)
    expect(canRunMinimum([])).toBe(false)
  })
})

describe('validation follows the mode', () => {
  it('demands a time in timed mode', () => {
    expect(validateSteps([{ kind: 'promise' }], 'timed')).toBe('BAD_TIME')
    expect(validateSteps([{ kind: 'promise', time: '07:30' }], 'timed')).toBeNull()
  })

  it('does not ask for one in sequence mode', () => {
    // A sequence step happens when the one before it is done. Demanding a
    // clock time would make people invent times for a routine that has none.
    expect(validateSteps([{ kind: 'promise' }], 'sequence')).toBeNull()
    expect(validateSteps([{ kind: 'promise', time: null }], 'sequence')).toBeNull()
  })

  it('still enforces everything else in sequence mode', () => {
    expect(validateSteps([{ kind: 'practice' }], 'sequence')).toBe('MISSING_REF')
    expect(validateSteps([{ kind: 'own' }], 'sequence')).toBe('MISSING_LABEL')
    expect(validateSteps([{ kind: 'nonsense' as never }], 'sequence')).toBe('BAD_KIND')
  })

  it('knows a real mode from a made-up one', () => {
    expect(isRoutineMode('timed')).toBe(true)
    expect(isRoutineMode('sequence')).toBe(true)
    expect(isRoutineMode('guided')).toBe(false)
    expect(isRoutineMode(null)).toBe(false)
  })
})

describe('moving a step, which only sequence mode allows', () => {
  const list = ['a', 'b', 'c', 'd']

  it('moves it up and down', () => {
    expect(moveStep(list, 2, 0)).toEqual(['c', 'a', 'b', 'd'])
    expect(moveStep(list, 0, 3)).toEqual(['b', 'c', 'd', 'a'])
    expect(moveStep(list, 1, 2)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('does nothing rather than clamping a move off the end', () => {
    // The button should not have been there. Landing the step somewhere
    // else is worse than the tap doing nothing.
    expect(moveStep(list, 0, -1)).toEqual(list)
    expect(moveStep(list, 3, 4)).toEqual(list)
    expect(moveStep(list, 9, 0)).toEqual(list)
    expect(moveStep(list, 1, 1)).toEqual(list)
  })

  it('never mutates what it was given', () => {
    const input = [...list]
    moveStep(input, 0, 2)
    expect(input).toEqual(list)
  })

  it('keeps every step, so a reorder can never lose one', () => {
    for (let from = 0; from < list.length; from++) {
      for (let to = 0; to < list.length; to++) {
        expect([...moveStep(list, from, to)].sort()).toEqual([...list].sort())
      }
    }
  })
})

describe('how much a step asks for', () => {
  const s = (weight: StepWeight | undefined, over: Partial<StepLite> = {}): StepLite =>
    step({ weight, ...over })

  it('treats anything unknown as required, which is what every step was', () => {
    expect(stepWeight(undefined)).toBe('required')
    expect(stepWeight(null)).toBe('required')
    expect(stepWeight('urgent')).toBe('required')
    expect(stepWeight('optional')).toBe('optional')
    expect(isStepWeight('minimum_only')).toBe(true)
    expect(isStepWeight('critical')).toBe(false)
  })

  it('keeps a bad-days-only step out of a normal day', () => {
    // It is what you do INSTEAD. Running it alongside the full version
    // would make a bad day longer than a good one.
    const steps = [s('required'), s('optional'), s('minimum_only')]
    expect(normalSteps(steps).map(x => stepWeight(x.weight))).toEqual(['required', 'optional'])
  })

  it('and puts it in the minimum day without being ticked', () => {
    const steps = [s('required'), s('minimum_only')]
    expect(minimumSteps(steps)).toHaveLength(1)
    expect(stepWeight(minimumSteps(steps)[0].weight)).toBe('minimum_only')
    expect(canRunMinimum(steps)).toBe(true)
  })

  it('still honours an explicitly marked minimum step', () => {
    const steps = [s('required', { inMinimum: true }), s('required')]
    expect(minimumSteps(steps)).toHaveLength(1)
  })

  it('offers no minimum day when nothing survives one', () => {
    expect(canRunMinimum([s('required'), s('optional')])).toBe(false)
  })

  it('every weight has words of its own', () => {
    for (const w of STEP_WEIGHTS) {
      expect(STEP_WEIGHT_META[w].label.length, w).toBeGreaterThan(0)
      expect(STEP_WEIGHT_META[w].line.length, w).toBeGreaterThan(0)
    }
  })
})
