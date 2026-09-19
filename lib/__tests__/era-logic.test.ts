import { describe, it, expect } from 'vitest'
import {
  daysBetween,
  previousDay,
  eraDayNumber,
  isEraComplete,
  computeStats,
  eraStep,
} from '../era/logic'

describe('day arithmetic', () => {
  it('counts calendar days, including across months and DST', () => {
    expect(daysBetween('2026-09-01', '2026-09-01')).toBe(0)
    expect(daysBetween('2026-09-28', '2026-10-02')).toBe(4)
    // US DST ends 2026-11-01; calendar days must not come out as 0.96.
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
  })

  it('steps back across month and year boundaries', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28')
    expect(previousDay('2027-01-01')).toBe('2026-12-31')
  })

  it('day 1 is the start day, and it never goes below 1', () => {
    expect(eraDayNumber('2026-09-10', '2026-09-10')).toBe(1)
    expect(eraDayNumber('2026-09-10', '2026-09-23')).toBe(14)
    // A clock or timezone change can make "today" land before the start.
    expect(eraDayNumber('2026-09-10', '2026-09-09')).toBe(1)
  })

  it('a 30-day era is complete on day 31, not day 30', () => {
    expect(isEraComplete('2026-09-01', 30, '2026-09-30')).toBe(false)
    expect(isEraComplete('2026-09-01', 30, '2026-10-01')).toBe(true)
  })
})

describe('computeStats', () => {
  const today = '2026-09-20'

  it('has no percent before anything is answered', () => {
    const s = computeStats([{ local_day: today, kept: null }], today)
    expect(s.made).toBe(1)
    expect(s.keptPercent).toBeNull()
  })

  it('leaves unanswered days out of the percent instead of counting them as misses', () => {
    const s = computeStats(
      [
        { local_day: '2026-09-17', kept: true },
        { local_day: '2026-09-18', kept: null },
        { local_day: '2026-09-19', kept: false },
        { local_day: '2026-09-20', kept: true },
      ],
      today,
    )
    expect(s.answered).toBe(3)
    expect(s.kept).toBe(2)
    expect(s.keptPercent).toBe(67)
  })

  it('keeps the streak alive until today is over', () => {
    const rows = [
      { local_day: '2026-09-18', kept: true },
      { local_day: '2026-09-19', kept: true },
    ]
    // Nothing yet today — still a 2-day streak, not zero.
    expect(computeStats(rows, today).promiseStreak).toBe(2)
    expect(computeStats([...rows, { local_day: today, kept: null }], today).promiseStreak).toBe(3)
  })

  it('a missed day breaks the streak', () => {
    const rows = [
      { local_day: '2026-09-16', kept: true },
      { local_day: '2026-09-18', kept: true },
      { local_day: '2026-09-19', kept: true },
    ]
    expect(computeStats(rows, today).promiseStreak).toBe(2)
  })
})

describe('eraStep', () => {
  const base = { startDay: '2026-09-10', lengthDays: 30, today: '2026-09-20' }

  it('asks for a promise when there is none today', () => {
    expect(eraStep({ ...base, todayPromise: null, yesterdayPromise: null })).toBe('promise')
  })

  it("asks about yesterday's unanswered promise before today's", () => {
    expect(
      eraStep({ ...base, todayPromise: null, yesterdayPromise: { local_day: '2026-09-19', kept: null } }),
    ).toBe('check_yesterday')
  })

  it("doesn't ask about yesterday once it's answered", () => {
    expect(
      eraStep({ ...base, todayPromise: null, yesterdayPromise: { local_day: '2026-09-19', kept: false } }),
    ).toBe('promise')
  })

  it("doesn't ask about a yesterday from before the era started", () => {
    expect(
      eraStep({
        ...base,
        startDay: '2026-09-20',
        todayPromise: null,
        yesterdayPromise: { local_day: '2026-09-19', kept: null },
      }),
    ).toBe('promise')
  })

  it('moves to check, then done', () => {
    expect(eraStep({ ...base, todayPromise: { local_day: base.today, kept: null }, yesterdayPromise: null })).toBe('check')
    expect(eraStep({ ...base, todayPromise: { local_day: base.today, kept: true }, yesterdayPromise: null })).toBe('done')
  })

  it("asks for day 30's answer on day 31 before showing the summary", () => {
    const day31 = '2026-10-10' // era started 2026-09-10
    expect(
      eraStep({ ...base, today: day31, todayPromise: null, yesterdayPromise: { local_day: '2026-10-09', kept: null } }),
    ).toBe('check_yesterday')
    expect(
      eraStep({ ...base, today: day31, todayPromise: null, yesterdayPromise: { local_day: '2026-10-09', kept: true } }),
    ).toBe('complete')
  })
})
