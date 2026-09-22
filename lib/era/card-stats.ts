/**
 * The numbers on the era share card.
 *
 * Every figure is a count with its denominator — "14 of 16 promises kept",
 * never "88%" on its own. A percentage without the count behind it is how a
 * two-day era reads the same as a thirty-day one.
 *
 * Two lines, two meanings:
 * - PROOF is the day-level record from /proof: a day counts if anything was
 *   kept on it (the promise, a practice at its minimum, the guided exercise).
 *   Kept beats missed, as on the grid.
 * - PROMISES is the promise record alone, out of the promises answered.
 *
 * The promise streak is deliberately not on the card: it counts days a
 * promise was MADE, and on a card anyone would read "17-day streak" as
 * seventeen kept.
 *
 * Pure: counts in, lines out.
 */

export interface CardStatsInput {
  promisesKept: number
  promisesAnswered: number
  /** Era days so far with anything kept, or null when it couldn't be read. */
  proofDays: number | null
  /** The denominator for proofDays — see cardDaysSoFar. */
  daysSoFar: number
}

/**
 * How many era days can be judged yet.
 *
 * Today only counts once something has been kept on it: at 8am nothing is
 * late, and putting an open day in the denominator would make every card
 * shared in the morning look like a missed day.
 */
export function cardDaysSoFar(day: number, lengthDays: number, todayHasProof: boolean): number {
  const elapsed = Math.min(Math.max(0, Math.floor(day)), lengthDays)
  const todayOpen = day >= 1 && day <= lengthDays && !todayHasProof
  return Math.max(0, elapsed - (todayOpen ? 1 : 0))
}

/** The stat lines, or [] when the person chose to share without numbers. */
export function cardStatLines(s: CardStatsInput, showNumbers: boolean): string[] {
  if (!showNumbers) return []
  const lines: string[] = []
  if (s.proofDays !== null && s.proofDays > 0 && s.daysSoFar > 0) {
    const proof = Math.min(s.proofDays, s.daysSoFar)
    lines.push(`Proof on ${proof} of ${s.daysSoFar} ${s.daysSoFar === 1 ? 'day' : 'days'}`)
  }
  if (s.promisesAnswered > 0) {
    lines.push(`${s.promisesKept} of ${s.promisesAnswered} ${s.promisesAnswered === 1 ? 'promise' : 'promises'} kept`)
  }
  return lines
}
