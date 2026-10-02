import { describe, it, expect } from 'vitest'
import { evaluateExperiment, EXPERIMENT_BY_KEY, experimentDay, experimentFor, type DayFact } from '@/lib/patterns/experiments'

const fact = (n: number, kept: boolean | null, over: Partial<DayFact> = {}): DayFact => ({
  day: `2026-09-${String(n).padStart(2, '0')}`, promiseHour: 10, promiseLength: 30, kept,
  promiseAt: 1000, guideAt: null, ...over,
})

describe('experiments', () => {
  const morning = EXPERIMENT_BY_KEY.get('morning_promise')!

  it('calls a big lift promising — never proven — with both counts', () => {
    const during = [1, 2, 3, 4, 5, 6, 7].map(n => fact(n, true, { promiseHour: 7 }))
    const before = Array.from({ length: 20 }, (_, i) => fact(i + 1, i % 2 === 0))
    const r = evaluateExperiment(morning, during, before)
    expect(r.verdict).toBe('promising')
    expect(r.daysFollowed).toBe(7)
    expect(r.line).toMatch(/7 of 7 kept during, against 10 of 20/)
    expect(r.line).toMatch(/small test/)
    expect(r.line).not.toMatch(/proven|causes/i)
  })

  it('says no clear difference when the gap is small', () => {
    const during = [1, 2, 3, 4, 5, 6].map(n => fact(n, n % 2 === 0))
    const before = Array.from({ length: 20 }, (_, i) => fact(i + 1, i % 2 === 0))
    expect(evaluateExperiment(morning, during, before).verdict).toBe('no_clear_difference')
  })

  it('says nothing with too few answered days', () => {
    const during = [fact(1, true), fact(2, null), fact(3, null)]
    expect(evaluateExperiment(morning, during, Array.from({ length: 20 }, (_, i) => fact(i, true))).verdict).toBe('not_enough')
  })

  it('counts a guide-first day only when the guide came before the promise', () => {
    const guide = EXPERIMENT_BY_KEY.get('guide_first')!
    expect(guide.followed(fact(1, true, { guideAt: 500, promiseAt: 1000 }))).toBe(true)
    expect(guide.followed(fact(1, true, { guideAt: 1500, promiseAt: 1000 }))).toBe(false)
  })

  it('maps a law to the experiment that tests it', () => {
    expect(experimentFor({ kind: 'timing' })?.key).toBe('morning_promise')
    expect(experimentFor({ kind: 'size' })?.key).toBe('small_promise')
    expect(experimentFor({ kind: 'guided_day' })?.key).toBe('guide_first')
    expect(experimentFor({ kind: 'mood' })).toBeNull()
  })

  it('numbers the days 1 to 7', () => {
    expect(experimentDay('2026-10-01', '2026-10-01')).toBe(1)
    expect(experimentDay('2026-10-01', '2026-10-07')).toBe(7)
    expect(experimentDay('2026-10-01', '2026-10-08')).toBeNull()
  })
})
