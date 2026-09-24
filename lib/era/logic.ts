/**
 * Era arithmetic. Pure — no Prisma, no clock except what's passed in — so the
 * rules that decide what the home card says are all testable without a DB.
 *
 * Every "day" here is a YYYY-MM-DD string in the USER's timezone (see
 * lib/assessment/service.ts localDay). Comparing those strings as calendar
 * dates is the whole trick: a user in Hawaii and one in Tokyo each get their
 * own midnight, and nothing here ever converts through server time.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Midnight UTC for a YYYY-MM-DD — only ever used to diff two such days. */
function dayToUtc(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Whole calendar days from `a` to `b` (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((dayToUtc(b) - dayToUtc(a)) / DAY_MS)
}

/** The calendar day before `day`. */
export function previousDay(day: string): string {
  return new Date(dayToUtc(day) - DAY_MS).toISOString().slice(0, 10)
}

/** The day after. For a promise written the night before it's due. */
export function nextDay(day: string): string {
  return new Date(dayToUtc(day) + DAY_MS).toISOString().slice(0, 10)
}

/** 1-based day of the era. Day 1 is the day it started. */
export function eraDayNumber(startDay: string, today: string): number {
  return Math.max(1, daysBetween(startDay, today) + 1)
}

/** Past its last day. The era is over, even though its row still says active. */
export function isEraComplete(startDay: string, lengthDays: number, today: string): boolean {
  return eraDayNumber(startDay, today) > lengthDays
}

export interface PromiseLite {
  local_day: string
  kept: boolean | null
}

export interface EraStats {
  /** Promises made, any outcome. */
  made: number
  /** Promises with a yes/no answer. */
  answered: number
  kept: number
  /**
   * kept / answered, 0–100, or null before anything has been answered.
   * Unanswered days are excluded, not counted as misses: forgetting to tap
   * at night is not the same as breaking a promise, and punishing it would
   * teach people to stop making them.
   */
  keptPercent: number | null
  /** Consecutive days, ending today or yesterday, with a promise made. */
  promiseStreak: number
}

export function computeStats(promises: PromiseLite[], today: string): EraStats {
  const made = promises.length
  const answeredRows = promises.filter(p => p.kept !== null)
  const kept = answeredRows.filter(p => p.kept === true).length
  const answered = answeredRows.length

  const days = new Set(promises.map(p => p.local_day))
  // A streak survives until the end of today: not having promised YET today
  // doesn't break it, so count back from yesterday when today is still open.
  let cursor = days.has(today) ? today : previousDay(today)
  let promiseStreak = 0
  while (days.has(cursor)) {
    promiseStreak++
    cursor = previousDay(cursor)
  }

  return {
    made,
    answered,
    kept,
    keptPercent: answered > 0 ? Math.round((kept / answered) * 100) : null,
    promiseStreak,
  }
}

/**
 * What the home card should be asking for right now, in priority order.
 *
 *  - `check_yesterday` yesterday's promise was never answered. Ask that first
 *                      — it's the one moment the answer is still honest.
 *  - `complete`       the era ran its length; offer the summary and a next one.
 *  - `promise`        nothing promised today yet.
 *  - `check`          promised today; ask whether it was kept. The card shows
 *                      this softly before evening and plainly after.
 *  - `done`           promised and answered. Nothing left to do today.
 */
export type EraStep = 'complete' | 'check_yesterday' | 'promise' | 'check' | 'done'

export function eraStep(args: {
  startDay: string
  lengthDays: number
  today: string
  todayPromise: PromiseLite | null
  yesterdayPromise: PromiseLite | null
}): EraStep {
  const { startDay, lengthDays, today, todayPromise, yesterdayPromise } = args
  // Yesterday first, even on the morning after the last day: day 30's answer
  // belongs in the summary, so ask for it before showing one.
  const yesterday = previousDay(today)
  const yesterdayInEra =
    daysBetween(startDay, yesterday) >= 0 && eraDayNumber(startDay, yesterday) <= lengthDays
  if (yesterdayPromise && yesterdayPromise.kept === null && yesterdayInEra) {
    return 'check_yesterday'
  }
  if (isEraComplete(startDay, lengthDays, today)) return 'complete'
  if (!todayPromise) return 'promise'
  if (todayPromise.kept === null) return 'check'
  return 'done'
}

/** Local hour from which the card asks "did you keep it?" plainly. */
export const CHECK_IN_FROM_HOUR = 17

/**
 * The four stages of an era. The card's line and the coach's tone move with
 * them — "you're not starting anymore" only lands if it's true.
 *
 * Boundaries are by week for a 30-day era (1–7, 8–14, 15–21, 22–30) and scale
 * proportionally for any other length.
 */
export type EraStageKey = 'starting' | 'building' | 'maintaining' | 'becoming'

export interface EraStage {
  key: EraStageKey
  label: string
  /** The line under the era title on the card. */
  line: string
  /** How the coach should pitch its replies at this stage. */
  coachNote: string
  /**
   * 1–4. The four stages were already a 30-day programme — a week each,
   * with the coach's pitch moving through them — but nothing ever SAID so,
   * so it read as a themed streak. The number is what makes it a phase.
   */
  phase: 1 | 2 | 3 | 4
  /** What this phase asks of you, in one line, on the card. */
  asks: string
  /**
   * How hard the phase's missions should feel. Derived from the phase
   * rather than authored per mission: 240 hand-written difficulty labels
   * would be 240 opinions to maintain, and the phase is the honest answer
   * — the same mission is a different ask in week one and week three.
   */
  difficulty: 'light' | 'moderate' | 'hard'
}

/** ●●○ — how many of three dots a difficulty fills. */
export const DIFFICULTY_DOTS: Record<EraStage['difficulty'], number> = {
  light: 1,
  moderate: 2,
  hard: 3,
}

export const ERA_STAGES: Record<EraStageKey, EraStage> = {
  starting: {
    key: 'starting',
    label: 'Starting',
    line: 'You said it. Now you prove it.',
    coachNote: 'Stage: starting (week 1). Make it feel doable. Small wins build the habit.',
    phase: 1,
    asks: 'Clear the way and make one promise you cannot talk yourself out of.',
    difficulty: 'light',
  },
  building: {
    key: 'building',
    label: 'Building',
    line: 'The first week is behind you. Keep stacking days.',
    coachNote: 'Stage: building (week 2). The novelty is wearing off — this is where it becomes real.',
    phase: 2,
    asks: 'Keep it going on the days you do not feel like it. That is the whole phase.',
    difficulty: 'moderate',
  },
  maintaining: {
    key: 'maintaining',
    label: 'Maintaining',
    line: "You're not starting anymore. You're becoming consistent.",
    coachNote: 'Stage: maintaining (week 3). Expect the mid-point dip; consistency matters more than intensity now.',
    phase: 3,
    asks: 'Take on the thing you have been avoiding. This is the week that earns the era.',
    difficulty: 'hard',
  },
  becoming: {
    key: 'becoming',
    label: 'Becoming',
    line: 'This is who you are now. Finish like it.',
    coachNote: 'Stage: becoming (final stretch). Speak to who they are becoming, not what they are trying.',
    phase: 4,
    asks: 'Finish like someone this is already true of. No new heroics — just the days.',
    difficulty: 'moderate',
  },
}

/**
 * The day range of a phase, 1-based and inclusive, for any era length.
 * Mirrors the boundaries eraStage uses, so the two can never drift.
 */
export function phaseRange(phase: 1 | 2 | 3 | 4, lengthDays: number): { from: number; to: number } {
  const bounds = [0, 7 / 30, 14 / 30, 21 / 30, 1]
  const dayAt = (f: number) => Math.min(lengthDays, Math.max(1, Math.round(f * lengthDays) + 1))
  const from = phase === 1 ? 1 : dayAt(bounds[phase - 1])
  const to = phase === 4 ? lengthDays : dayAt(bounds[phase]) - 1
  return { from, to: Math.max(from, to) }
}

export function eraStage(day: number, lengthDays: number): EraStage {
  // Scale a 30-day week grid to any length: day 8 of 30 → 8/30 ≈ 0.267.
  const f = (Math.min(Math.max(day, 1), lengthDays) - 1) / lengthDays
  if (f < 7 / 30) return ERA_STAGES.starting
  if (f < 14 / 30) return ERA_STAGES.building
  if (f < 21 / 30) return ERA_STAGES.maintaining
  return ERA_STAGES.becoming
}

/** Today's mission from a bank, day 1 = index 0; wraps if the era outlasts the bank. */
export function missionForDay(bank: readonly string[] | undefined, day: number): string | null {
  if (!bank || bank.length === 0) return null
  return bank[(Math.max(day, 1) - 1) % bank.length]
}

/**
 * Did this era actually finish?
 *
 * Two conditions, and the second is the one that matters: the era ran past
 * its last day AND was LIVED. An era nobody touched for a month has run its
 * course by the calendar, and calling that "finished" would let somebody
 * collect completions by starting eras and ignoring them.
 *
 * Extracted here because three places were about to answer this question:
 * the achievement stats, the XP award, and now the count shown to the
 * reader. Two of them agreeing and the third drifting is how an app comes
 * to tell you this is your third era while giving you a badge for your
 * second.
 *
 * Pure. `endDay` is today for an era still running, or the day it ended.
 */
export function eraFinished(args: {
  startDay: string
  lengthDays: number
  endDay: string
  /** Promises MADE, not kept. Finishing is about showing up, not scoring. */
  promisesMade: number
  minPromises: number
}): boolean {
  const ranItsCourse = eraDayNumber(args.startDay, args.endDay) > args.lengthDays
  return ranItsCourse && args.promisesMade >= args.minPromises
}

/**
 * "third", for "Your third era".
 *
 * Words to ten, then digits — "your 14th era" reads fine and "your
 * fourteenth era" does not. Returns null below 2: "your first era" on the
 * day you finish your first one is a strange thing to be told, and the
 * caller should say nothing instead.
 */
const ORDINALS = [
  '', '', 'second', 'third', 'fourth', 'fifth',
  'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
]

export function eraOrdinal(count: number): string | null {
  if (!Number.isInteger(count) || count < 2) return null
  if (count <= 10) return ORDINALS[count]
  const suffix = count % 100 >= 11 && count % 100 <= 13
    ? 'th'
    : ['th', 'st', 'nd', 'rd'][count % 10] ?? 'th'
  return `${count}${suffix}`
}
