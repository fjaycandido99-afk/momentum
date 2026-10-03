import { describe, it, expect } from 'vitest'
import { lawsLines, lawsSection } from '@/lib/ai/laws-context'
import type { Pattern } from '@/lib/patterns/rules'
import type { ExperimentWire } from '@/lib/patterns/experiments-server'

const pattern = (id: string, strength: Pattern['strength'], headline: string) =>
  ({ id, kind: 'timing', headline, detail: '', groups: [], gap: 20, strength, p: 0.01 }) as unknown as Pattern

const exp = (over: Partial<ExperimentWire>): ExperimentWire => ({
  id: 'e', key: 'morning_promise', title: 'Morning promise', ask: 'Make your promise before 9 AM.',
  startDay: '2026-10-01', endDay: '2026-10-07', status: 'active', day: 3, followedToday: false, result: null, ...over,
})

describe('the coach’s laws block', () => {
  it('quotes only solid laws, never the ones still being watched', () => {
    const lines = lawsLines({ patterns: [
      pattern('timing', 'solid', 'Morning promises: kept 18 of 20 — evenings, 6 of 15.'),
      pattern('weekday', 'early', 'Fridays: kept 2 of 5.'),
    ] }, null)
    expect(lines).toEqual(['Law: Morning promises: kept 18 of 20 — evenings, 6 of 15.'])
  })

  it('says where a running experiment is, and never "not done" (the block is cached)', () => {
    expect(lawsLines(null, { active: exp({}), finished: [] })[0]).toMatch(/day 3 of 7\.$/)
    expect(lawsLines(null, { active: exp({ followedToday: true }), finished: [] })[0]).toMatch(/day 3 of 7, done today\.$/)
    expect(lawsLines(null, { active: exp({}), finished: [] }).join(' ')).not.toMatch(/not done/)
  })

  it('reports finished results as written, skipping ones with too few days', () => {
    const finished = [
      exp({ status: 'done', day: null, result: { verdict: 'promising', line: '7 of 7 kept during, against 10 of 20 before — promising, but a small test.', daysFollowed: 7 } as never }),
      exp({ id: 'f', status: 'done', day: null, result: { verdict: 'not_enough', line: 'Not enough days.', daysFollowed: 1 } as never }),
    ]
    const lines = lawsLines(null, { active: null, finished })
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/promising, but a small test/)
  })

  it('adds nothing when there is nothing to say, and tells the coach not to claim causes', () => {
    expect(lawsSection({ patterns: [] }, { active: null, finished: [] })).toBeNull()
    const s = lawsSection({ patterns: [pattern('timing', 'solid', 'x')] }, null)!
    expect(s).toMatch(/never "this causes"/)
    expect(s).toMatch(/quote the numbers exactly/)
  })
})
