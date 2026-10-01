import { describe, it, expect } from 'vitest'
import {
  buildEraRecord, cleanReflection, countRecoveries, longestRun, strongestWeek, weekOf, REFLECTION_MAX,
  type RecordPromise,
} from '@/lib/era/record'

const p = (day: number, kept: boolean | null): RecordPromise => ({ day, kept })

/** 30 days, kept unless listed as missed. */
function month(missed: number[] = []): RecordPromise[] {
  return Array.from({ length: 30 }, (_, i) => p(i + 1, !missed.includes(i + 1)))
}

describe('the era record', () => {
  it('folds days 29–30 into week 4', () => {
    expect(weekOf(1)).toBe(1)
    expect(weekOf(7)).toBe(1)
    expect(weekOf(8)).toBe(2)
    expect(weekOf(30)).toBe(4)
  })

  it('finds the longest kept run', () => {
    expect(longestRun([p(1, true), p(2, true), p(3, false), p(4, true)])).toBe(2)
    expect(longestRun([])).toBe(0)
  })

  it('counts a recovery as a miss followed by the next answered keep', () => {
    expect(countRecoveries([p(1, false), p(2, true), p(3, false), p(4, null), p(5, true)])).toBe(2)
    expect(countRecoveries([p(1, false), p(2, false)])).toBe(0)
  })

  it('names a strongest week only when it is clear', () => {
    // week 3 perfect, the others each have misses
    expect(strongestWeek(month([2, 9, 25]))?.week).toBe(3)
    // a perfect month: four-way tie, nobody singled out
    expect(strongestWeek(month())).toBeNull()
  })

  it('says nothing about weeks without enough answers', () => {
    const thin = [p(1, true), p(2, true), p(8, false), p(15, true), p(22, true)]
    expect(strongestWeek(thin)).toBeNull()
  })

  it('keeps a reflection to one line and the cap', () => {
    expect(cleanReflection('  I start before\n I negotiate  ')).toBe('I start before I negotiate')
    expect(cleanReflection('   ')).toBeNull()
    expect(cleanReflection(42)).toBeNull()
    expect(cleanReflection('x'.repeat(500))!.length).toBe(REFLECTION_MAX)
  })

  it('marks an era stopped early as not completed', () => {
    const base = { id: 'e', title: 'Locked In era', startDay: '2026-09-01', endDay: '2026-09-12', lengthDays: 30, promises: month(), stayed: [], reflection: null }
    expect(buildEraRecord({ ...base, daysRun: 12 }).completed).toBe(false)
    expect(buildEraRecord({ ...base, daysRun: 30 }).completed).toBe(true)
  })
})
