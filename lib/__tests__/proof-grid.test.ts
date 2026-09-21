import { describe, it, expect } from 'vitest'
import {
  buildProofYear,
  countComebacks,
  longestProofRun,
  longDayLabel,
  proofSummary,
  type ProofPromise,
} from '@/lib/proof/grid'

const kept = (day: string): ProofPromise => ({ day, kept: true })
const missed = (day: string): ProofPromise => ({ day, kept: false })
const open = (day: string): ProofPromise => ({ day, kept: null })

describe('longestProofRun', () => {
  it('counts consecutive calendar days', () => {
    expect(longestProofRun(['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-05'])).toBe(3)
  })

  it('crosses a month boundary', () => {
    expect(longestProofRun(['2026-01-30', '2026-01-31', '2026-02-01'])).toBe(3)
  })

  it('is 0 with nothing kept, and 1 for a lone day', () => {
    expect(longestProofRun([])).toBe(0)
    expect(longestProofRun(['2026-06-06'])).toBe(1)
  })

  it('ignores duplicates', () => {
    expect(longestProofRun(['2026-04-01', '2026-04-01', '2026-04-02'])).toBe(2)
  })
})

describe('countComebacks', () => {
  const all = () => true

  it('counts a keep after two quiet days', () => {
    // 1st kept, nothing on the 2nd and 3rd, back on the 4th.
    expect(countComebacks(['2026-05-01', '2026-05-04'], all)).toBe(1)
  })

  it('does not count a one-day gap', () => {
    expect(countComebacks(['2026-05-01', '2026-05-03'], all)).toBe(0)
  })

  it('never counts the first keep — there was nothing to come back from', () => {
    expect(countComebacks(['2026-05-01'], all)).toBe(0)
    expect(countComebacks(['2026-05-20'], all)).toBe(0)
  })

  it('only counts days inside the window, but judges them against days outside it', () => {
    // Kept on 30 December, then 2 January: two quiet days between, so it is
    // a comeback — and it belongs to the new year, where the gap ended.
    const days = ['2025-12-30', '2026-01-02']
    expect(countComebacks(days, d => d >= '2026-01-01')).toBe(1)
    expect(countComebacks(days, d => d < '2026-01-01')).toBe(0)
  })

  it('does not invent a comeback in January when the run carried over', () => {
    const days = ['2025-12-31', '2026-01-01']
    expect(countComebacks(days, d => d >= '2026-01-01')).toBe(0)
  })
})

