import { isDueOn, weekdayOf, type PracticeLite } from './logic'

/**
 * What Voxu has actually noticed about someone.
 *
 * The rule for this whole file: every line is a COUNT of rows that exist,
 * with its denominator in the sentence. No score, no percentage on its own,
 * no cause. "You miss Fridays more than any other day — 3 of the last 4" is
 * something a person can check against their own memory and disagree with,
 * which is what makes it worth reading. "Your consistency is 72%" is not.
 *
 * Nothing appears until there is enough of it. Each pattern carries its own
 * threshold, and below that the block says what it is still waiting for
 * rather than filling the space with something weaker — an insight nobody
 * can trust costs more than an empty panel.
 *
 * Pure: logs, promises and today go in; lines come out.
 */

export interface PracticePattern {
  id: string
  /** The sentence, counts included. */
  line: string
  /** Sort order — higher is more useful to read first. */
  weight: number
}

export interface PatternLog {
  practiceId: string
  day: string
  done: boolean
  minimumOnly: boolean
}

export interface PatternInput {
  today: string
  practices: (PracticeLite & { presetKey: string })[]
  logs: PatternLog[]
  /** Era promises in the window: the day and whether it was kept. */
  promises: { day: string; kept: boolean | null }[]
  /** Guided exercise runs: started, and whether finished. */
  exercises: { day: string; completed: boolean }[]
}

/** Answered days needed before any weekday claim. */
export const MIN_WEEKDAY_SAMPLE = 4
/** Missed sessions needed before talking about coming back. */
export const MIN_AFTER_MISS = 3
/** Days needed before comparing two features to each other. */
export const MIN_OVERLAP = 6

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * The weekday they keep least, and the one they keep most.
 *
 * Answered days only, on both sides of every fraction — counting silence as
 * a miss would mean the app telling someone about a Friday they never
 * reported on.
 */
function weekdayLines(input: PatternInput): PracticePattern[] {
  const tally = new Map<number, { kept: number; of: number }>()
  for (const log of input.logs) {
    const weekday = weekdayOf(log.day)
    const row = tally.get(weekday) ?? { kept: 0, of: 0 }
    row.of++
    if (log.done) row.kept++
    tally.set(weekday, row)
  }

  const eligible = [...tally.entries()].filter(([, row]) => row.of >= MIN_WEEKDAY_SAMPLE)
  if (eligible.length < 2) return []

  const out: PracticePattern[] = []
  const worst = eligible.reduce((a, b) => (b[1].kept / b[1].of < a[1].kept / a[1].of ? b : a))
  const best = eligible.reduce((a, b) => (b[1].kept / b[1].of > a[1].kept / a[1].of ? b : a))

  if (worst[1].kept < worst[1].of) {
    const missed = worst[1].of - worst[1].kept
    out.push({
      id: 'weak_day',
      line: `${WEEKDAYS[worst[0]]}s are your hardest — you missed ${missed} of the last ${worst[1].of}.`,
      weight: 90,
    })
  }
  if (best[0] !== worst[0] && best[1].kept === best[1].of) {
    out.push({
      id: 'best_day',
      line: `${WEEKDAYS[best[0]]}s you never miss — ${best[1].kept} of ${best[1].of} kept.`,
      weight: 70,
    })
  }
  return out
}

/**
 * How often the floor saved a day.
 *
 * The most Voxu-specific number there is: days that would have been a miss
 * and became a kept day because the minimum existed. It is the argument for
 * the whole mechanism, and it is a plain count.
 */
function minimumRescue(input: PatternInput): PracticePattern | null {
  const rescued = input.logs.filter(l => l.done && l.minimumOnly).length
  if (rescued < 3) return null
  return {
    id: 'minimum_rescue',
    line: `The minimum saved ${rescued} ${rescued === 1 ? 'day' : 'days'} — you showed up small instead of not at all.`,
    weight: 100,
  }
}

