import type { PracticeDomain } from '@/lib/practices/presets'

/**
 * Turning a finished era into something you keep.
 *
 * Day 31 used to offer one thing: start another era. So the month somebody
 * just spent promising the same sort of thing daily ended with no way to
 * carry it, and Voxu's actual answer to "is 30 days enough?" — a discipline,
 * with a schedule and a floor — was never suggested at the one moment it is
 * obviously the right question.
 *
 * What this file does NOT do is decide what the habit was. Two structural
 * reasons, from docs/era-continuity-scope.md: a promise is different every
 * day while a discipline is one recurring thing, and six of the eight eras
 * describe how you behave rather than what you do. So the app shows somebody
 * their own thirty days and they point at it.
 *
 * Pure.
 */

/**
 * Eras that map onto a discipline domain. Two of eight, and that is the
 * honest number.
 *
 * `gym_arc` is training and `study` is studying. `locked_in`, `discipline`,
 * `comeback`, `stoic_mode`, `confidence` and `five_am` are about HOW you
 * behave — there is no domain for "stop drifting", and guessing one would
 * put somebody's habit in the wrong room and give them the wrong how-to.
 * Unmapped eras leave the picker on its first step, which is where it
 * already starts for everyone adding a discipline by hand.
 */
export const ERA_PRACTICE_DOMAIN: Record<string, PracticeDomain | undefined> = {
  gym_arc: 'gym',
  study: 'study',
}

export interface PromiseOption {
  /** Their words, as first written. */
  text: string
  /** How many days they promised it. */
  count: number
}

/** Same promise, written twice? Case, spacing and trailing punctuation only. */
function promiseKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!]+$/, '')
}

/**
 * The promises worth offering, most-repeated first.
 *
 * Exact match after normalising case, whitespace and a trailing full stop —
 * and nothing cleverer. "Gym" and "go to the gym" stay separate, because
 * merging them would be the app deciding somebody meant the same thing on
 * two different days. That decision is theirs and the whole point of showing
 * the list.
 *
 * Ties keep the order they were first written, so the list is stable between
 * renders rather than shuffling on every open.
 */
export function keepOptions(
  promises: readonly { text: string }[],
  limit = 5,
): PromiseOption[] {
  const seen = new Map<string, { text: string; count: number; first: number }>()

  promises.forEach((p, i) => {
    const text = typeof p?.text === 'string' ? p.text.trim().replace(/\s+/g, ' ') : ''
    if (!text) return
    const key = promiseKey(text)
    if (!key) return
    const hit = seen.get(key)
    if (hit) hit.count += 1
    else seen.set(key, { text, count: 1, first: i })
  })

  return [...seen.values()]
    .sort((a, b) => b.count - a.count || a.first - b.first)
    .slice(0, Math.max(0, limit))
    .map(({ text, count }) => ({ text, count }))
}

/**
 * A promise, cut down to fit a discipline's name.
 *
 * A promise is a sentence ("I'll finish the thing I've been avoiding before
 * lunch"); a label is a short name, capped at 40. Rather than refuse the long
 * ones — which would leave most people with no chips at all, since most real
 * promises are sentences — this trims at a WORD boundary and lands in an
 * editable field where they can see exactly what went in and fix it.
 *
 * No ellipsis: "I'll finish the thing I've been…" reads as the app quoting
 * them badly. "I'll finish the thing I've been" reads as a name they can
 * finish typing.
 */
export function labelFromPromise(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean.length <= max) return clean

  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  // A single word longer than the cap has no boundary to break on; a hard
  // cut is the only option and is still better than nothing.
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trim()
}

// ── The end of an era: how it went, said plainly ────────────────────────

export type EraOutcome = 'strong' | 'mixed' | 'poor'

/** At or above: the month held. */
export const OUTCOME_STRONG = 70
/** Below: it mostly didn't. Between the two: some of it held. */
export const OUTCOME_POOR = 40

/**
 * How the month went, from the kept percentage. No answers at all reads as
 * a month that didn't go to plan — never as a good one.
 */
export function eraOutcome(keptPercent: number | null): EraOutcome {
  if (keptPercent === null) return 'poor'
  if (keptPercent >= OUTCOME_STRONG) return 'strong'
  if (keptPercent >= OUTCOME_POOR) return 'mixed'
  return 'poor'
}

/**
 * The line above "What stays with you?". It names what happened — no
 * shame, and no celebration a bad month didn't earn. The offer itself never
 * changes: somebody who kept 4 of 28 is who a discipline's floor serves.
 */
export const OUTCOME_LINE: Record<EraOutcome, string> = {
  strong: 'You showed up this month. What should stay after it?',
  mixed: 'Some of it held. Some of it didn’t. Keep the one thing that was real.',
  poor: 'This era didn’t go the way you planned. You don’t need to keep the whole month — keep one thing that was still worth something.',
}

/**
 * Whether a promise shows how often it was made. Exact wording only, so
 * most promises were made once; a list of "1 day" under every one is noise.
 */
export const KEEP_COUNT_MIN = 2
export function showKeepCount(count: number): boolean {
  return count >= KEEP_COUNT_MIN
}

/** Enough due days in the window before "least active" means anything. */
export const LEAST_ACTIVE_MIN_DUE = 4

/**
 * When their disciplines are full: which one has been kept least over the
 * last four weeks, so the trade-off is visible. Null when nothing has
 * enough due days to say, or when it's a tie for last — then nothing is
 * singled out. The choice to remove one stays theirs.
 */
export function leastActive<T extends { id: string; done: number; of: number }>(practices: readonly T[]): T | null {
  const rated = practices.filter(p => p.of >= LEAST_ACTIVE_MIN_DUE)
  if (rated.length < 2) return null
  const rate = (p: T) => p.done / p.of
  const sorted = [...rated].sort((a, b) => rate(a) - rate(b))
  if (rate(sorted[0]) === rate(sorted[1])) return null
  return sorted[0]
}