describe('buildProofYear', () => {
  const base = { year: 2026, today: '2026-09-20' }

  it('lays the year out in rows of seven, starting on a Sunday', () => {
    const y = buildProofYear({ ...base, promises: [] })
    expect(y.weeks.every(w => w.days.length === 7)).toBe(true)
    // 1 January 2026 is a Thursday: four empty boxes before it.
    expect(y.weeks[0].days.slice(0, 4)).toEqual([null, null, null, null])
    expect(y.weeks[0].days[4]?.day).toBe('2026-01-01')
  })

  it('stops at today and marks the rest of the week as future, not missed', () => {
    const y = buildProofYear({ ...base, promises: [] })
    const flat = y.weeks.flatMap(w => w.days).filter(Boolean)
    const last = flat[flat.length - 1]!
    expect(last.day).toBe('2026-09-26') // the Saturday of today's week
    expect(last.future).toBe(true)
    expect(flat.find(d => d!.day === '2026-09-20')!.isToday).toBe(true)
    expect(flat.find(d => d!.day === '2026-09-21')!.future).toBe(true)
    expect(flat.some(d => d!.day > '2026-09-26')).toBe(false)
  })

  it('runs the whole of a year that is over', () => {
    const y = buildProofYear({ year: 2025, today: '2026-09-20', promises: [] })
    const flat = y.weeks.flatMap(w => w.days).filter(Boolean)
    expect(flat[0]!.day).toBe('2025-01-01')
    expect(flat[flat.length - 1]!.day).toBe('2025-12-31')
    expect(flat.some(d => d!.future)).toBe(false)
  })

  it('draws nothing for a year that has not started', () => {
    const y = buildProofYear({ year: 2027, today: '2026-09-20', promises: [kept('2027-01-01')] })
    expect(y.weeks).toEqual([])
    expect(y.counts.proofs).toBe(0)
  })

  it('separates kept, missed, unanswered and quiet days', () => {
    const y = buildProofYear({
      ...base,
      promises: [kept('2026-09-01'), missed('2026-09-02'), open('2026-09-03')],
    })
    const at = (day: string) => y.weeks.flatMap(w => w.days).find(d => d?.day === day)!
    expect(at('2026-09-01').state).toBe('kept')
    expect(at('2026-09-02').state).toBe('missed')
    expect(at('2026-09-03').state).toBe('open')
    expect(at('2026-09-04').state).toBe('quiet')
    expect(y.counts).toMatchObject({ proofs: 1, missed: 1, open: 1 })
  })

  it('counts era days, missions and check-ins', () => {
    const y = buildProofYear({
      ...base,
      promises: [kept('2026-09-02')],
      missionDays: ['2026-09-02', '2026-09-03'],
      checkInDays: ['2026-09-02'],
      eraSpans: [{ from: '2026-09-01', to: '2026-09-30' }],
    })
    const at = (day: string) => y.weeks.flatMap(w => w.days).find(d => d?.day === day)!
    expect(at('2026-09-02')).toMatchObject({ inEra: true, mission: true, checkIn: true })
    expect(at('2026-08-31').inEra).toBe(false)
    expect(y.counts.missions).toBe(2)
    // 1–20 September, because the year stops at today.
    expect(y.counts.inEra).toBe(20)
  })

  it('opens at the month the record starts, not at 1 January', () => {
    const y = buildProofYear({ ...base, promises: [kept('2026-09-14')], startFrom: '2026-09-14' })
    expect(y.from).toBe('2026-09-01')
    const flat = y.weeks.flatMap(w => w.days).filter(Boolean)
    expect(flat[0]!.day).toBe('2026-09-01')
    // 1 September 2026 is a Tuesday: two empty boxes before it.
    expect(y.weeks[0].days.slice(0, 2)).toEqual([null, null])
    expect(y.weeks[0].days[2]?.day).toBe('2026-09-01')
    expect(y.counts.proofs).toBe(1)
  })

  it('still starts in January when that is where the record starts', () => {
    const y = buildProofYear({ ...base, promises: [kept('2026-01-05')], startFrom: '2026-01-05' })
    expect(y.from).toBe('2026-01-01')
  })

  it('ignores a start day from another year', () => {
    const y = buildProofYear({ ...base, promises: [], startFrom: '2025-11-02' })
    expect(y.from).toBe('2026-01-01')
  })

  it('reports the first and last proof of the year', () => {
    const y = buildProofYear({
      ...base,
      promises: [kept('2026-02-14'), missed('2026-03-01'), kept('2026-08-08')],
    })
    expect(y.firstProof).toBe('2026-02-14')
    expect(y.lastProof).toBe('2026-08-08')
  })

  it('keeps last year out of this year’s counts', () => {
    const y = buildProofYear({ ...base, promises: [kept('2025-12-31'), kept('2026-01-01')] })
    expect(y.counts.proofs).toBe(1)
    expect(y.longestRun).toBe(1)
  })

  it('labels the row where a month starts', () => {
    const y = buildProofYear({ ...base, promises: [] })
    expect(y.weeks[0].label).toBe('Jan')
    expect(y.weeks.filter(w => w.label).length).toBe(9) // January through September
  })

  it('a missed week costs nothing already earned', () => {
    const promises = [
      kept('2026-06-01'), kept('2026-06-02'), kept('2026-06-03'),
      // A week away.
      kept('2026-06-11'),
    ]
    const y = buildProofYear({ ...base, promises })
    expect(y.counts.proofs).toBe(4)
    expect(y.longestRun).toBe(3)
    expect(y.comebacks).toBe(1)
  })
})

describe('proofSummary', () => {
  const year = (promises: ProofPromise[], eraSpans?: { from: string; to: string }[]) =>
    buildProofYear({ year: 2026, today: '2026-09-20', promises, eraSpans })

  it('asks for the first day when there is nothing', () => {
    expect(proofSummary(year([]))).toContain('Start an era')
  })

  it('does not tell someone mid-era to start one', () => {
    const s = proofSummary(year([missed('2026-09-02')], [{ from: '2026-09-01', to: '2026-09-30' }]))
    expect(s).toBe('No days kept yet. The first one starts the record.')
  })

  it('leads with the count, and adds only what happened', () => {
    expect(proofSummary(year([kept('2026-09-02')]))).toBe('1 day kept')
    const s = proofSummary(year([
      kept('2026-09-01'), kept('2026-09-02'), kept('2026-09-06'),
    ]))
    expect(s).toBe('3 days kept · 2 in a row at your best · 1 comeback')
  })
})

describe('longDayLabel', () => {
  it('reads like a date somebody would say', () => {
    expect(longDayLabel('2026-09-19')).toBe('September 19')
    expect(longDayLabel('2026-01-01')).toBe('January 1')
  })
})
