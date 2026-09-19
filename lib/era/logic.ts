/**
 * Era arithmetic. Pure — no Prisma, no clock except what's passed in — so the
 * rules that decide what the home card says are all testable without a DB.
 *
 * Every "day" here is a YYYY-MM-DD string in the USER's timezone (see
 * lib/assessment/service.ts localDay). Comparing those strings as calendar
 * dates is the whole trick: a user in Hawaii and one in Tokyo each get their
 * own midnight, and nothing here ever converts through server time.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Midnight UTC for a YYYY-MM-DD — only ever used to diff two such days. */
function dayToUtc(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Whole calendar days from `a` to `b` (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((dayToUtc(b) - dayToUtc(a)) / DAY_MS)
}

/** The calendar day before `day`. */
export function previousDay(day: string): string {
  return new Date(dayToUtc(day) - DAY_MS).toISOString().slice(0, 10)
}

/** 1-based day of the era. Day 1 is the day it started. */
export function eraDayNumber(startDay: string, today: string): number {
  return Math.max(1, daysBetween(startDay, today) + 1)
}

/** Past its last day. The era is over, even though its row still says active. */
export function isEraComplete(startDay: string, lengthDays: number, today: string): boolean {
  return eraDayNumber(startDay, today) > lengthDays
}

export interface PromiseLite {
  local_day: string
  kept: boolean | null
}

export interface EraStats {
  /** Promises made, any outcome. */
  made: number
  /** Promises with a yes/no answer. */
  answered: number
  kept: number
  /**
   * kept / answered, 0–100, or null before anything has been answered.
   * Unanswered days are excluded, not counted as misses: forgetting to tap
   * at night is not the same as breaking a promise, and punishing it would
   * teach people to stop making them.
   */
  keptPercent: number | null
  /** Consecutive days, ending today or yesterday, with a promise made. */
  promiseStreak: number
}

export function computeStats(promises: PromiseLite[], today: string): EraStats {
  const made = promises.length
  const answeredRows = promises.filter(p => p.kept !== null)
  const kept = answeredRows.filter(p => p.kept === true).length
  const answered = answeredRows.length

  const days = new Set(promises.map(p => p.local_day))
  // A streak survives until the end of today: not having promised YET today
  // doesn't break it, so count back from yesterday when today is still open.
  let cursor = days.has(today) ? today : previousDay(today)
  let promiseStreak = 0
  while (days.has(cursor)) {
    promiseStreak++
    cursor = previousDay(cursor)
  }

  return {
    made,
    answered,
    kept,
    keptPercent: answered > 0 ? Math.round((kept / answered) * 100) : null,
    promiseStreak,
  }
}

/**
 * What the home card should be asking for right now, in priority order.
 *
 *  - `check_yesterday` yesterday's promise was never answered. Ask that first
 *                      — it's the one moment the answer is still honest.
 *  - `complete`       the era ran its length; offer the summary and a next one.
 *  - `promise`        nothing promised today yet.
 *  - `check`          promised today; ask whether it was kept. The card shows
 *                      this softly before evening and plainly after.
 *  - `done`           promised and answered. Nothing left to do today.
 */
export type EraStep = 'complete' | 'check_yesterday' | 'promise' | 'check' | 'done'

export function eraStep(args: {
  startDay: string
  lengthDays: number
  today: string
  todayPromise: PromiseLite | null
  yesterdayPromise: PromiseLite | null
}): EraStep {
  const { startDay, lengthDays, today, todayPromise, yesterdayPromise } = args
  // Yesterday first, even on the morning after the last day: day 30's answer
  // belongs in the summary, so ask for it before showing one.
  const yesterday = previousDay(today)
  const yesterdayInEra =
    daysBetween(startDay, yesterday) >= 0 && eraDayNumber(startDay, yesterday) <= lengthDays
  if (yesterdayPromise && yesterdayPromise.kept === null && yesterdayInEra) {
    return 'check_yesterday'
  }
  if (isEraComplete(startDay, lengthDays, today)) return 'complete'
  if (!todayPromise) return 'promise'
  if (todayPromise.kept === null) return 'check'
  return 'done'
}

/** Local hour from which the card asks "did you keep it?" plainly. */
export const CHECK_IN_FROM_HOUR = 17
