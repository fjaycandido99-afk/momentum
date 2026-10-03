import { findPatterns, type PatternInput, type PatternKind } from './rules'

/**
 * The laws an era taught — for its Era Record.
 *
 * A law LEARNED in an era is a pattern that is solid on the record up to the
 * era's last day, and was not solid on the record up to the day before it
 * began. Both are worked out by the same engine over the same lookback the
 * live page uses, so the era report never says something /patterns didn't.
 * The wording (and its counts) is frozen as of the era's last day.
 *
 * Disciplines are left out: their counts are a rolling "last four weeks"
 * that can't be rewound to an earlier day.
 *
 * Pure.
 */

/** Same lookback as lib/patterns/server. */
export const LOOKBACK_DAYS = 180

export interface EraLaw {
  id: string
  kind: PatternKind
  headline: string
  detail: string
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** The record as it stood at the end of `day`: nothing after it, nothing older than the lookback. */
export function patternInputAsOf(input: PatternInput, day: string): PatternInput {
  const from = addDays(day, -LOOKBACK_DAYS + 1)
  const inside = (d: string) => d >= from && d <= day
  return {
    ...input,
    promises: input.promises.filter(p => inside(p.day)),
    moods: input.moods.filter(m => inside(m.day)),
    guideMoods: input.guideMoods.filter(g => inside(g.day)),
    wellness: (input.wellness ?? []).filter(w => inside(w.day)),
    guidedDays: (input.guidedDays ?? []).filter(inside),
    disciplines: [],
    today: day,
  }
}

function solidIds(input: PatternInput): Set<string> {
  return new Set(findPatterns(input, Infinity).patterns.filter(p => p.strength === 'solid').map(p => p.id))
}

export function lawsLearned(input: PatternInput, startDay: string, endDay: string): EraLaw[] {
  const before = solidIds(patternInputAsOf(input, addDays(startDay, -1)))
  return findPatterns(patternInputAsOf(input, endDay))
    .patterns
    .filter(p => p.strength === 'solid' && !before.has(p.id))
    .map(p => ({ id: p.id, kind: p.kind, headline: p.headline, detail: p.detail }))
}
