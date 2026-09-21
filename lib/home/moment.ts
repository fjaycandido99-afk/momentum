import type { LoopStep } from '@/lib/era/day-loop'

/**
 * The one interstitial per app open, and what it should be about.
 *
 * There used to be a quote, on a timer, forever. Then a quote, once a day.
 * Neither was the right question: the slot is fine — a single thing on
 * opening the app — it was the CONTENT that was always the same. So one
 * moment per open, and it's about whatever is actually open:
 *
 *   something the era is waiting for  →  the journal, if today is unwritten
 *   →  the quote or question
 *
 * Pure: the loop step, whether the journal is written and what was shown
 * last time go in; a kind comes out.
 */

export type MomentKind = 'era' | 'journal' | 'spark'

/** Steps where something is genuinely waiting for the user. */
const OPEN_STEPS: LoopStep[] = ['state', 'promise', 'check', 'check_yesterday']

export interface MomentInput {
  /** Their era's loop step, or null when there is no era. */
  loopStep: LoopStep | null
  hasJournalToday: boolean
  /** What this slot showed last time, so it doesn't repeat itself. */
  lastKind: MomentKind | null
}

export function pickMoment(input: MomentInput): MomentKind {
  const eraOpen = !!input.loopStep && OPEN_STEPS.includes(input.loopStep)

  // An open commitment always wins, even twice running: it is the user's own
  // unfinished business, not something the app decided to say.
  if (eraOpen) return 'era'

  const wantsJournal = !input.hasJournalToday
  // Between the other two, don't say the same kind twice in a row — a
  // journal prompt skipped this morning is nagging by lunchtime.
  if (wantsJournal && input.lastKind !== 'journal') return 'journal'
  if (input.lastKind === 'spark' && wantsJournal) return 'journal'
  return 'spark'
}

/**
 * How often each kind may appear.
 *
 * The era and journal moments are about something of the user's that is
 * open right now, so they belong on every app open — that is the point of
 * opening the app, and both stop by themselves the moment the thing is done.
 * A quote is waiting for nobody, so it gets a daily ceiling. The difference
 * is whether the content is about them or about us.
 */
export function momentAllowed(kind: MomentKind, state: { sparksToday: number }): boolean {
  return kind === 'spark' ? state.sparksToday < SPARK_PER_DAY : true
}

/**
 * How many quotes a day, at most.
 *
 * One per app open is already the hard limit for the slot, so this is a
 * ceiling on top of that: four separate opens can each carry a quote, and a
 * fifth won't. It exists so that a day spent in and out of the app does not
 * become a day of quotes.
 */
export const SPARK_PER_DAY = 4

/**
 * Pure: how many quotes have been shown today, from a stored "day:count".
 *
 * A value from another day reads as zero, and so does anything
 * unparseable — the failure mode is one extra quote, never a silent slot.
 */
export function parseSparkCount(raw: string | null, today: string): number {
  if (!raw) return 0
  const [day, count] = raw.split(':')
  if (day !== today) return 0
  const n = Number(count)
  return Number.isInteger(n) && n > 0 ? n : 0
}

/** Pure: what to store after showing one. */
export function nextSparkCount(raw: string | null, today: string): string {
  return `${today}:${parseSparkCount(raw, today) + 1}`
}

/** What the era moment says, by step. One line, one action. */
export function eraMomentCopy(step: LoopStep): { line: string; action: string } | null {
  switch (step) {
    case 'state':
      return { line: 'Before anything else — where are you today?', action: 'Check in' }
    case 'promise':
      return { line: 'Today doesn’t have a promise yet.', action: 'Make it' }
    case 'check':
      return { line: 'You made a promise today. Did you keep it?', action: 'Answer' }
    case 'check_yesterday':
      return { line: 'Yesterday is still open.', action: 'Answer it' }
    default:
      // 'act', 'prepare', 'ready', 'complete' — nothing is waiting, so this
      // slot has no business interrupting with them.
      return null
  }
}
