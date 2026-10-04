import { describe, it, expect } from 'vitest'
import { firstGapDay, gapWarning, sampleInsight } from '@/lib/home/insights'
import type { PatternCharts } from '@/lib/patterns/charts'

const hours = (pairs: [number, number][]) => pairs.map(([kept, answered], i) => ({ label: String(i), kept, answered }))
const charts = (over: Partial<PatternCharts>): PatternCharts => ({ byHour: null, byWeekday: null, hardestDay: null, blockers: null, ...over })
const kept = (...ds: number[]) => ds.map(day => ({ day, kept: true }))

describe('sampleInsight', () => {
  it('says morning against evening in counts when they differ', () => {
    const c = charts({ byHour: hours([[0, 0], [0, 0], [3, 3], [6, 7], [1, 2], [1, 1], [1, 3], [1, 3]]) })
    expect(sampleInsight(c)).toBe('Promises you made before noon: kept 9 of 10. From 6 PM: 2 of 6.')
  })
  it('falls back to the most-tapped blocker, and stays quiet on thin data', () => {
    const flat = charts({ byHour: hours([[0, 0], [0, 0], [2, 3], [2, 3], [0, 0], [0, 0], [2, 3], [0, 0]]), blockers: [{ label: 'Ran out of time', count: 4 }] })
    expect(sampleInsight(flat)).toBe('When a promise didn\'t happen, the thing you tapped most was "Ran out of time" — 4 times.')
    expect(sampleInsight(charts({ blockers: [{ label: 'Tired', count: 2 }] }))).toBeNull()
    expect(sampleInsight(null)).toBeNull()
  })
  it('never claims significance or a cause', () => {
    const c = charts({ byHour: hours([[0, 0], [0, 0], [3, 3], [6, 7], [1, 2], [1, 1], [1, 3], [1, 3]]) })
    expect(sampleInsight(c)).not.toMatch(/significant|because|easier|better|always/i)
  })
})

describe('firstGapDay', () => {
  it('finds the first two unkept days in a row', () => {
    // 9 and 11 are lone misses (10 and 12 were kept); 14 and 15 are the first pair.
    expect(firstGapDay(kept(1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13), 30)).toBe(14)
    expect(firstGapDay(kept(1, 2, 3, 4, 5, 6, 7, 8, 11), 30)).toBe(9)
  })
  it('a single miss is not a gap; none at all is null', () => {
    expect(firstGapDay(kept(1, 2, 4, 5, 6), 6)).toBeNull()
    expect(firstGapDay(kept(1, 2, 3), 3)).toBeNull()
  })
})

describe('gapWarning', () => {
  const soFar = kept(1, 2, 3, 4, 5, 6, 7, 8)
  it('warns the day before when two past eras slipped within three days', () => {
    const w = gapWarning([9, 11], 8, soFar)
    expect(w?.day).toBe(9)
    expect(w?.line).toBe('In your last two eras, two days slipped by in a row starting day 9 and day 11. Tomorrow is day 9.')
  })
  it('is silent with one past era, spread-out eras, the wrong day, or a slip already', () => {
    expect(gapWarning([9], 8, soFar)).toBeNull()
    expect(gapWarning([5, 12], 4, soFar)).toBeNull()
    expect(gapWarning([9, 10], 7, soFar)).toBeNull()
    expect(gapWarning([9, 10], 8, kept(1, 2, 5, 6, 7, 8))).toBeNull()
  })
})

describe('pickNoticed — sample and gap', () => {
  it('puts the day-before warning first, offers the sample from day 7, each once', async () => {
    const { pickNoticed } = await import('@/lib/home/noticed')
    const base = { run: 0, eraId: 'e1', laws: [], seen: [] as string[] }
    const gap = { line: 'L', opener: 'O' }
    expect(pickNoticed({ ...base, gap, sample: 'S', eraDay: 8 })?.kind).toBe('gap')
    expect(pickNoticed({ ...base, gap, seen: ['gap:e1'], sample: 'S', eraDay: 8 })?.kind).toBe('sample')
    expect(pickNoticed({ ...base, sample: 'S', eraDay: 6 })).toBeNull()
    expect(pickNoticed({ ...base, sample: 'S', eraDay: 7, seen: ['sample'] })).toBeNull()
    expect(pickNoticed({ ...base, laws: [{ id: 'timing', headline: 'H' }], sample: 'S', eraDay: 9 })?.kind).toBe('law')
  })
})

describe('weakDayEve', () => {
  it('speaks the evening before their hard weekday, in counts', async () => {
    const { weakDayEve } = await import('@/lib/home/insights')
    const weak = { label: 'Tuesday', hits: 3, of: 9 }
    // Monday 2026-09-28, 18:00 local.
    const mondayEve = new Date(2026, 8, 28, 18, 0)
    expect(weakDayEve(weak, mondayEve)?.line).toBe('Tomorrow is Tuesday. Your record shows Tuesdays are harder for you: 3 of 9 kept.')
    expect(weakDayEve(weak, new Date(2026, 8, 28, 10, 0))).toBeNull() // morning: not yet
    expect(weakDayEve(weak, new Date(2026, 8, 29, 18, 0))).toBeNull() // Tuesday eve: tomorrow is Wednesday
    expect(weakDayEve(null, mondayEve)).toBeNull()
    expect(weakDayEve(weak, mondayEve)?.line).not.toMatch(/always|because|lazy|significant/i)
  })
})

describe('week moment', () => {
  it('counts the last seven era days and only shows Sunday evening or Monday', async () => {
    const { eraWeekLine, isWeekMomentTime } = await import('@/lib/home/insights')
    const days = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(day => ({ day, kept: day === 4 ? false : day === 9 ? null : true }))
    expect(eraWeekLine(days, 9)).toBe('This week: 5 of 6 promises kept.') // days 3–9: 3,5,6,7,8 kept, 4 missed, 9 open
    expect(eraWeekLine([], 9)).toBeNull()
    expect(isWeekMomentTime(new Date(2026, 9, 4, 18))).toBe(true) // Sunday 6pm
    expect(isWeekMomentTime(new Date(2026, 9, 4, 10))).toBe(false) // Sunday morning
    expect(isWeekMomentTime(new Date(2026, 9, 5, 9))).toBe(true) // Monday
  })
})
