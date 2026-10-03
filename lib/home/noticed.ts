/**
 * "Voxu noticed something" — the moment slot's rarest kind. Pure.
 *
 * It takes the place of a quote; it never adds a popup (lib/home/moment:
 * one per app open). It only says things the record shows, each ONCE:
 *
 *   law  a pattern that has just passed the chance test (lib/patterns) —
 *        "I found something in your record", with its counts.
 *   run  their kept promises in a row reaching 5, 10, 15, 20 or 30 — and
 *        the conversation it opens ASKS what's been different, rather than
 *        claiming to know why.
 *
 * At most one a day, whatever is waiting.
 */

import { SAMPLE_FROM_DAY } from './insights'

export const RUN_MILESTONES = [5, 10, 15, 20, 30]

export type Noticed =
  | { kind: 'law'; key: string; line: string; detail: string; href: string }
  | { kind: 'run'; key: string; line: string; opener: string }
  /** Where past eras slipped, the day before (lib/home/insights). */
  | { kind: 'gap'; key: string; line: string; opener: string }
  /** A free account's one Premium insight, on us. */
  | { kind: 'sample'; key: string; line: string; detail: string }

export interface EraDayKept {
  day: number
  kept: boolean | null
}

/**
 * Kept promises in a row, counting back from the latest answered day.
 * Days not answered yet at the end (today, or a night they haven't checked
 * in) are skipped; an unanswered day further back ends the run — "in a row"
 * means in a row.
 */
export function keptRun(days: readonly EraDayKept[]): number {
  const sorted = [...days].sort((a, b) => b.day - a.day)
  let i = 0
  while (i < sorted.length && sorted[i].kept === null) i++
  let n = 0
  for (; i < sorted.length && sorted[i].kept === true; i++) n++
  return n
}

export interface NoticedInput {
  run: number
  eraId: string | null
  /** Their solid laws (id + headline), when known. */
  laws: { id: string; headline: string }[]
  /** Keys already said ("law:timing", "run:<eraId>:10"). */
  seen: readonly string[]
  /** Today's era day, when in an era. */
  eraDay?: number | null
  /** The day-before warning, already decided (lib/home/insights gapWarning). */
  gap?: { line: string; opener: string } | null
  /** Free only: one line from their charts (server sends it to free only). */
  sample?: string | null
}

export function pickNoticed(input: NoticedInput): Noticed | null {
  const seen = new Set(input.seen)

  // Time-sensitive first: tomorrow is the day it tends to slip.
  if (input.gap && input.eraId && !seen.has(`gap:${input.eraId}`)) {
    return { kind: 'gap', key: `gap:${input.eraId}`, line: input.gap.line, opener: input.gap.opener }
  }

  const law = input.laws.find(l => !seen.has(`law:${l.id}`))
  if (law) {
    return {
      kind: 'law',
      key: `law:${law.id}`,
      line: 'I found something in your record.',
      detail: law.headline,
      href: '/patterns?spot=laws-list',
    }
  }

  if (input.sample && (input.eraDay ?? 0) >= SAMPLE_FROM_DAY && !seen.has('sample')) {
    return {
      kind: 'sample',
      key: 'sample',
      line: input.sample,
      detail: 'Voxu Premium keeps finding things like this in your record.',
    }
  }

  if (input.eraId) {
    const reached = [...RUN_MILESTONES].reverse().find(m => input.run >= m)
    if (reached && !seen.has(`run:${input.eraId}:${reached}`)) {
      const line = `You've kept your last ${input.run} promises in a row.`
      return {
        kind: 'run',
        key: `run:${input.eraId}:${reached}`,
        line,
        opener: `${line} What's been different about these days?`,
      }
    }
  }
  return null
}

/** Pure: the seen list after saying one, capped so it can't grow forever. */
export function rememberNoticed(seen: readonly string[], key: string): string[] {
  return [...seen.filter(k => k !== key), key].slice(-60)
}
