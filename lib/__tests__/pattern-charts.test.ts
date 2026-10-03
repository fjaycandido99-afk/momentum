import { describe, it, expect } from 'vitest'
import { patternCharts, MIN_FOR_CHARTS } from '@/lib/patterns/charts'
import type { Pattern, PatternInput, PromiseRecord } from '@/lib/patterns/rules'
import { lessonsForLaws, readMinutes, LESSONS } from '@/lib/psychology/lessons'

const p = (hour: number, weekday: number, kept: boolean | null, blocker: string | null = null): PromiseRecord => ({
  day: '2026-09-01', hour, weekday, kept, answeredSameDay: true, source: 'typed', length: 30,
  confidence: null, blocker, helper: null,
})
const input = (promises: PromiseRecord[]): PatternInput =>
  ({ promises, moods: [], guideMoods: [], reasonLabel: k => (k === 'tired' ? 'Too tired' : k) })

describe('pattern charts', () => {
  it('draws nothing below the bar, and counts kept of answered per slot', () => {
    expect(patternCharts(input([p(7, 1, true)]), []).byHour).toBeNull()
    const rows = Array.from({ length: MIN_FOR_CHARTS }, (_, i) => p(i < 6 ? 7 : 20, 1, i < 5))
    const c = patternCharts(input(rows), [])
    expect(c.byHour![2]).toEqual({ label: '6A', kept: 5, answered: 6 })
    expect(c.byHour![6]).toEqual({ label: '6P', kept: 0, answered: 4 })
    // Monday first: weekday 1 is the first column.
    expect(c.byWeekday![0].answered).toBe(MIN_FOR_CHARTS)
  })

  it('never names a hardest day without a solid weekday law', () => {
    const rows = Array.from({ length: 12 }, (_, i) => p(9, i % 7, i % 2 === 0))
    expect(patternCharts(input(rows), []).hardestDay).toBeNull()
    const law = {
      kind: 'weekday', strength: 'solid',
      groups: [{ label: 'Thursday', hits: 2, of: 8, rate: 25 }, { label: 'Monday', hits: 7, of: 8, rate: 87.5 }],
    } as unknown as Pattern
    expect(patternCharts(input(rows), [law]).hardestDay).toBe('Thursday')
  })

  it('lists their own blocker taps on misses, by label, most first', () => {
    const rows = [
      ...Array.from({ length: 8 }, () => p(9, 1, true)),
      p(9, 1, false, 'tired'), p(9, 2, false, 'tired'), p(9, 3, false, 'busy'),
    ]
    expect(patternCharts(input(rows), []).blockers).toEqual([
      { label: 'Too tired', count: 2 }, { label: 'busy', count: 1 },
    ])
  })
})

describe('library helpers', () => {
  it('gives every lesson an honest read time', () => {
    for (const l of LESSONS) expect(readMinutes(l)).toBeGreaterThanOrEqual(1)
  })

  it('maps laws to lessons without repeats', () => {
    expect(lessonsForLaws(['timing', 'follow_through', 'size']).map(l => l.id)).toEqual(['if-then-plans', 'planning-fallacy'])
    expect(lessonsForLaws(['mood'])).toEqual([])
  })
})
