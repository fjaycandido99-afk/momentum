import { isDueOn, weekdayOf, type LogLite, type PracticeLite } from './logic'

/**
 * Acting on a pattern before the miss, instead of reporting it after.
 *
 * The Patterns block says "Fridays are your hardest". That is a fact about
 * the past and it changes nothing. An intervention is the same fact used
 * forwards: on a Friday, BEFORE the day is spent, Voxu says so and offers
 * the floor — because the useful response to a hard day is a smaller ask,
 * not a firmer tone.
 *
 * What it will not do:
 *  - It does not quietly lower the ask. Shrinking someone's day without
 *    telling them teaches them nothing and takes the choice away; this says
 *    what it noticed and lets them pick.
 *  - It does not scold, predict or diagnose. "You've missed 3 of the last 4
 *    Fridays" is a count they can check. "You always give up on Fridays" is
 *    a character claim, and wrong as often as not.
 *  - It says nothing about a weekday it has seen fewer than
 *    INTERVENE_MIN_DUE times, and nothing built out of unanswered days.
 *    Silence is not evidence.
 *
 * Pure: the practice, its answers and today go in; a prompt or null comes
 * out.
 */

/** Answered instances of this weekday needed before acting on it. */
export const INTERVENE_MIN_DUE = 3

export interface Intervention {
  weekday: number
  missed: number
  of: number
  /** What to say, counts included. */
  line: string
  /** The floor being offered — theirs, for this day. */
  minimum: string
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * How this weekday has actually gone, counting only answered days.
 *
 * Exported because the morning push needs the same numbers the screen
 * shows — two different counts of the same thing would be worse than
 * neither.
 */
export function weekdayRecord(
  practice: PracticeLite,
  logs: LogLite[],
  weekday: number,
): { missed: number; of: number } {
  let missed = 0
  let of = 0
  for (const log of logs) {
    if (weekdayOf(log.day) !== weekday) continue
    if (!isDueOn(practice, log.day)) continue
    of++
    if (!log.done) missed++
  }
  return { missed, of }
}

/**
 * Today's intervention, or null.
 *
 * Fires only when all of these hold: the practice is due today, today has
 * no answer yet, this weekday has enough answered history, and the misses
 * are the majority of it. Anything less and the app is guessing at someone's
 * week.
 */
export function findIntervention(
  practice: PracticeLite,
  logs: LogLite[],
  today: string,
  todaysMinimum: string,
): Intervention | null {
  if (!isDueOn(practice, today)) return null
  if (logs.some(l => l.day === today)) return null

  const weekday = weekdayOf(today)
  const record = weekdayRecord(practice, logs, weekday)
  if (record.of < INTERVENE_MIN_DUE) return null
  if (record.missed * 2 <= record.of) return null

  const minimum = todaysMinimum.trim()
  return {
    weekday,
    ...record,
    minimum,
    line: interventionLine(weekday, record, minimum),
  }
}

/**
 * The sentence.
 *
 * Names the day, gives the counts, offers the floor. No adjective about the
 * person anywhere in it.
 */
export function interventionLine(
  weekday: number,
  record: { missed: number; of: number },
  minimum: string,
): string {
  const day = `${WEEKDAYS[weekday]}s`
  // Curly apostrophe, like every other string the app shows.
  const counts = `you’ve missed ${record.missed} of the last ${record.of}`
  return minimum
    ? `${day} are your hardest — ${counts}. Today, ${minimum} counts.`
    : `${day} are your hardest — ${counts}. Do the smallest version today.`
}

/** The morning push, or null when there is nothing to say. */
export function interventionPush(
  practiceLabel: string,
  intervention: Intervention,
): { title: string; body: string } {
  return {
    title: practiceLabel,
    body: intervention.minimum
      ? `${WEEKDAYS[intervention.weekday]}s are hard for you. ${intervention.minimum} counts today.`
      : `${WEEKDAYS[intervention.weekday]}s are hard for you. Do the smallest version today.`,
  }
}
