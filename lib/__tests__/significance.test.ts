import { describe, expect, it } from 'vitest'
import { fisherExactTwoTailed, holmSurvivors } from '../patterns/significance'

describe('fisherExactTwoTailed', () => {
  it('matches the textbook tea-tasting table', () => {
    // Fisher's own example: 3 of 4 against 1 of 4, two-tailed p = 0.4857…
    expect(fisherExactTwoTailed(3, 4, 1, 4)).toBeCloseTo(0.4857, 4)
  })

  it('matches a perfect split', () => {
    // 10/10 against 0/10 — as extreme as twenty days can be.
    expect(fisherExactTwoTailed(10, 10, 0, 10)).toBeCloseTo(1.083e-5, 8)
  })

  it('calls a coin flip a coin flip', () => {
    // 4 of 5 against 3 of 5: a 20-point gap that the old 15-point rule
    // published as a pattern.
    expect(fisherExactTwoTailed(4, 5, 3, 5)).toBeGreaterThan(0.5)
    // Even 9 of 10 against 4 of 10 is only borderline on its own.
    expect(fisherExactTwoTailed(9, 10, 4, 10)).toBeGreaterThan(0.05)
    expect(fisherExactTwoTailed(9, 10, 4, 10)).toBeLessThan(0.1)
  })

  it('finds a real difference once there are enough days', () => {
    expect(fisherExactTwoTailed(18, 20, 8, 20)).toBeLessThan(0.01)
  })

  it('is symmetric, and has no opinion without data', () => {
    expect(fisherExactTwoTailed(9, 10, 4, 10)).toBeCloseTo(fisherExactTwoTailed(4, 10, 9, 10), 12)
    expect(fisherExactTwoTailed(0, 0, 5, 10)).toBe(1)
    expect(fisherExactTwoTailed(5, 10, 0, 0)).toBe(1)
    // Every day the same outcome: nothing to compare.
    expect(fisherExactTwoTailed(10, 10, 10, 10)).toBe(1)
    expect(fisherExactTwoTailed(0, 10, 0, 10)).toBe(1)
  })

  it('rejects impossible tables instead of inventing a number', () => {
    expect(fisherExactTwoTailed(11, 10, 1, 10)).toBe(1)
    expect(fisherExactTwoTailed(-1, 10, 1, 10)).toBe(1)
  })
})

describe('holmSurvivors', () => {
  it('is stricter than testing each one alone', () => {
    // Eleven patterns at 0.04 each: alone every one "passes", together none
    // should — that is the false-positive rate this exists to stop.
    expect(holmSurvivors(Array(11).fill(0.04)).filter(Boolean)).toHaveLength(0)
  })

  it('lets a strong result through, and stops at the first failure', () => {
    const survived = holmSurvivors([0.001, 0.02, 0.04, 0.9])
    // 0.001 < 0.05/4, 0.02 > 0.05/3 → the step-down stops there.
    expect(survived).toEqual([true, false, false, false])
  })

  it('does not depend on the order it was given', () => {
    // Three tests: 0.001 ≤ 0.05/3, then 0.02 ≤ 0.05/2, then 0.9 fails.
    expect(holmSurvivors([0.001, 0.9, 0.02])).toEqual([true, false, true])
    expect(holmSurvivors([0.9, 0.02, 0.001])).toEqual([false, true, true])
  })

  it('handles the empty and single cases', () => {
    expect(holmSurvivors([])).toEqual([])
    expect(holmSurvivors([0.04])).toEqual([true])
    expect(holmSurvivors([0.06])).toEqual([false])
  })
})
