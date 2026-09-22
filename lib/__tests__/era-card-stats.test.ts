import { describe, it, expect } from 'vitest'
import { cardDaysSoFar, cardStatLines } from '../era/card-stats'

describe('era card numbers', () => {
  it('every figure carries its denominator — no bare percentage', () => {
    const lines = cardStatLines({ promisesKept: 14, promisesAnswered: 16, proofDays: 15, daysSoFar: 16 }, true)
    expect(lines).toEqual(['Proof on 15 of 16 days', '14 of 16 promises kept'])
    for (const l of lines) expect(l).not.toMatch(/%/)
  })

  it('never mentions a streak — promiseStreak counts promises made, not kept', () => {
    const lines = cardStatLines({ promisesKept: 3, promisesAnswered: 10, proofDays: 4, daysSoFar: 10 }, true)
    for (const l of lines) expect(l).not.toMatch(/streak|in a row/i)
  })

  it('shows nothing when the person turns the numbers off', () => {
    expect(cardStatLines({ promisesKept: 14, promisesAnswered: 16, proofDays: 15, daysSoFar: 16 }, false)).toEqual([])
  })

  it('leaves out a line it cannot stand behind instead of printing a zero', () => {
    expect(cardStatLines({ promisesKept: 0, promisesAnswered: 0, proofDays: 0, daysSoFar: 0 }, true)).toEqual([])
    // Proof couldn't be read: the promise line still stands on its own.
    expect(cardStatLines({ promisesKept: 2, promisesAnswered: 3, proofDays: null, daysSoFar: 3 }, true)).toEqual(['2 of 3 promises kept'])
  })

  it('singular for one', () => {
    expect(cardStatLines({ promisesKept: 1, promisesAnswered: 1, proofDays: 1, daysSoFar: 1 }, true)).toEqual(['Proof on 1 of 1 day', '1 of 1 promise kept'])
  })

  it('proof can never exceed the days it is out of', () => {
    expect(cardStatLines({ promisesKept: 0, promisesAnswered: 0, proofDays: 9, daysSoFar: 7 }, true)).toEqual(['Proof on 7 of 7 days'])
  })
})

describe('days so far', () => {
  it('an open today is not counted against anyone', () => {
    expect(cardDaysSoFar(17, 30, false)).toBe(16)
    expect(cardDaysSoFar(17, 30, true)).toBe(17)
    expect(cardDaysSoFar(1, 30, false)).toBe(0)
  })

  it('a finished era is out of its full length', () => {
    expect(cardDaysSoFar(30, 30, true)).toBe(30)
    expect(cardDaysSoFar(34, 30, false)).toBe(30)
  })
})
