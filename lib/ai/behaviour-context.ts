/**
 * What the coach is allowed to know about what you DID.
 *
 * The chat has always read the journal and nothing else, so it could talk
 * about what someone wrote and had no idea whether they showed up. Meanwhile
 * the training page knew they had missed three Fridays in a row. The voice of
 * the app was its least informed surface.
 *
 * Two rules, both from the rest of the app:
 *
 *  - COUNTS WITH THEIR DENOMINATOR. "Kept 5 of 6" — never a score, never a
 *    percentage, never "consistency 83%". A number someone reads as a verdict
 *    on their character can do real harm, which is why lib/exercises/
 *    attributes.ts refuses to compute one either.
 *  - NO TEXT. Not a promise, not a journal line, not a plan row. The journal
 *    section of user-context.ts handles words, under the same consent gate.
 *    This is the shape of a week, not its contents.
 *
 * Pure. The loader lives in ./behaviour-context-server.ts.
 */

export interface BehaviourFacts {
  era: { title: string; day: number; lengthDays: number } | null
  promises: { kept: number; answered: number } | null
  /** One per active discipline, newest window first. */
  practices: { label: string; kept: number; due: number }[]
  exercises: { run: number; days: number } | null
}

/** Plain-English lines, or nothing when there is nothing worth saying. */
export function behaviourLines(facts: BehaviourFacts): string[] {
  const lines: string[] = []

  if (facts.era) {
    lines.push(`Era: ${facts.era.title}, day ${facts.era.day} of ${facts.era.lengthDays}.`)
  }

  // Only when they have actually answered some — "kept 0 of 0" reads as a
  // judgement on someone who simply started yesterday.
  if (facts.promises && facts.promises.answered > 0) {
    lines.push(
      `Daily promises: kept ${facts.promises.kept} of ${facts.promises.answered} answered.`,
    )
  }

  for (const practice of facts.practices) {
    if (practice.due === 0) continue
    lines.push(`${practice.label}: kept ${practice.kept} of ${practice.due} due.`)
  }

  if (facts.exercises && facts.exercises.run > 0) {
    lines.push(
      // A window is not a denominator. 'on 8 of the last 30 days' is both a
      // count and a scale, which is the rule the rest of the app follows.
      `Mindset exercises: finished on ${facts.exercises.run} of the last ${facts.exercises.days} days.`,
    )
  }

  return lines
}

/**
 * How the coach is told to use it.
 *
 * Explicit about the failure mode: an AI handed numbers will read them back
 * as a report, or worse, open with them. The one thing this block is for is
 * noticing — "you have kept the gym three weeks running" — not auditing.
 */
export const BEHAVIOUR_GUIDANCE = [
  'WHAT THEY HAVE ACTUALLY DONE — counts only, never the words they wrote.',
  'Refer to this the way someone who knows them would: notice the streak, ask',
  'about the day they missed, connect it to what they are saying now. Do not',
  'list it back, do not lead with it, and never use it to scold. A missed day',
  'is information, not a failing.',
].join('\n')

export function behaviourSection(facts: BehaviourFacts): string | null {
  const lines = behaviourLines(facts)
  if (lines.length === 0) return null
  return `${BEHAVIOUR_GUIDANCE}\n\n${lines.join('\n')}`
}
