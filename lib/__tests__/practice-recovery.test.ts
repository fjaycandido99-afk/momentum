import { describe, it, expect } from 'vitest'
import { RECOVERY_WINDOW_DAYS, findRecovery, recoveryCopy } from '@/lib/practices/recovery'
import type { LogLite, PracticeLite } from '@/lib/practices/logic'

const fullBody: PracticeLite & { presetKey: string } = {
  id: 'p1',
  presetKey: 'gym_full_body_3',
  label: 'Gym — Full body, 3×',
  days: [1, 3, 5],
  minimum: '40 minutes',
}

const ppl: PracticeLite & { presetKey: string } = {
  id: 'p2',
  presetKey: 'gym_ppl',
  label: 'Gym — PPL',
  days: [1, 2, 4, 5],
  minimum: '30 minutes',
}

const log = (day: string, done: boolean): LogLite => ({ day, done, minimumOnly: false })

describe('findRecovery', () => {
  it('finds yesterday, when yesterday was answered "no"', () => {
    // Monday 21st missed; today is Tuesday.
    const recovery = findRecovery(fullBody, [log('2026-09-21', false)], '2026-09-22', 0)
    expect(recovery?.day).toBe('2026-09-21')
    expect(recovery?.dayLabel).toBe('Yesterday')
    expect(recovery?.slotLabel).toBe('Monday')
  })

  it('never invents a miss from a day nobody answered', () => {
    // The whole rule: an unanswered day is unknown, not a failure. Telling
    // someone they missed a session they never reported on is the app
    // making things up about their life.
    expect(findRecovery(fullBody, [], '2026-09-22', 0)).toBeNull()
  })

  it('ignores a day the practice was never due on', () => {
    // Tuesday isn't a training day, so a "no" there is not a missed session.
    expect(findRecovery(fullBody, [log('2026-09-22', false)], '2026-09-23', 0)).toBeNull()
  })

  it('ignores a kept day', () => {
    expect(findRecovery(fullBody, [log('2026-09-21', true)], '2026-09-22', 0)).toBeNull()
  })

  it('stops looking past the window', () => {
    const old = '2026-09-14'
    expect(findRecovery(fullBody, [log(old, false)], '2026-09-22', 0)).toBeNull()
    expect(RECOVERY_WINDOW_DAYS).toBe(3)
  })

  it('takes the most recent miss when there are two', () => {
    const recovery = findRecovery(
      fullBody,
      [log('2026-09-18', false), log('2026-09-21', false)],
      '2026-09-22',
      0,
    )
    expect(recovery?.day).toBe('2026-09-21')
  })

  it('knows a rotation already carried the session forward', () => {
    // A split advances on sessions KEPT, so a missed Push day means Push is
    // still next. There is nothing to reschedule.
    const recovery = findRecovery(ppl, [log('2026-09-21', false)], '2026-09-22', 0)
    expect(recovery?.carried).toBe(true)
    expect(recovery?.slotLabel).toBe('Push')
  })
})

describe('recoveryCopy', () => {
  const missed = { day: '2026-09-21', dayLabel: 'Yesterday', slotKey: 'mon', slotLabel: 'Monday', carried: false }

  it('never mentions streaks and never says do double', () => {
    const forms = [
      recoveryCopy(missed, fullBody, true),
      recoveryCopy(missed, fullBody, false),
      recoveryCopy({ ...missed, carried: true }, ppl, true),
    ]
    for (const copy of forms) {
      expect(copy.line).not.toMatch(/streak/i)
      expect(copy.line).not.toMatch(/twice|double up tomorrow|make up for/i)
      expect(copy.line.length).toBeGreaterThan(20)
    }
  })

  it('offers move, carry on, or the floor on a day that is due', () => {
    const copy = recoveryCopy(missed, fullBody, true)
    expect(copy.options.map(o => o.key)).toEqual(['move', 'continue', 'minimum'])
    expect(copy.options[2].label).toContain('40 minutes')
  })

  it('does not offer the floor on a rest day', () => {
    // Nothing is being asked for today, so there is no floor to lower.
    const copy = recoveryCopy(missed, fullBody, false)
    expect(copy.options.map(o => o.key)).toEqual(['move', 'continue'])
  })

  it('reassures instead of offering options when the rotation carried it', () => {
    const copy = recoveryCopy({ ...missed, carried: true, slotLabel: 'Push' }, ppl, true)
    expect(copy.options).toHaveLength(0)
    expect(copy.line).toMatch(/still/i)
  })

  it('still reads properly for a practice with no slots', () => {
    const copy = recoveryCopy({ ...missed, slotKey: null, slotLabel: null }, fullBody, true)
    expect(copy.line).toContain('Yesterday')
    expect(copy.line).not.toContain('null')
  })
})
