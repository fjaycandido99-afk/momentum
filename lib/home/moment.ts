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
 * opening the app. A quote is not waiting for anybody, so it gets one turn a
 * day and then stays quiet. Same slot, two different speeds, and the
 * difference is whether the content is about them or about us.
 */
export function momentAllowed(kind: MomentKind, state: { sparkShownToday: boolean }): boolean {
  return kind === 'spark' ? !state.sparkShownToday : true
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
