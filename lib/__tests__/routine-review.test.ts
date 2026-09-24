import { describe, expect, it } from 'vitest'
import { lastLocalDays, reviewLine, reviewRuns, type RunRow } from '@/lib/routines/review'

const run = (day: string, over: Partial<RunRow> = {}): RunRow => ({
  local_day: day,
  minimum: false,
  steps_total: 5,
  steps_done: 5,
  completed_at: new Date('2026-09-20T08:00:00Z'),
  ...over,
})

describe('the window', () => {
  it('is n local days ending today, oldest first', () => {
    expect(lastLocalDays('2026-09-23', 3)).toEqual(['2026-09-21', '2026-09-22', '2026-09-23'])
  })

  it('crosses a month and a year without arithmetic of its own', () => {
    expect(lastLocalDays('2026-03-02', 3)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02'])
    expect(lastLocalDays('2027-01-01', 2)).toEqual(['2026-12-31', '2027-01-01'])
  })

  it('survives a leap day', () => {
    expect(lastLocalDays('2028-03-01', 2)).toEqual(['2028-02-29', '2028-03-01'])
  })

  it('returns nothing rather than throwing on nonsense', () => {
    expect(lastLocalDays('not a day', 7)).toEqual([])
    expect(lastLocalDays('2026-09-23', 0)).toEqual([])
  })
})

describe('counting the week', () => {
  const today = '2026-09-23'

  it('counts started, finished and minimum days separately', () => {
    const review = reviewRuns(
      [
        run('2026-09-23'),
        run('2026-09-22', { completed_at: null, steps_done: 2 }),
        run('2026-09-21', { minimum: true }),
      ],
      today,
    )

    expect(review.days).toBe(7)
    expect(review.started).toBe(3)
    // Started-and-did-not-finish is its own outcome, not a completion.
    expect(review.completed).toBe(2)
    expect(review.minimumDays).toBe(1)
    expect(review.lastRun).toBe('2026-09-23')
  })

  it('ignores anything outside the window', () => {
    const review = reviewRuns([run('2026-09-01'), run('2026-09-23')], today)
    expect(review.started).toBe(1)
    expect(review.marks).toHaveLength(7)
  })

  it('marks each day for a row of marks, oldest first', () => {
    const review = reviewRuns(
      [run('2026-09-23'), run('2026-09-22', { completed_at: null }), run('2026-09-21', { minimum: true })],
      today,
      3,
    )
    expect(review.marks.map(m => m.state)).toEqual(['minimum', 'started', 'completed'])
    expect(review.marks.map(m => m.day)).toEqual(['2026-09-21', '2026-09-22', '2026-09-23'])
  })

  it('has an honest empty state', () => {
    const review = reviewRuns([], today)
    expect(review.started).toBe(0)
    expect(review.lastRun).toBeNull()
    expect(review.marks.every(m => m.state === 'none')).toBe(true)
  })
})

describe('what it says', () => {
  const today = '2026-09-23'

  it('always carries its denominator', () => {
    const line = reviewLine(reviewRuns([run('2026-09-23'), run('2026-09-22')], today))
    expect(line).toContain('2 of the last 7 days')
  })

  it('says nothing about a percentage, a score or a reason', () => {
    // The rule the whole file exists for. A percentage of seven days is a
    // number pretending to be an insight.
    for (const rows of [
      [] as RunRow[],
      [run('2026-09-23')],
      [run('2026-09-23'), run('2026-09-22', { minimum: true, completed_at: null })],
    ]) {
      const line = reviewLine(reviewRuns(rows, today))
      expect(line).not.toMatch(/%|percent|more often|because|streak|score/i)
    }
  })

  it('does not pep-talk a bad week', () => {
    const line = reviewLine(reviewRuns([], today))
    expect(line).toBe('Not started in the last 7 days.')
    expect(line).not.toMatch(/keep going|don.t worry|tomorrow/i)
  })

  it('counts minimum days in words that fit', () => {
    expect(reviewLine(reviewRuns([run('2026-09-23', { minimum: true })], today)))
      .toContain('1 kept as a minimum day')
    expect(
      reviewLine(reviewRuns([run('2026-09-23', { minimum: true }), run('2026-09-22', { minimum: true })], today)),
    ).toContain('2 kept as minimum days')
  })
})
