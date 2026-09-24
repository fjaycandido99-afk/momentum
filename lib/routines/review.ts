/**
 * Review: the third part of Plan → Run → Review, and the part most likely to
 * lie if it is not held to a rule.
 *
 * The rule is counts with their denominator, and nothing else. "5 of the last
 * 7 days" is a fact somebody can check against their own memory. "You keep
 * your routine 71% of the time" is the same fact dressed as a score, and
 * "you keep your promise 31% more often when you run your routine" — the
 * line the spec asked for — is a coin flip with a decimal point on it: with
 * seven rows there is no comparison to make, and with seventy it would still
 * be somebody choosing to run their routine on the days they were already
 * going to keep their promise.
 *
 * So this counts days. It never scores, never ranks, never explains, and
 * never compares a routine to a promise.
 *
 * One more thing it deliberately does not do: infer a step. A routine records
 * that it was RUN; each discipline records whether it was DONE. Adding "you
 * skipped journaling four times" here would mean reading skips out of run
 * counts, which is exactly the double bookkeeping the two features were kept
 * apart to avoid.
 *
 * Pure. The rows come from RoutineRun.
 */

export interface RunRow {
  local_day: string
  minimum: boolean
  steps_total: number
  steps_done: number
  completed_at: Date | string | null
}

export interface RoutineReview {
  /** How many local days the window covers. The denominator. */
  days: number
  /** Days with a run row at all — the routine was begun. */
  started: number
  /** Days it was walked to the end. */
  completed: number
  /** Days kept as a minimum day. */
  minimumDays: number
  /** The most recent day it was started, or null. */
  lastRun: string | null
  /** Oldest first, for a row of marks. */
  marks: DayMark[]
}

export interface DayMark {
  day: string
  state: 'none' | 'started' | 'minimum' | 'completed'
}

const DAY_MS = 86_400_000

/** YYYY-MM-DD, n days ending today, oldest first. */
export function lastLocalDays(today: string, n: number): string[] {
  const base = Date.parse(`${today}T00:00:00Z`)
  if (!Number.isFinite(base) || n <= 0) return []
  // UTC arithmetic on a plain date string: the string already IS the local
  // day (see lib/assessment/service localDay), so shifting it in UTC never
  // meets a timezone or a daylight-saving hour.
  return Array.from({ length: n }, (_, i) =>
    new Date(base - (n - 1 - i) * DAY_MS).toISOString().slice(0, 10),
  )
}

/**
 * The window, counted.
 *
 * A day with a row is "started" — the runner reports the start on its own,
 * before any step is passed, because started-and-did-not-finish is a real
 * outcome and a routine that only counted completions would tell somebody
 * they had done nothing on a day they did four steps of five.
 */
export function reviewRuns(rows: readonly RunRow[], today: string, days = 7): RoutineReview {
  const window = lastLocalDays(today, days)
  const inWindow = new Set(window)

  const byDay = new Map<string, RunRow>()
  for (const row of rows) {
    if (!inWindow.has(row.local_day)) continue
    // One run per routine per local day is a database constraint; if two ever
    // arrive, the later one wins rather than both being counted.
    byDay.set(row.local_day, row)
  }

  const marks: DayMark[] = window.map(day => {
    const row = byDay.get(day)
    if (!row) return { day, state: 'none' }
    if (row.completed_at) return { day, state: row.minimum ? 'minimum' : 'completed' }
    return { day, state: 'started' }
  })

  const rowsInWindow = [...byDay.values()]

  return {
    days: window.length,
    started: rowsInWindow.length,
    completed: rowsInWindow.filter(r => r.completed_at).length,
    minimumDays: rowsInWindow.filter(r => r.minimum).length,
    lastRun: [...byDay.keys()].sort().at(-1) ?? null,
    marks,
  }
}

/**
 * The sentence, in counts.
 *
 * Nothing in here is encouragement or a verdict: a week with one day in it
 * gets "1 of the last 7 days", not "a slow week" and not "keep going". The
 * app does not know which of those somebody needs, and guessing wrong on the
 * bad week is how it gets deleted.
 */
export function reviewLine(review: RoutineReview): string {
  if (review.started === 0) return `Not started in the last ${review.days} days.`

  const parts = [`Started ${review.started} of the last ${review.days} days`]
  if (review.completed > 0) parts.push(`finished ${review.completed}`)
  if (review.minimumDays > 0) {
    parts.push(
      review.minimumDays === 1
        ? '1 kept as a minimum day'
        : `${review.minimumDays} kept as minimum days`,
    )
  }

  return `${parts.join(' · ')}.`
}
