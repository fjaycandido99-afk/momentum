import { describe, it, expect } from 'vitest'
import { weekRecap, weekLine } from '@/lib/proof/week'
import type { ProofDetail } from '@/lib/proof/server'

const day = (d: string, over: Partial<ProofDetail> = {}): ProofDetail => ({
  day: d, kept: null, promise: null, coachReply: null, confidence: null, reason: null, reasonKind: null,
  era: null, eraDay: null, mission: null, missionDone: false, practices: [], exercise: null, audio: [], state: null, ...over,
})

describe('weekRecap', () => {
  const details: Record<string, ProofDetail> = {
    '2026-10-03': day('2026-10-03', { promise: 'x', kept: true, missionDone: true }),
    '2026-10-01': day('2026-10-01', { promise: 'y', kept: false, state: { mood: 2, energy: null, stress: null, rested: null, tags: [] } }),
    '2026-09-27': day('2026-09-27', { promise: 'z', kept: null }),
    '2026-09-25': day('2026-09-25', { promise: 'w', kept: true }),
  }
  it('counts the last 7 days against the 7 before, with their own denominators', () => {
    const r = weekRecap(details, '2026-10-03')
    expect(r.from).toBe('2026-09-27')
    expect(r.thisWeek).toMatchObject({ promised: 3, kept: 1, missed: 1, missions: 1, checkIns: 1, harderDays: 1 })
    expect(r.lastWeek).toMatchObject({ promised: 1, kept: 1, harderDays: null })
    expect(weekLine(r)).toBe('This week: 1 of 3 promises kept.')
  })
  it('says nothing about harder days without check-ins, and nothing at all on an empty fortnight', () => {
    expect(weekRecap({}, '2026-10-03').hasAnything).toBe(false)
    expect(weekLine(weekRecap({}, '2026-10-03'))).toBeNull()
  })
})
