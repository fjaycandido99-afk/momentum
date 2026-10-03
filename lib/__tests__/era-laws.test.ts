import { describe, it, expect } from 'vitest'
import { addDays, lawsLearned, patternInputAsOf } from '@/lib/patterns/era-laws'
import type { PatternInput, PromiseRecord } from '@/lib/patterns/rules'

/** Mornings kept, evenings missed — a clear timing law — over `days` days from `start`. */
function mornings(start: string, days: number): PromiseRecord[] {
  return Array.from({ length: days }, (_, i) => {
    const morning = i % 2 === 0
    return {
      day: addDays(start, i), hour: morning ? 7 : 20, weekday: i % 7, kept: morning,
      answeredSameDay: true, source: 'typed', length: 30, confidence: null, blocker: null, helper: null,
    }
  })
}

const input = (promises: PromiseRecord[]): PatternInput => ({ promises, moods: [], guideMoods: [], today: '2026-12-31' })

describe('laws learned in an era', () => {
  it('names a law that turned solid during the era', () => {
    const laws = lawsLearned(input(mornings('2026-09-01', 30)), '2026-09-01', '2026-09-30')
    expect(laws.map(l => l.id)).toContain('timing')
  })

  it('does not credit an era with a law that was already solid before it began', () => {
    const history = input([...mornings('2026-07-01', 40), ...mornings('2026-09-01', 30)])
    expect(lawsLearned(history, '2026-09-01', '2026-09-30').map(l => l.id)).not.toContain('timing')
  })

  it('never lets later days leak into an earlier era', () => {
    // The era itself was quiet; the law only appeared afterwards.
    const laws = lawsLearned(input(mornings('2026-10-05', 40)), '2026-09-01', '2026-09-30')
    expect(laws).toEqual([])
  })

  it('rewinds every source to the day and drops disciplines', () => {
    const asOf = patternInputAsOf({
      ...input(mornings('2026-09-01', 30)),
      guidedDays: ['2026-09-02', '2026-10-02'],
      disciplines: [{ label: 'Read', kept: 5, due: 6 }],
    }, '2026-09-15')
    expect(asOf.promises.every(p => p.day <= '2026-09-15')).toBe(true)
    expect(asOf.guidedDays).toEqual(['2026-09-02'])
    expect(asOf.disciplines).toEqual([])
    expect(asOf.today).toBe('2026-09-15')
  })
})
