import { CHECK_IN_FROM_HOUR, type EraStep } from './logic'

/**
 * The day, as one sequence instead of five cards of equal weight.
 *
 * Everything in the loop already existed — the state check-in, the promise,
 * the mission and the practice, the evening "did you keep it", tomorrow's
 * promise written tonight. What was missing was ORDER: home showed them all
 * at once, so nothing said what to do now, and nothing said the session you
 * are in sets up the next one.
 *
 *   state → promise → do it → close it → set up tomorrow → ready
 *
 * Pure: the hour, what exists today and what was answered go in; one step
 * comes out. No clock is read here, so the whole sequence is testable.
 *
 * Two rules worth keeping:
 *  - The state check is only ever a step for someone who turned wellness on
 *    (lib/wellness). It is never inserted into the loop to nag for consent.
 *  - The loop never blocks. "Tomorrow is partially locked until you prepare
 *    it" was the original idea; locking a day behind a form is a good way to
 *    lose the day. Preparing tomorrow is the last STEP, not a gate — and
 *    once it is done the card says so, which is the actual reward.
 */

export type LoopStep =
  /** Morning, wellness on, not checked in yet. */
  | 'state'
  /** No promise for today yet. */
  | 'promise'
  /** Promised; the day is theirs until the evening. */
  | 'act'
  /** Evening, still unanswered: did you keep it? */
  | 'check'
  /** Yesterday's promise was never answered — asked before anything else. */
  | 'check_yesterday'
  /** Answered, and tomorrow is still empty. */
  | 'prepare'
  /** Answered, tomorrow written. Nothing left to do today. */
  | 'ready'
  /** The era's days are done. */
  | 'complete'

export interface LoopInput {
  /** The user's local hour, 0–23. */
  hour: number
  /** Their era's step, from eraStep — the source of truth for the promise. */
  eraStep: EraStep
  /** Wellness is on, so a state check-in is part of their loop at all. */
  wantsState: boolean
  /** Already checked in today. */
  hasState: boolean
  /** Tomorrow's promise is written. */
  hasTomorrow: boolean
}

/** Before noon a state check-in is still a morning check-in. */
export const STATE_UNTIL_HOUR = 12

export function loopStep(input: LoopInput): LoopStep {
  const { eraStep, hour } = input

  // An unanswered yesterday outranks everything, including the era ending:
  // that answer belongs in the record before any summary is drawn.
  if (eraStep === 'check_yesterday') return 'check_yesterday'
  if (eraStep === 'complete') return 'complete'

  // The state check comes first, but only in the morning and only for
  // someone who asked for it. At 4pm the useful question is the promise.
  if (input.wantsState && !input.hasState && hour < STATE_UNTIL_HOUR) return 'state'

  if (eraStep === 'promise') return 'promise'
  if (eraStep === 'check') return hour >= CHECK_IN_FROM_HOUR ? 'check' : 'act'
  return input.hasTomorrow ? 'ready' : 'prepare'
}

/** The five steps of a day, for the little progress row. */
export const LOOP_SEQUENCE: LoopStep[] = ['state', 'promise', 'act', 'check', 'prepare']

/**
 * How far through the day's loop they are, 1-based.
 *
 * `of` shrinks to four when there is no state check-in, so nobody is shown a
 * step they will never take. 'ready' is past the end — the row reads as
 * complete.
 */
export function loopProgress(step: LoopStep, wantsState: boolean): { index: number; of: number } {
  const sequence = wantsState ? LOOP_SEQUENCE : LOOP_SEQUENCE.filter(s => s !== 'state')
  const of = sequence.length
  if (step === 'ready' || step === 'complete') return { index: of, of }
  // Yesterday's unanswered promise is its own thing, not a position in today.
  if (step === 'check_yesterday') return { index: 0, of }
  const index = sequence.indexOf(step)
  return { index: index < 0 ? 0 : index + 1, of }
}

export interface LoopCopy {
  /** The small label above the line. */
  label: string
  /** What to do now, in the second person. */
  line: string
}

/**
 * What the card says at each step.
 *
 * One instruction, never a list. The line for 'ready' is the one that makes
 * the loop a loop: it names tomorrow as already set up, so the reason to
 * come back is something they did, not something we promised.
 */
export function loopCopy(step: LoopStep): LoopCopy {
  switch (step) {
    case 'state':
      return { label: 'First', line: 'Say where you are today. Four taps.' }
    case 'promise':
      return { label: 'Next', line: 'Make today’s promise.' }
    case 'act':
      return { label: 'Now', line: 'Go and do it. Voxu will ask you tonight.' }
    case 'check':
      return { label: 'Tonight', line: 'Did you keep it?' }
    case 'check_yesterday':
      return { label: 'First', line: 'Yesterday is still open. Did you keep it?' }
    case 'prepare':
      return { label: 'Last thing', line: 'Write tomorrow’s promise while today is fresh.' }
    case 'ready':
      return { label: 'Done for today', line: 'Tomorrow is ready.' }
    case 'complete':
      return { label: 'Era complete', line: 'Every day of it is in your record.' }
  }
}

/**
 * One line of advice from their own morning check-in, or null.
 *
 * Their words, not a diagnosis: it quotes what they said about themselves
 * and suggests shrinking the ask. It never changes the era's phase or its
 * difficulty — that contract belongs to the era (eraStage), and a day that
 * silently got easier because someone admitted to being tired would teach
 * them not to admit it.
 */
export function stateAdvice(state: {
  energy?: number | null
  stress?: number | null
  rested?: number | null
  mood?: number | null
} | null): string | null {
  if (!state) return null
  if ((state.energy ?? 3) <= 2 || (state.rested ?? 3) <= 2) {
    return 'You said you’re running low. Make today’s promise the smallest version that still counts.'
  }
  if ((state.stress ?? 3) >= 4) {
    return 'You said today feels heavy. One promise, and let the rest wait.'
  }
  if ((state.energy ?? 3) >= 4 && (state.mood ?? 3) >= 4) {
    return 'You’ve got something today. This is the day to take the harder one.'
  }
  return null
}
