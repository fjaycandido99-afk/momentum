/**
 * The Era Record — a finished era, kept in Proof for good.
 *
 * Every figure is a count from their own rows. Nothing is shown that the
 * data can't carry: "strongest week" only when every week had enough
 * answers and one week is clearly ahead, and no "hardest day" at all — a
 * month holds four or five of each weekday, and naming one from that is
 * reading noise as a pattern. The reflection is theirs, written by them.
 *
 * Pure.
 */

/** Longest a reflection may be: one line. */
export const REFLECTION_MAX = 140

/** Answers each week needs before weeks are compared at all. */
export const WEEK_MIN_ANSWERS = 4

export interface RecordPromise {
  /** 1-based day of the era. */
  day: number
  kept: boolean | null
}

export interface EraRecordInput {
  id: string
  title: string
  startDay: string
  /** The last day it covered — its planned end, or the day it was stopped. */
  endDay: string
  lengthDays: number
  /** How many days it actually ran. */
  daysRun: number
  promises: RecordPromise[]
  /** Disciplines carried forward from it ("What stays with you?"). */
  stayed: string[]
  reflection: string | null
}

export interface EraRecord {
  id: string
  title: string
  startDay: string
  endDay: string
  lengthDays: number
  /** False when it was stopped before its last day. */
  completed: boolean
  daysRun: number
  kept: number
  answered: number
  longestRun: number
  /** Times a miss was followed by a kept promise. */
  recoveries: number
  strongestWeek: { week: number; kept: number; answered: number } | null
  stayed: string[]
  reflection: string | null
}

/** Days 1–7 are week 1 … days 22+ fold into week 4. */
export function weekOf(day: number): number {
  return Math.min(4, Math.ceil(day / 7))
}

/** Longest stretch of consecutive days with a kept promise. */
export function longestRun(promises: readonly RecordPromise[]): number {
  const kept = new Set(promises.filter(p => p.kept === true).map(p => p.day))
  let best = 0
  for (const d of kept) {
    if (kept.has(d - 1)) continue
    let n = 1
    while (kept.has(d + n)) n++
    best = Math.max(best, n)
  }
  return best
}

/**
 * A recovery: a missed promise, and the next ANSWERED promise kept. Days
 * with no answer in between don't break it — coming back after a quiet
 * stretch is still coming back.
 */
export function countRecoveries(promises: readonly RecordPromise[]): number {
  const answered = promises.filter(p => p.kept !== null).sort((a, b) => a.day - b.day)
  let n = 0
  for (let i = 1; i < answered.length; i++) {
    if (answered[i - 1].kept === false && answered[i].kept === true) n++
  }
  return n
}

/**
 * The week with the most kept, by share of answers — only when the era ran
 * all four weeks, every week has WEEK_MIN_ANSWERS answers, and the best is
 * strictly ahead of the next.
 */
export function strongestWeek(promises: readonly RecordPromise[]): EraRecord['strongestWeek'] {
  const weeks = [1, 2, 3, 4].map(week => {
    const rows = promises.filter(p => p.kept !== null && weekOf(p.day) === week)
    return { week, kept: rows.filter(p => p.kept === true).length, answered: rows.length }
  })
  if (weeks.some(w => w.answered < WEEK_MIN_ANSWERS)) return null
  const sorted = [...weeks].sort((a, b) => b.kept / b.answered - a.kept / a.answered)
  if (sorted[0].kept / sorted[0].answered === sorted[1].kept / sorted[1].answered) return null
  return sorted[0]
}

/** Trimmed to one line and the cap; empty means none. */
export function cleanReflection(text: unknown): string | null {
  if (typeof text !== 'string') return null
  const one = text.replace(/\s+/g, ' ').trim().slice(0, REFLECTION_MAX).trim()
  return one || null
}

export function buildEraRecord(input: EraRecordInput): EraRecord {
  const answered = input.promises.filter(p => p.kept !== null)
  return {
    id: input.id,
    title: input.title,
    startDay: input.startDay,
    endDay: input.endDay,
    lengthDays: input.lengthDays,
    completed: input.daysRun >= input.lengthDays,
    daysRun: input.daysRun,
    kept: answered.filter(p => p.kept === true).length,
    answered: answered.length,
    longestRun: longestRun(input.promises),
    recoveries: countRecoveries(input.promises),
    strongestWeek: strongestWeek(input.promises),
    stayed: input.stayed,
    reflection: cleanReflection(input.reflection),
  }
}
