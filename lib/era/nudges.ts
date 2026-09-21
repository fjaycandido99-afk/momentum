/**
 * When an era earns a push, and when it has to stay quiet.
 *
 * Two moments the loop was silent for:
 *
 *  - FINISHED. Day 30 arrived and nothing was said. Thirty days of keeping
 *    promises to yourself, and the app that asked for them didn't notice.
 *  - STOPPED. A few days of nothing, and the only push was the generic
 *    win-back, which knows nothing about the era sitting there open.
 *
 * Pure so the rules can be argued with in a test rather than discovered in
 * someone's notification tray.
 */

/** Days of silence before the era says anything about it. */
export const COMEBACK_AFTER_DAYS = 3
/**
 * Stop after this long. Past it, a nudge isn't a nudge, it's a haunting —
 * and someone who hasn't promised in three weeks has decided. Win-back
 * (which is about the app, not the era) can have them.
 */
export const COMEBACK_UNTIL_DAYS = 21
/** Never twice in a week, however long the silence runs. */
export const COMEBACK_EVERY_DAYS = 7

export interface ComebackInput {
  /** Days since their last promise, in their own timezone. */
  daysSinceLastPromise: number
  /** Days since we last sent this nudge, or null if never. */
  daysSinceLastNudge: number | null
  /**
   * They have a wake-up call set. It already rings every morning with the
   * era in it, so a second "still open" push is just noise.
   */
  wakeCallEnabled: boolean
  /** The era ran its length — that's a completion, not a comeback. */
  eraComplete: boolean
}

export function comebackDue(input: ComebackInput): boolean {
  if (input.eraComplete) return false
  if (input.wakeCallEnabled) return false
  if (input.daysSinceLastPromise < COMEBACK_AFTER_DAYS) return false
  if (input.daysSinceLastPromise > COMEBACK_UNTIL_DAYS) return false
  if (input.daysSinceLastNudge !== null && input.daysSinceLastNudge < COMEBACK_EVERY_DAYS) return false
  return true
}

/**
 * What the comeback push says. Never a scold and never a guilt trip: it
 * states the gap, and asks for something smaller than what they missed.
 */
export function comebackMessage(args: {
  eraName: string
  day: number
  lengthDays: number
  daysSinceLastPromise: number
}): { title: string; body: string } {
  const { eraName, day, lengthDays, daysSinceLastPromise } = args
  const gap = daysSinceLastPromise === 1 ? 'a day' : `${daysSinceLastPromise} days`
  return {
    title: `Your ${eraName} is still open`,
    body: `Day ${day} of ${lengthDays}, and it's been ${gap}. Make today's promise small enough that you keep it.`,
  }
}

/** What the "you finished it" push says. */
export function completionMessage(args: {
  eraName: string
  lengthDays: number
  kept: number
  answered: number
  /** Premium gets the recap letter; free is told what's there, not teased. */
  premium: boolean
}): { title: string; body: string } {
  const { eraName, lengthDays, kept, answered, premium } = args
  const record = answered > 0 ? `${kept} of ${answered} promises kept.` : 'Every day of it is yours.'
  return {
    title: `You finished your ${eraName}`,
    body: `${lengthDays} days. ${record} ${premium ? 'Your recap is ready.' : 'See what it added up to.'}`,
  }
}
