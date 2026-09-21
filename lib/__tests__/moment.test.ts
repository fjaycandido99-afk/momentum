import { describe, it, expect } from 'vitest'
import {
  eraMomentCopy,
  momentAllowed,
  nextSparkCount,
  parseSparkCount,
  pickMoment,
  SPARK_PER_DAY,
  type MomentKind,
} from '@/lib/home/moment'
import type { LoopStep } from '@/lib/era/day-loop'

const base = { loopStep: null as LoopStep | null, hasJournalToday: true, lastKind: null as MomentKind | null }

describe('pickMoment', () => {
  it('leads with the era whenever something is waiting', () => {
    for (const step of ['state', 'promise', 'check', 'check_yesterday'] as LoopStep[]) {
      expect(pickMoment({ ...base, loopStep: step }), step).toBe('era')
    }
  })

  it('does not interrupt with the era when nothing is open', () => {
    for (const step of ['act', 'prepare', 'ready', 'complete'] as LoopStep[]) {
      expect(pickMoment({ ...base, loopStep: step }), step).toBe('spark')
    }
  })

  it('repeats the era, because an open promise is their own business', () => {
    expect(pickMoment({ ...base, loopStep: 'promise', lastKind: 'era' })).toBe('era')
  })

  it('asks for the journal when today is unwritten', () => {
    expect(pickMoment({ ...base, hasJournalToday: false })).toBe('journal')
  })

  it('does not ask for the journal twice running', () => {
    // Skipped this morning; by lunchtime that is nagging.
    expect(pickMoment({ ...base, hasJournalToday: false, lastKind: 'journal' })).toBe('spark')
  })

  it('comes back to the journal after a spark', () => {
    expect(pickMoment({ ...base, hasJournalToday: false, lastKind: 'spark' })).toBe('journal')
  })

  it('falls back to the spark with nothing else to say', () => {
    expect(pickMoment(base)).toBe('spark')
    expect(pickMoment({ ...base, lastKind: 'spark' })).toBe('spark')
  })

  it('works for someone with no era at all', () => {
    expect(pickMoment({ loopStep: null, hasJournalToday: false, lastKind: null })).toBe('journal')
  })
})

describe('momentAllowed', () => {
  it('lets the era and journal moments through on every open', () => {
    expect(momentAllowed('era', { sparksToday: 99 })).toBe(true)
    expect(momentAllowed('journal', { sparksToday: 99 })).toBe(true)
  })

  it('gives the quote a daily ceiling', () => {
    expect(momentAllowed('spark', { sparksToday: 0 })).toBe(true)
    expect(momentAllowed('spark', { sparksToday: SPARK_PER_DAY - 1 })).toBe(true)
    expect(momentAllowed('spark', { sparksToday: SPARK_PER_DAY })).toBe(false)
    expect(momentAllowed('spark', { sparksToday: SPARK_PER_DAY + 3 })).toBe(false)
  })
})

describe('the quote count', () => {
  it('counts today and ignores other days', () => {
    expect(parseSparkCount('2026-09-21:2', '2026-09-21')).toBe(2)
    expect(parseSparkCount('2026-09-20:4', '2026-09-21')).toBe(0)
  })

  it('reads anything unusable as zero — one extra quote beats a dead slot', () => {
    expect(parseSparkCount(null, '2026-09-21')).toBe(0)
    expect(parseSparkCount('', '2026-09-21')).toBe(0)
    expect(parseSparkCount('nonsense', '2026-09-21')).toBe(0)
    // The value the old once-a-day version stored.
    expect(parseSparkCount('2026-09-21', '2026-09-21')).toBe(0)
    expect(parseSparkCount('2026-09-21:x', '2026-09-21')).toBe(0)
  })

  it('increments within the day and restarts on a new one', () => {
    expect(nextSparkCount(null, '2026-09-21')).toBe('2026-09-21:1')
    expect(nextSparkCount('2026-09-21:1', '2026-09-21')).toBe('2026-09-21:2')
    expect(nextSparkCount('2026-09-20:4', '2026-09-21')).toBe('2026-09-21:1')
  })
})

describe('eraMomentCopy', () => {
  it('has a line and an action for every open step', () => {
    for (const step of ['state', 'promise', 'check', 'check_yesterday'] as LoopStep[]) {
      const copy = eraMomentCopy(step)
      expect(copy, step).toBeTruthy()
      expect(copy!.line.length, step).toBeGreaterThan(8)
      expect(copy!.action.length, step).toBeGreaterThan(2)
    }
  })

  it('says nothing for a step where nothing is waiting', () => {
    for (const step of ['act', 'prepare', 'ready', 'complete'] as LoopStep[]) {
      expect(eraMomentCopy(step), step).toBeNull()
    }
  })
})
