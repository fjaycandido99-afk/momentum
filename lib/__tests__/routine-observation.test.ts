import { describe, expect, it } from 'vitest'
import {
  MIN_DAYS_FOR_OBSERVATION,
  OBSERVATION_LIMIT,
  OBSERVATION_SYSTEM_PROMPT,
  buildObservationPrompt,
  toObservation,
  validateObservation,
  weekKey,
  weekdayOf,
  worthObserving,
} from '@/lib/routines/observation'
import { reviewRuns, type RunRow } from '@/lib/routines/review'

const run = (day: string, over: Partial<RunRow> = {}): RunRow => ({
  local_day: day,
  minimum: false,
  steps_total: 5,
  steps_done: 5,
  completed_at: new Date('2026-09-21T08:00:00Z'),
  ...over,
})

const week = reviewRuns(
  [run('2026-09-23'), run('2026-09-22'), run('2026-09-21'), run('2026-09-19'), run('2026-09-18')],
  '2026-09-23',
)

describe('when there is anything to say', () => {
  it('needs a few days of evidence first', () => {
    // Most weeks, for most people, the honest answer is nothing.
    expect(worthObserving(reviewRuns([], '2026-09-23'))).toBe(false)
    expect(worthObserving(reviewRuns([run('2026-09-23')], '2026-09-23'))).toBe(false)
    expect(worthObserving(week)).toBe(true)
    expect(MIN_DAYS_FOR_OBSERVATION).toBeGreaterThan(1)
  })
})

describe('the prompt', () => {
  const prompt = buildObservationPrompt({
    review: week,
    routineLabel: 'Training day',
    days: [1, 4],
    eraTitle: 'Gym Arc',
  })

  it('gives counts with their denominators, and nothing else', () => {
    expect(prompt).toContain('STARTED: 5 of the last 7 days')
    expect(prompt).toContain('MEANT TO RUN ON: Monday, Thursday')
    expect(prompt).toContain('THEIR ERA: Gym Arc')
  })

  it('names the days not started, so "both were Sundays" is a fact not a guess', () => {
    expect(prompt).toContain(`DAYS NOT STARTED: Thursday, Sunday`)
  })

  it('leaves that out when there are too many to name', () => {
    const empty = buildObservationPrompt({
      review: reviewRuns([run('2026-09-23')], '2026-09-23'),
      routineLabel: 'x',
      days: [],
    })
    expect(empty).not.toContain('DAYS NOT STARTED')
  })

  it('forbids the percentage, the cause and the prediction explicitly', () => {
    expect(OBSERVATION_SYSTEM_PROMPT).toMatch(/may NOT/)
    expect(OBSERVATION_SYSTEM_PROMPT).toMatch(/percentage, a rate, a score/i)
    expect(OBSERVATION_SYSTEM_PROMPT).toMatch(/explain WHY/i)
    expect(OBSERVATION_SYSTEM_PROMPT).toMatch(/predict anything/i)
    // And it offers silence as an answer.
    expect(OBSERVATION_SYSTEM_PROMPT).toMatch(/silence is a valid answer/i)
  })
})

describe('the guard, which is the argument I lost kept as code', () => {
  it('allows a count with its denominator', () => {
    expect(validateObservation('You started 5 of the last 7 days.')).toBeNull()
  })

  it('allows naming which days', () => {
    expect(validateObservation('The two you did not start were both Sundays.')).toBeNull()
  })

  it('allows a question about a day', () => {
    expect(validateObservation('What happened on Sunday?')).toBeNull()
  })

  it('refuses a percentage, in any form', () => {
    expect(validateObservation('You kept it 71% of the time.')).toBe('BANNED')
    expect(validateObservation('That is seventy one percent.')).toBe('BANNED')
    expect(validateObservation('You keep your promise 31% more often.')).toBe('BANNED')
    expect(validateObservation('You are 2x more likely to keep it.')).toBe('BANNED')
    expect(validateObservation('You keep your promise more often on those days.')).toBe('BANNED')
  })

  it('refuses a causal claim', () => {
    expect(validateObservation('You missed Sunday because you were tired.')).toBe('BANNED')
    expect(validateObservation('Starting the routine leads to keeping your promise.')).toBe('BANNED')
    expect(validateObservation('That is why your week held together.')).toBe('BANNED')
  })

  it('refuses a prediction or a promise', () => {
    expect(validateObservation('You will feel it by next week.')).toBe('BANNED')
    expect(validateObservation('Keep it up and you’ll see results.')).toBe('BANNED')
  })

  it('refuses a score, a streak or a grade', () => {
    expect(validateObservation('Your consistency score is strong.')).toBe('BANNED')
    expect(validateObservation('Five day streak.')).toBe('BANNED')
    expect(validateObservation('You are behind this week.')).toBe('BANNED')
  })

  it('refuses praise and scolding alike', () => {
    expect(validateObservation('Well done, five of seven.')).toBe('BANNED')
    expect(validateObservation('You need to start on Sundays.')).toBe('BANNED')
  })

  it('refuses a second sentence, where the explaining starts', () => {
    expect(validateObservation('You started 5 of 7 days. The weekend is your gap.'))
      .toBe('MULTI_SENTENCE')
  })

  it('refuses anything a line cannot hold', () => {
    expect(validateObservation('x'.repeat(OBSERVATION_LIMIT + 1))).toBe('TOO_LONG')
  })

  it('treats silence as an answer, not a failure', () => {
    expect(validateObservation('')).toBe('EMPTY')
    expect(validateObservation(null)).toBe('EMPTY')
    expect(toObservation({ line: '' })).toBeNull()
  })

  it('cleans what it keeps', () => {
    expect(toObservation({ line: '  You started 5 of   the last 7 days.  ' }))
      .toBe('You started 5 of the last 7 days.')
  })
})

describe('the cache key', () => {
  it('is the Monday of that week', () => {
    // Monday-first, so a Sunday belongs to the week that began six days
    // earlier — not to the one starting the next morning.
    expect(weekKey('2026-09-21')).toBe('2026-09-21') // a Monday
    expect(weekKey('2026-09-23')).toBe('2026-09-21')
    expect(weekKey('2026-09-27')).toBe('2026-09-21') // the Sunday after
    expect(weekKey('2026-09-28')).toBe('2026-09-28') // next Monday
  })

  it('crosses a month without arithmetic of its own', () => {
    expect(weekKey('2026-10-01')).toBe('2026-09-28')
  })

  it('returns nothing rather than throwing on nonsense', () => {
    expect(weekKey('not a day')).toBe('')
  })
})

describe('weekday names', () => {
  it('reads a local day back as its weekday', () => {
    expect(weekdayOf('2026-09-21')).toBe('Monday')
    expect(weekdayOf('2026-09-27')).toBe('Sunday')
    expect(weekdayOf('garbage')).toBe('')
  })
})
