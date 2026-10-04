/**
 * Two things Voxu can notice from the record, beyond laws and runs. Pure.
 *
 *   sample  A free account's one "Premium insight, on us" — a single line
 *           from their own rhythm or blocker counts, said once, from era
 *           day 7. Counts only: never "significantly", never a cause.
 *   gap     Where their past eras slipped. Per finished era, the first day
 *           that began two days in a row without a kept promise. When two
 *           or more past eras put that day inside the same three days, Voxu
 *           says so the day BEFORE — in the current era, if it hasn't
 *           slipped yet. Silent with fewer than two finished eras.
 */

import type { PatternCharts } from '@/lib/patterns/charts'

/** Smallest group either side of a comparison worth saying out loud. */
export const SAMPLE_MIN = 3
/** Era day from which the free sample may appear. */
export const SAMPLE_FROM_DAY = 7

const SLOT_TIME = ['midnight', '3 AM', '6 AM', '9 AM', 'noon', '3 PM', '6 PM', '9 PM']

/**
 * One line from the charts, or null. Morning (before noon) against evening
 * (from 6 PM) when both have enough answered and they differ by at least a
 * quarter; otherwise the blocker they tapped most.
 */
export function sampleInsight(charts: PatternCharts | null | undefined): string | null {
  if (!charts) return null
  if (charts.byHour && charts.byHour.length === 8) {
    const sum = (from: number, to: number) => charts.byHour!.slice(from, to).reduce(
      (a, b) => ({ kept: a.kept + b.kept, answered: a.answered + b.answered }), { kept: 0, answered: 0 })
    const am = sum(0, 4)
    const pm = sum(6, 8)
    if (am.answered >= SAMPLE_MIN && pm.answered >= SAMPLE_MIN
      && Math.abs(am.kept / am.answered - pm.kept / pm.answered) >= 0.25) {
      return `Promises you made before noon: kept ${am.kept} of ${am.answered}. From ${SLOT_TIME[6]}: ${pm.kept} of ${pm.answered}.`
    }
  }
  const top = charts.blockers?.[0]
  if (top && top.count >= SAMPLE_MIN) {
    return `When a promise didn't happen, the thing you tapped most was "${top.label}" — ${top.count} times.`
  }
  return null
}

export interface EraDay {
  day: number
  kept: boolean | null
}

/**
 * The first era day that began two days in a row without a kept promise
 * (missed, or no promise), up to `throughDay`. Null if it never happened.
 * Day 1 counts like any other.
 */
export function firstGapDay(days: readonly EraDay[], throughDay: number): number | null {
  const kept = new Set(days.filter(d => d.kept === true).map(d => d.day))
  for (let d = 1; d < throughDay; d++) {
    if (!kept.has(d) && !kept.has(d + 1)) return d
  }
  return null
}

export interface GapWarning {
  /** The day it's likely to get harder: tomorrow. */
  day: number
  /** The past eras' gap days, oldest first — said back as they were. */
  past: number[]
  line: string
  opener: string
}

/**
 * Warn the day before, when 2+ past eras slipped within the same 3 days and
 * this one hasn't slipped yet. `today` is the current era day; `days` its
 * record so far (today excluded from the gap check — it isn't over).
 */
export function gapWarning(pastGapDays: readonly number[], today: number, days: readonly EraDay[]): GapWarning | null {
  const past = pastGapDays.filter(d => Number.isInteger(d) && d > 1)
  if (past.length < 2) return null
  const recent = past.slice(-3)
  const lo = Math.min(...recent)
  const hi = Math.max(...recent)
  if (hi - lo > 2) return null
  if (today !== lo - 1) return null
  if (firstGapDay(days, today) !== null) return null
  const said = recent.map(d => `day ${d}`).join(recent.length === 2 ? ' and ' : ', ')
  const n = recent.length === 2 ? 'two' : 'three'
  return {
    day: lo,
    past: recent,
    line: `In your last ${n} eras, two days slipped by in a row starting ${said}. Tomorrow is day ${lo}.`,
    opener: `In my last ${n} eras, things slipped around day ${lo}, and tomorrow is day ${lo}. Help me make tomorrow's promise one I'll keep.`,
  }
}

// ── The evening before a hard weekday ─────────────────────────────────────

/** The worst weekday of their SOLID weekday law (lib/patterns), as counts. */
export interface WeakDay {
  label: string
  hits: number
  of: number
}

/** From this local hour, "tomorrow" is close enough to plan for tonight. */
export const WEAK_EVE_FROM_HOUR = 15
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * The heads-up, the evening before their hard weekday: their own counts,
 * no verdict about them, and an offer to make tomorrow's promise one they'll
 * keep. Only a SOLID law (it passed the chance test) is ever acted on.
 */
export function weakDayEve(weak: WeakDay | null | undefined, now: Date): { day: string; line: string; opener: string } | null {
  if (!weak || weak.of <= 0 || now.getHours() < WEAK_EVE_FROM_HOUR) return null
  const tomorrow = WEEKDAY_NAMES[(now.getDay() + 1) % 7]
  if (tomorrow !== weak.label) return null
  return {
    day: tomorrow,
    line: `Tomorrow is ${tomorrow}. Your record shows ${tomorrow}s are harder for you: ${weak.hits} of ${weak.of} kept.`,
    opener: `Tomorrow is ${tomorrow}, and my ${tomorrow}s have been harder — ${weak.hits} of ${weak.of} kept. Help me plan a promise for tomorrow I'll actually keep.`,
  }
}

/** True when tomorrow is their hard weekday — the Tomorrow widget suggests the smaller promise. */
export function tomorrowIsWeak(weak: WeakDay | null | undefined, now: Date): boolean {
  return !!weak && WEEKDAY_NAMES[(now.getDay() + 1) % 7] === weak.label
}

// ── Your week, on Home (Sunday evening / Monday) ─────────────────────────

/** When the week moment may show: Sunday from 5pm, or any time Monday. */
export function isWeekMomentTime(now: Date): boolean {
  return (now.getDay() === 0 && now.getHours() >= 17) || now.getDay() === 1
}

/**
 * "This week: 5 of 6 promises kept." from the running era's own days — the
 * last seven era days up to today. Counts only; null with nothing answered.
 */
export function eraWeekLine(days: readonly EraDay[], today: number): string | null {
  const recent = days.filter(d => d.day <= today && d.day > today - 7)
  const answered = recent.filter(d => d.kept !== null)
  if (!answered.length) return null
  const kept = answered.filter(d => d.kept === true).length
  return `This week: ${kept} of ${answered.length} promises kept.`
}
