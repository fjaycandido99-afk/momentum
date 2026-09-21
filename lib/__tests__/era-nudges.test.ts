import { describe, expect, it } from 'vitest'
import {
  comebackDue,
  comebackMessage,
  completionMessage,
  COMEBACK_AFTER_DAYS,
  COMEBACK_UNTIL_DAYS,
  type ComebackInput,
} from '../era/nudges'

const base: ComebackInput = {
  daysSinceLastPromise: 5,
  daysSinceLastNudge: null,
  wakeCallEnabled: false,
  eraComplete: false,
}

describe('comebackDue', () => {
  it('waits a few days before saying anything', () => {
    expect(comebackDue({ ...base, daysSinceLastPromise: 1 })).toBe(false)
    expect(comebackDue({ ...base, daysSinceLastPromise: COMEBACK_AFTER_DAYS - 1 })).toBe(false)
    expect(comebackDue({ ...base, daysSinceLastPromise: COMEBACK_AFTER_DAYS })).toBe(true)
  })

  it('stops instead of haunting someone who has decided', () => {
    expect(comebackDue({ ...base, daysSinceLastPromise: COMEBACK_UNTIL_DAYS })).toBe(true)
    expect(comebackDue({ ...base, daysSinceLastPromise: COMEBACK_UNTIL_DAYS + 1 })).toBe(false)
    expect(comebackDue({ ...base, daysSinceLastPromise: 90 })).toBe(false)
  })

  it('never twice in a week', () => {
    expect(comebackDue({ ...base, daysSinceLastNudge: 1 })).toBe(false)
    expect(comebackDue({ ...base, daysSinceLastNudge: 6 })).toBe(false)
    expect(comebackDue({ ...base, daysSinceLastNudge: 7 })).toBe(true)
  })

  it('stays out of the way of a wake-up call, which already says this daily', () => {
    expect(comebackDue({ ...base, wakeCallEnabled: true })).toBe(false)
  })

  it('leaves a finished era to the completion push', () => {
    expect(comebackDue({ ...base, eraComplete: true })).toBe(false)
  })
})

describe('comebackMessage', () => {
  it('states the gap and asks for something smaller', () => {
    const m = comebackMessage({ eraName: 'Locked In era', day: 9, lengthDays: 30, daysSinceLastPromise: 4 })
    expect(m.title).toBe('Your Locked In era is still open')
    expect(m.body).toBe("Day 9 of 30, and it's been 4 days. Make today's promise small enough that you keep it.")
    // No scolding, no counting of failures.
    expect(m.body).not.toMatch(/fail|broke|missed|lost/i)
  })

  it('says "a day" rather than "1 days"', () => {
    expect(comebackMessage({ eraName: 'Study Era', day: 4, lengthDays: 30, daysSinceLastPromise: 1 }).body)
      .toContain("it's been a day")
  })
})

describe('completionMessage', () => {
  it('leads with the finish and carries the real record', () => {
    const m = completionMessage({ eraName: 'Locked In era', lengthDays: 30, kept: 24, answered: 28, premium: false })
    expect(m.title).toBe('You finished your Locked In era')
    expect(m.body).toBe('30 days. 24 of 28 promises kept. See what it added up to.')
  })

  it('only promises the recap to someone who has it', () => {
    const premium = completionMessage({ eraName: 'Study Era', lengthDays: 30, kept: 30, answered: 30, premium: true })
    expect(premium.body).toContain('Your recap is ready.')
    const free = completionMessage({ eraName: 'Study Era', lengthDays: 30, kept: 30, answered: 30, premium: false })
    expect(free.body).not.toMatch(/recap/i)
  })

  it('claims no record when nothing was ever answered', () => {
    const m = completionMessage({ eraName: 'Gym Arc era', lengthDays: 30, kept: 0, answered: 0, premium: false })
    expect(m.body).toBe('30 days. Every day of it is yours. See what it added up to.')
    expect(m.body).not.toContain('0 of 0')
  })
})