/**
 * Coming back after a miss.
 *
 * Counted per practice: after an answered miss, was the NEXT due day kept?
 * This is the number that matters most in an app about consistency, because
 * everybody misses and the difference is what happens next.
 */
function afterMiss(input: PatternInput): PracticePattern | null {
  const byPractice = new Map<string, Map<string, PatternLog>>()
  for (const log of input.logs) {
    const map = byPractice.get(log.practiceId) ?? new Map()
    map.set(log.day, log)
    byPractice.set(log.practiceId, map)
  }

  let cameBack = 0
  let chances = 0

  for (const practice of input.practices) {
    const logs = byPractice.get(practice.id)
    if (!logs) continue
    for (const [day, log] of logs) {
      if (log.done) continue
      // The next due day after the miss, within a fortnight.
      let cursor = day
      let next: PatternLog | undefined
      for (let i = 0; i < 14; i++) {
        cursor = nextDayOf(cursor)
        if (cursor > input.today) break
        if (!isDueOn(practice, cursor)) continue
        next = logs.get(cursor)
        break
      }
      if (!next) continue
      chances++
      if (next.done) cameBack++
    }
  }

  if (chances < MIN_AFTER_MISS) return null
  return {
    id: 'after_miss',
    line: `After a miss you came back the next time ${cameBack} of ${chances} times.`,
    weight: 95,
  }
}

/**
 * Whether the days they train are also the days they keep their promise.
 *
 * Co-occurrence, said as co-occurrence. Not "training makes you keep
 * promises" — the app has no way to know which way that runs, and saying so
 * would be inventing a mechanism to sound clever.
 */
function withPromises(input: PatternInput): PracticePattern | null {
  const keptPractice = new Set(input.logs.filter(l => l.done).map(l => l.day))
  const answered = input.promises.filter(p => p.kept !== null && keptPractice.has(p.day))
  if (answered.length < MIN_OVERLAP) return null
  const kept = answered.filter(p => p.kept).length
  return {
    id: 'with_promises',
    line: `On the days you kept a discipline, you also kept your promise ${kept} of ${answered.length} times.`,
    weight: 80,
  }
}

/** How often a started guided session gets finished. */
function exerciseFinish(input: PatternInput): PracticePattern | null {
  if (input.exercises.length < MIN_OVERLAP) return null
  const finished = input.exercises.filter(e => e.completed).length
  return {
    id: 'exercise_finish',
    line: `You finish the day's practice ${finished} of the ${input.exercises.length} times you start it.`,
    weight: 60,
  }
}

/** One day forward, by string arithmetic. */
function nextDayOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + 86400000).toISOString().slice(0, 10)
}

/** How many answered days there are, for the "still collecting" line. */
export function answeredCount(input: PatternInput): number {
  return input.logs.length
}

/**
 * The block's contents: the strongest few, or nothing.
 *
 * Capped at three. A wall of observations reads as a dashboard, and the
 * point of this panel is that you believe what it says.
 */
export function findPracticePatterns(input: PatternInput): PracticePattern[] {
  const found = [
    minimumRescue(input),
    afterMiss(input),
    withPromises(input),
    exerciseFinish(input),
    ...weekdayLines(input),
  ].filter((p): p is PracticePattern => p !== null)

  return found.sort((a, b) => b.weight - a.weight).slice(0, 3)
}

/**
 * What it is still waiting for, when it has nothing.
 *
 * Says the actual requirement rather than a progress bar with no meaning:
 * somebody who knows it needs four answered Fridays can go and produce
 * four answered Fridays.
 */
export function patternsPending(input: PatternInput): string {
  const answered = answeredCount(input)
  if (answered === 0) {
    return 'Answer your disciplines for a few days and this fills in — the first thing it looks for is what the minimum saved.'
  }
  if (answered < MIN_WEEKDAY_SAMPLE * 2) {
    return `${answered} answered ${answered === 1 ? 'day' : 'days'} so far. A few more and the weekdays start to say something.`
  }
  return 'Nothing worth reporting yet — no weekday or pattern has enough behind it to be worth your trust.'
}
