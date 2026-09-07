import { describe, it, expect } from 'vitest'
import { getTimeWindows, getCurrentSession } from '@/lib/daily-guide/decision-tree'

/**
 * The guide picks a segment from the clock. These pin the two ways it got
 * that wrong: assuming everyone wakes at 07:00, and deriving the end of
 * someone's day from the start of it.
 */

/** A local Date at a given hour — getCurrentSession reads getHours(). */
function at(hour: number): Date {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return d
}

describe('time windows', () => {
  it('shifts the whole day for an early riser', () => {
    const early = getTimeWindows('05:00')
    const normal = getTimeWindows('07:00')
    expect(early.morning_prime.start).toBe(5)
    expect(early.morning_prime.end).toBeLessThan(normal.morning_prime.end)
  })

  it('starts Bedtime at the hour the user actually goes to bed', () => {
    // Someone turning in at 21:00 should not still be shown Wind Down.
    const withBedtime = getTimeWindows('07:00', '21:00')
    expect(withBedtime.bedtime_story.start).toBe(21)
    expect(withBedtime.wind_down.end).toBe(21)
  })

  it('falls back to a derived bedtime when none is set', () => {
    const derived = getTimeWindows('07:00', null)
    expect(derived.bedtime_story.start).toBe(22)
  })

  it('refuses to let an absurd bedtime collapse or invert Wind Down', () => {
    // 09:00 is before Midday even ends — the window must stay ordered.
    const silly = getTimeWindows('07:00', '09:00')
    expect(silly.wind_down.end).toBeGreaterThan(silly.wind_down.start)
    expect(silly.bedtime_story.start).toBeGreaterThan(silly.midday_reset.end)
  })
})

describe('current session', () => {
  it('is Morning Prime in the morning for a 07:00 riser', () => {
    expect(getCurrentSession(at(8), '07:00')).toBe('morning_prime')
  })

  it('is Morning Prime at 06:00 for someone who wakes at 05:00', () => {
    // On the default schedule 06:00 is still Bedtime Story — which is what
    // an early riser was being shown.
    expect(getCurrentSession(at(6), '07:00')).toBe('bedtime_story')
    expect(getCurrentSession(at(6), '05:00')).toBe('morning_prime')
  })

  it('is Bedtime Story at 21:30 for someone whose bedtime is 21:00', () => {
    expect(getCurrentSession(at(21), '07:00')).toBe('wind_down')
    expect(getCurrentSession(at(21), '07:00', '21:00')).toBe('bedtime_story')
  })

  it('still reaches every segment across a normal day', () => {
    const seen = new Set([8, 14, 19, 23].map(h => getCurrentSession(at(h), '07:00')))
    expect(seen.size).toBe(4)
  })
})
