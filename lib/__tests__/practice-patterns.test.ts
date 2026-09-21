import { describe, it, expect } from 'vitest'
import {
  MIN_AFTER_MISS,
  MIN_OVERLAP,
  MIN_WEEKDAY_SAMPLE,
  findPracticePatterns,
  patternsPending,
  type PatternInput,
  type PatternLog,
} from '@/lib/practices/patterns'
import type { PracticeLite } from '@/lib/practices/logic'

const gym: PracticeLite & { presetKey: string } = {
  id: 'p1',
  presetKey: 'gym_full_body_3',
  label: 'Gym',
  days: [1, 3, 5],
  minimum: '40 minutes',
}

const log = (day: string, done: boolean, minimumOnly = false): PatternLog =>
  ({ practiceId: 'p1', day, done, minimumOnly })

const base: PatternInput = {
  today: '2026-10-31',
  practices: [gym],
  logs: [],
  promises: [],
  exercises: [],
}

/** Mondays, Wednesdays and Fridays across October 2026. */
const mondays = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']
const fridays = ['2026-10-02', '2026-10-09', '2026-10-16', '2026-10-23']

describe('findPracticePatterns', () => {
  it('says nothing at all with no data', () => {
    expect(findPracticePatterns(base)).toEqual([])
  })

  it('leads with what the minimum saved', () => {
    const logs = [
      log(mondays[0], true, true),
      log(mondays[1], true, true),
      log(mondays[2], true, true),
    ]
    const found = findPracticePatterns({ ...base, logs })
    expect(found[0].id).toBe('minimum_rescue')
    expect(found[0].line).toContain('3 days')
  })

  it('does not mention the minimum for one or two days', () => {
    const logs = [log(mondays[0], true, true), log(mondays[1], true, true)]
    expect(findPracticePatterns({ ...base, logs }).some(p => p.id === 'minimum_rescue')).toBe(false)
  })

  it('counts coming back after a miss, per practice', () => {
    // Miss, then kept, three times over.
    const logs = [
      log('2026-10-05', false), log('2026-10-07', true),
      log('2026-10-12', false), log('2026-10-14', true),
      log('2026-10-19', false), log('2026-10-21', false),
    ]
    const found = findPracticePatterns({ ...base, logs })
    const back = found.find(p => p.id === 'after_miss')
    expect(back?.line).toBe('After a miss you came back the next time 2 of 3 times.')
  })

  it('needs a few misses before talking about coming back', () => {
    const logs = [log('2026-10-05', false), log('2026-10-07', true)]
    expect(findPracticePatterns({ ...base, logs }).some(p => p.id === 'after_miss')).toBe(false)
    expect(MIN_AFTER_MISS).toBe(3)
  })

  it('names the hardest weekday with its counts, once there are enough', () => {
    const logs = [
      ...mondays.map(d => log(d, true)),
      ...fridays.map(d => log(d, false)),
    ]
    const found = findPracticePatterns({ ...base, logs })
    const weak = found.find(p => p.id === 'weak_day')
    expect(weak?.line).toBe('Fridays are your hardest — you missed 4 of the last 4.')
  })

  it('will not judge a weekday it has seen three times', () => {
    const logs = [
      ...mondays.map(d => log(d, true)),
      ...fridays.slice(0, 3).map(d => log(d, false)),
    ]
    const found = findPracticePatterns({ ...base, logs })
    expect(found.some(p => p.id === 'weak_day')).toBe(false)
    expect(MIN_WEEKDAY_SAMPLE).toBe(4)
  })

  it('reports promises as co-occurrence, never as cause', () => {
    const days = [...mondays, ...fridays.slice(0, 2)]
    const logs = days.map(d => log(d, true))
    const promises = days.map((d, i) => ({ day: d, kept: i < 5 }))
    const found = findPracticePatterns({ ...base, logs, promises })
    const co = found.find(p => p.id === 'with_promises')
    expect(co?.line).toContain('5 of 6')
    // No causal verb anywhere.
    expect(co?.line).not.toMatch(/because|causes|makes you|leads to|improves/i)
  })

  it('needs enough overlapping days before comparing two things', () => {
    const logs = mondays.map(d => log(d, true))
    const promises = mondays.map(d => ({ day: d, kept: true }))
    expect(findPracticePatterns({ ...base, logs, promises }).some(p => p.id === 'with_promises')).toBe(false)
    expect(MIN_OVERLAP).toBe(6)
  })

  it('counts finished guided sessions out of started ones', () => {
    const exercises = Array.from({ length: 8 }, (_, i) => ({
      day: `2026-10-${String(i + 1).padStart(2, '0')}`,
      completed: i < 6,
    }))
    const found = findPracticePatterns({ ...base, exercises })
    expect(found.find(p => p.id === 'exercise_finish')?.line).toContain('6 of the 8')
  })

  it('shows at most three, strongest first', () => {
    const logs = [
      ...mondays.map(d => log(d, true, true)),
      ...fridays.map(d => log(d, false)),
      log('2026-10-07', true), log('2026-10-14', true),
    ]
    const promises = [...mondays, ...fridays].map(d => ({ day: d, kept: true }))
    const exercises = Array.from({ length: 8 }, (_, i) => ({ day: mondays[i % 4], completed: true }))
    const found = findPracticePatterns({ ...base, logs, promises, exercises })
    expect(found.length).toBeLessThanOrEqual(3)
    expect(found[0].weight).toBeGreaterThanOrEqual(found[found.length - 1].weight)
  })

  it('never prints a bare percentage', () => {
    const logs = [
      ...mondays.map(d => log(d, true, true)),
      ...fridays.map(d => log(d, false)),
    ]
    for (const pattern of findPracticePatterns({ ...base, logs })) {
      expect(pattern.line).not.toMatch(/\d+%/)
      // Everything either carries "n of m" or is a plain count of days.
      expect(/\d/.test(pattern.line)).toBe(true)
    }
  })
})

describe('patternsPending', () => {
  it('says what it is waiting for, not "collecting signals"', () => {
    expect(patternsPending(base)).toContain('minimum')
    const few = patternsPending({ ...base, logs: [log(mondays[0], true)] })
    expect(few).toContain('1 answered day')
    const some = patternsPending({ ...base, logs: mondays.map(d => log(d, true)) })
    expect(some).toContain('4 answered days')
  })

  it('admits when it has data but nothing worth saying', () => {
    const logs = [
      ...mondays.map(d => log(d, true)),
      ...fridays.map(d => log(d, true)),
      log('2026-10-07', true),
    ]
    // All kept, every weekday perfect: nothing to report but the best-day
    // line, which needs a worst day to contrast with.
    const pending = patternsPending({ ...base, logs })
    expect(pending).toContain('Nothing worth reporting')
  })
})
