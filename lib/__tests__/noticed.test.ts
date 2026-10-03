import { describe, it, expect } from 'vitest'
import { keptRun, pickNoticed, rememberNoticed } from '@/lib/home/noticed'
import { pickMoment } from '@/lib/home/moment'

const d = (day: number, kept: boolean | null) => ({ day, kept })

describe('Voxu noticed something', () => {
  it('counts kept promises in a row from the latest answered day', () => {
    // Today (6) not answered yet: skipped. 5,4,3 kept; 2 missed.
    expect(keptRun([d(1, true), d(2, false), d(3, true), d(4, true), d(5, true), d(6, null)])).toBe(3)
    // An unanswered day further back ends the run.
    expect(keptRun([d(1, true), d(2, null), d(3, true)])).toBe(1)
    expect(keptRun([])).toBe(0)
  })

  it('says a new law first, with its counts', () => {
    const n = pickNoticed({ run: 12, eraId: 'e1', laws: [{ id: 'timing', headline: 'Before 8am: kept 18 of 20.' }], seen: [] })
    expect(n).toMatchObject({ kind: 'law', key: 'law:timing', detail: 'Before 8am: kept 18 of 20.' })
  })

  it('marks a run at its milestone, quoting the real run, and asks rather than explains', () => {
    const n = pickNoticed({ run: 12, eraId: 'e1', laws: [], seen: [] })
    expect(n).toMatchObject({ kind: 'run', key: 'run:e1:10', line: 'You\'ve kept your last 12 promises in a row.' })
    expect(n?.kind === 'run' && n.opener).toMatch(/\?$/)
  })

  it('never says the same thing twice', () => {
    expect(pickNoticed({ run: 12, eraId: 'e1', laws: [{ id: 'timing', headline: 'x' }], seen: ['law:timing', 'run:e1:10'] })).toBeNull()
    expect(pickNoticed({ run: 4, eraId: 'e1', laws: [], seen: [] })).toBeNull()
    expect(rememberNoticed(['a'], 'b')).toEqual(['a', 'b'])
  })

  it('takes the place of a quote or journal prompt — never of something open', () => {
    expect(pickMoment({ loopStep: null, hasJournalToday: true, lastKind: null, noticed: true })).toBe('noticed')
    expect(pickMoment({ loopStep: null, hasJournalToday: false, lastKind: null, noticed: true })).toBe('noticed')
    expect(pickMoment({ loopStep: 'promise', hasJournalToday: true, lastKind: null, noticed: true })).toBe('era')
    expect(pickMoment({ loopStep: null, hasJournalToday: true, lastKind: null, noticed: true, pulseNudge: true })).toBe('pulse')
  })
})
