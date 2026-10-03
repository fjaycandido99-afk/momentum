import type { Pattern, PatternInput } from './rules'

/**
 * The charts on Your laws — counts from their own answered promises.
 *
 * Bars carry two numbers, never a percentage: how many were answered in a
 * slot (the faint bar) and how many of those were kept (the bright fill).
 * A slot with three answers looks like a slot with three answers.
 *
 * Nothing here NAMES a weak hour or day. The weekly chart only says "most
 * challenging" when the weekday law is solid (it passed the chance test in
 * rules.ts) — a month holds four of each weekday, and naming one from that
 * would be reading noise as a pattern.
 *
 * Pure.
 */

/** Answered promises needed before any chart is drawn. */
export const MIN_FOR_CHARTS = 10
/** Blocker taps needed before "what gets in the way" is shown. */
export const MIN_BLOCKERS = 3

export interface Bar { label: string; kept: number; answered: number }

export interface PatternCharts {
  /** Eight 3-hour slots from midnight: when the promise was made. */
  byHour: Bar[] | null
  /** Monday first. */
  byWeekday: Bar[] | null
  /** Only from a solid weekday law: the day it found weakest. */
  hardestDay: string | null
  /** Their own "what got in the way" taps on misses, most first. */
  blockers: { label: string; count: number }[] | null
}

const HOUR_LABELS = ['12A', '3A', '6A', '9A', '12P', '3P', '6P', '9P']
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
/** rules.ts weekday is 0 = Sunday; the chart starts on Monday. */
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0]

export function patternCharts(input: PatternInput, patterns: readonly Pattern[]): PatternCharts {
  const answered = input.promises.filter(p => p.kept !== null)
  const enough = answered.length >= MIN_FOR_CHARTS

  const bar = (label: string, rows: typeof answered): Bar =>
    ({ label, kept: rows.filter(p => p.kept === true).length, answered: rows.length })

  const byHour = enough
    ? HOUR_LABELS.map((label, i) => bar(label, answered.filter(p => Math.floor(p.hour / 3) === i)))
    : null
  const byWeekday = enough
    ? MONDAY_FIRST.map((wd, i) => bar(DAY_LABELS[i], answered.filter(p => p.weekday === wd)))
    : null

  const weekdayLaw = patterns.find(p => p.kind === 'weekday' && p.strength === 'solid')
  const hardestDay = weekdayLaw && weekdayLaw.groups.length === 2
    ? [...weekdayLaw.groups].sort((a, b) => a.rate - b.rate)[0].label
    : null

  const label = input.reasonLabel ?? ((k: string) => k)
  const counts = new Map<string, number>()
  for (const p of answered) {
    if (p.kept === false && p.blocker) counts.set(p.blocker, (counts.get(p.blocker) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  const blockers = total >= MIN_BLOCKERS
    ? [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([key, count]) => ({ label: label(key), count }))
    : null

  return { byHour, byWeekday, hardestDay, blockers }
}
