import { describe, expect, it } from 'vitest'
import {
  MAX_PLANNED_NOTIFICATIONS,
  ROUTINE_HOME,
  planRoutine,
  toPluginWeekday,
  type RoutineForSchedule,
} from '@/lib/routines/schedule'
import { MAX_ROUTINE_STEPS, allStepNotificationIds } from '@/lib/routines/steps'
import { NOTIFICATION_IDS } from '@/lib/notifications'

const routine = (over: Partial<RoutineForSchedule> = {}): RoutineForSchedule => ({
  label: 'My mornings',
  mode: 'timed',
  start_time: null,
  days: [],
  enabled: true,
  steps: [
    { kind: 'promise', time: '07:00', position: 0 },
    { kind: 'journal', time: '21:30', position: 1 },
  ],
  ...over,
})

describe('what a timed routine asks the phone for', () => {
  it('one notification per step, every day', () => {
    const plan = planRoutine(routine())
    expect(plan).toHaveLength(2)
    expect(plan.map(p => [p.hour, p.minute])).toEqual([[7, 0], [21, 30]])
    // No weekday at all: that is what makes it repeat daily.
    expect(plan.every(p => p.weekday === undefined)).toBe(true)
  })

  it('one per step per chosen day when they chose days', () => {
    const plan = planRoutine(routine({ days: [1, 4] }))
    expect(plan).toHaveLength(4)
    // Capacitor counts Sunday as 1, so Monday is 2 and Thursday is 5. An
    // off-by-one here reminds somebody on the wrong day for months.
    expect(new Set(plan.map(p => p.weekday))).toEqual(new Set([2, 5]))
    expect(new Set(plan.map(p => p.id)).size).toBe(4)
  })

  it('treats all seven days as every day', () => {
    // Seven weekday notifications per step say exactly what one repeating
    // one says, at seven times the cost.
    const plan = planRoutine(routine({ days: [0, 1, 2, 3, 4, 5, 6] }))
    expect(plan).toHaveLength(2)
    expect(plan.every(p => p.weekday === undefined)).toBe(true)
  })

  it('says what the step says, and names the era when there is one', () => {
    const plan = planRoutine(
      routine({ steps: [{ kind: 'own', label: 'Cold shower', time: '06:30', position: 0 }] }),
      'Discipline Era',
    )
    expect(plan[0].title).toBe('Cold shower')
    expect(plan[0].body).toContain('Discipline Era')
  })

  it('sends every notification somewhere real', () => {
    const plan = planRoutine(
      routine({
        steps: [
          { kind: 'own', label: 'Phone away', time: '06:00', position: 0 },
          { kind: 'journal', time: '21:00', position: 1 },
        ],
      }),
    )
    // A step of their own has no screen, so it lands where the routine is
    // rather than nowhere.
    expect(plan[0].route).toBe(ROUTINE_HOME)
    expect(plan[1].route).toBe('/journal')
    expect(plan.every(p => p.route.startsWith('/'))).toBe(true)
  })

  it('skips a step with no usable time instead of inventing one', () => {
    const plan = planRoutine(
      routine({
        steps: [
          { kind: 'promise', time: '07:00', position: 0 },
          { kind: 'journal', time: null, position: 1 },
          { kind: 'reset', time: 'later', position: 2 },
        ],
      }),
    )
    expect(plan).toHaveLength(1)
    expect(plan[0].hour).toBe(7)
  })

  it('plans nothing for a disabled routine', () => {
    // What makes the toggle mean something: the rows stay, the reminders go.
    expect(planRoutine(routine({ enabled: false }))).toEqual([])
    expect(planRoutine(null)).toEqual([])
  })
})

describe('what a sequence routine asks for', () => {
  const seq = routine({
    mode: 'sequence',
    start_time: '07:00',
    steps: [
      { kind: 'promise', time: null, position: 0 },
      { kind: 'journal', time: null, position: 1 },
    ],
  })

  it('exactly one nudge, to begin', () => {
    // The steps have no times. Reminding somebody about step four would be
    // a guess about when they reached it.
    const plan = planRoutine(seq)
    expect(plan).toHaveLength(1)
    expect(plan[0].title).toBe('My mornings')
    expect(plan[0].hour).toBe(7)
    expect(plan[0].route).toBe(ROUTINE_HOME)
  })

  it('one per chosen day', () => {
    expect(planRoutine({ ...seq, days: [1, 3, 5] })).toHaveLength(3)
  })

  it('nothing at all when they did not ask to be nudged', () => {
    expect(planRoutine({ ...seq, start_time: null })).toEqual([])
    expect(planRoutine({ ...seq, start_time: '7am' })).toEqual([])
  })
})

describe('the ids and the budget', () => {
  const full = (days: number[]) =>
    planRoutine(
      routine({
        days,
        steps: Array.from({ length: MAX_ROUTINE_STEPS }, (_, i) => ({
          kind: 'own' as const,
          label: `Step ${i + 1}`,
          time: `${String(6 + i).padStart(2, '0')}:00`,
          position: i,
        })),
      }),
    )

  it('stays within what a phone will hold, at the worst case', () => {
    // Six days is the worst case — seven collapses to every day. iOS keeps
    // 64 pending notifications and silently drops the rest, and the core
    // reminders already own eight of them.
    const plan = full([0, 1, 2, 3, 4, 5])
    expect(plan.length).toBeLessThanOrEqual(MAX_PLANNED_NOTIFICATIONS)
    expect(plan.length + Object.keys(NOTIFICATION_IDS).length).toBeLessThanOrEqual(64)
  })

  it('spends the budget on the earliest steps', () => {
    const plan = full([0, 1, 2, 3, 4, 5])
    const hours = plan.map(p => p.hour)
    expect([...hours].sort((a, b) => a - b)).toEqual(hours)
  })

  it('never collides with itself or with the reminders that exist', () => {
    const plan = full([1, 2, 3, 4, 5])
    const ids = plan.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)

    const taken = new Set<number>(Object.values(NOTIFICATION_IDS))
    const block = new Set(allStepNotificationIds())
    for (const id of ids) {
      expect(taken.has(id), `id ${id}`).toBe(false)
      // Everything planned must be inside the block that gets cancelled
      // before a reschedule, or it would outlive the routine that made it.
      expect(block.has(id), `id ${id} outside the cancelled block`).toBe(true)
    }
  })
})

describe('weekday translation', () => {
  it('shifts our Sunday-first week onto the plugin’s', () => {
    expect(toPluginWeekday(0)).toBe(1)
    expect(toPluginWeekday(6)).toBe(7)
  })
})
