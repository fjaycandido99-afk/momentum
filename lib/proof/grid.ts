/**
 * The year in proof.
 *
 * A streak is one number that a single missed day destroys. This is the
 * other thing: a calendar of the days you kept something you said you would
 * do — a promise, a practice, the day's exercise — which nothing can take
 * back. Miss a week and the week is blank; the 47 days before it are still
 * 47 days.
 *
 * Pure. Every "day" is a YYYY-MM-DD in the USER's timezone, the same
 * convention as lib/era/logic.ts, and nothing here reads a clock: today is
 * passed in. So is the history, which means the grid can be tested for a
 * year that hasn't happened yet.
 *
 * Nothing in here is computed, scored or weighted. Every number it returns
 * is a count of rows that exist.
 */

import { daysBetween, nextDay, previousDay } from '@/lib/era/logic'

/**
 * What a day says, in falling order of how much it took:
 *  - kept    they kept something they said they would do
 *  - missed  something was asked for, and the answer was no
 *  - open    something was asked for and never answered (not a failure)
 *  - quiet   nothing was asked
 *
 * "Something" is the promise, a practice, or the day's guided exercise. It
 * used to be the promise alone, which meant someone could train four days
 * running and finish an exercise every morning and still have a blank year.
 */
export type ProofState = 'kept' | 'missed' | 'open' | 'quiet'

/** One promise, as the grid needs it. */
export interface ProofPromise {
  day: string
  kept: boolean | null
}

/** One practice's answer on one day. Several can land on the same day. */
export interface ProofPractice {
  day: string
  /** True for a full session AND for the minimum — both are kept days. */
  kept: boolean
}

/** One run of a guided exercise. */
export interface ProofExercise {
  day: string
  completed: boolean
}

/** A day someone can tap. */
export interface ProofDay {
  day: string
  state: ProofState
  /**
   * How many things were kept that day — a promise, each practice, the
   * exercise. Drives how solid the dot looks: a day you did three things
   * should not look identical to a day you did one.
   */
  kept: number
  /** Inside an era's 30 days — so a blank day reads as skipped, not "no era". */
  inEra: boolean
  /** The day's mission was marked done. */
  mission: boolean
  /** They checked in on how they were (only when wellness is on). */
  checkIn: boolean
  isToday: boolean
  /** After today. Drawn as space, never as a miss. */
  future: boolean
}

/** A row of seven. Sunday first; `null` pads the first and last weeks. */
export interface ProofWeek {
  /** Month name when this row opens a month, so the year reads down the side. */
  label: string | null
  days: (ProofDay | null)[]
}

export interface ProofYear {
  year: number
  weeks: ProofWeek[]
  counts: {
    /** Days on which something was kept. THE number the page leads with. */
    proofs: number
    missed: number
    open: number
    /** Days that fell inside an era, kept or not. The denominator. */
    inEra: number
    missions: number
    /** What made up those days — each a total, not a day count. */
    promisesKept: number
    practicesKept: number
    exercisesDone: number
  }
  /** Longest run of consecutive kept days. */
  longestRun: number
  /**
   * Kept days that came after two or more days without one — coming back.
   * Only counted when there was something to come back from, i.e. an
   * earlier kept day.
   */
  comebacks: number
  firstProof: string | null
  lastProof: string | null
  /** The first day drawn — 1 January, or the month their record starts. */
  from: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** How many days without a keep before returning counts as a comeback. */
export const COMEBACK_GAP = 2

export interface ProofInput {
  year: number
  /** The user's local today, so the current year stops where it actually is. */
  today: string
  /**
   * Every promise the year needs, and ideally a few weeks either side:
   * a keep on 2 January is only a comeback if the days before it — last
   * year's days — were quiet.
   */
  promises: ProofPromise[]
  /** Practice answers — one per practice per day, so a day can hold several. */
  practices?: ProofPractice[]
  /** Guided exercise runs, finished or abandoned. */
  exercises?: ProofExercise[]
  missionDays?: string[]
  checkInDays?: string[]
  /** Era spans, inclusive, clamped however the caller likes. */
  eraSpans?: { from: string; to: string }[]
  /**
   * The first day this person has any record of, if it falls inside the year.
   * The grid then opens at the START OF THAT MONTH rather than 1 January:
   * someone whose first era began in September should not meet eight rows of
   * empty dots for months they hadn't joined yet. Nothing is hidden — there
   * is nothing there — and the counts are unchanged either way.
   */
  startFrom?: string
}

export const EMPTY_DAY: DayFacts = {
  practicesKept: 0,
  practicesMissed: 0,
  exerciseDone: false,
  exerciseStarted: false,
}

/** Everything the three sources say, gathered per day. */
export function factsByDay(input: ProofInput): Map<string, DayFacts> {
  const map = new Map<string, DayFacts>()
  const get = (day: string): DayFacts => {
    const existing = map.get(day)
    if (existing) return existing
    const fresh: DayFacts = { ...EMPTY_DAY }
    map.set(day, fresh)
    return fresh
  }

  for (const p of input.promises) get(p.day).promise = p.kept
  for (const p of input.practices ?? []) {
    const day = get(p.day)
    if (p.kept) day.practicesKept++
    else day.practicesMissed++
  }
  for (const e of input.exercises ?? []) {
    const day = get(e.day)
    if (e.completed) day.exerciseDone = true
    else day.exerciseStarted = true
  }
  return map
}

/** The day of the week, 0 = Sunday, by arithmetic rather than a timezone. */
function weekday(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Everything that happened on one day, before it becomes a dot. */
export interface DayFacts {
  /** The promise's answer: true kept, false missed, null never answered. */
  promise?: boolean | null
  practicesKept: number
  practicesMissed: number
  /** A guided exercise was finished. */
  exerciseDone: boolean
  /** One was started and left — not a refusal, and not nothing either. */
  exerciseStarted: boolean
}

/**
 * How many things were kept that day.
 *
 * A practice done at its minimum counts the same as a full session: the
 * caller decides what "kept" means for a practice, and doing the floor on a
 * bad day is the behaviour the app is trying to produce.
 */
export function keptCount(facts: DayFacts): number {
  return (facts.promise === true ? 1 : 0) + facts.practicesKept + (facts.exerciseDone ? 1 : 0)
}

/**
 * The state of a day.
 *
 * Kept wins over missed, deliberately. Someone who broke their promise but
 * still trained had a day worth marking, and a grid that painted that day as
 * a failure would be lying by omission.
 */
export function stateOf(facts: DayFacts): ProofState {
  if (keptCount(facts) > 0) return 'kept'
  if (facts.promise === false || facts.practicesMissed > 0) return 'missed'
  if (facts.promise === null || facts.exerciseStarted) return 'open'
  return 'quiet'
}

/**
 * Longest run of kept CALENDAR days.
 *
 * Deliberately not lib/era/report.ts's longestKeptRun, which counts era days
 * (1…30) inside one era. This runs across eras and across the gaps between
 * them, which is the only way it means anything on a year grid.
 */
export function longestProofRun(keptDays: Iterable<string>): number {
  const kept = new Set(keptDays)
  let best = 0
  for (const day of kept) {
    // Only start counting from the beginning of a run, so this stays O(n).
    if (kept.has(previousDay(day))) continue
    let run = 1
    let cursor = nextDay(day)
    while (kept.has(cursor)) {
      run++
      cursor = nextDay(cursor)
    }
    if (run > best) best = run
  }
  return best
}

/**
 * Kept days that followed a gap — the times someone came back.
 *
 * `within` bounds which days are counted (the year on screen), while `kept`
 * may reach outside it, so that January is judged against December instead
 * of pretending the year started empty.
 */
export function countComebacks(keptDays: Iterable<string>, within: (day: string) => boolean): number {
  const kept = [...new Set(keptDays)].sort()
  const set = new Set(kept)
  let comebacks = 0
  for (const day of kept) {
    if (!within(day)) continue
    // Something to come back from: an earlier keep, at any point.
    if (day <= kept[0]) continue
    let gap = 0
    let cursor = previousDay(day)
    while (gap < COMEBACK_GAP && !set.has(cursor)) {
      gap++
      cursor = previousDay(cursor)
    }
    if (gap >= COMEBACK_GAP) comebacks++
  }
  return comebacks
}

/**
 * Build the grid.
 *
 * The current year stops at the end of the week containing today; days after
 * today are marked `future` and drawn as space. A year in the past runs
 * 1 January to 31 December.
 */
export function buildProofYear(input: ProofInput): ProofYear {
  const { year, today } = input
  const jan1 = `${year}-01-01`
  const dec31 = `${year}-12-31`
  const thisYear = today.slice(0, 4) === String(year)
  const lastDay = thisYear ? (today < dec31 ? today : dec31) : dec31
  if (today < jan1) {
    // A year that hasn't started. Nothing to draw, and no future promises.
    return {
      year,
      weeks: [],
      counts: {
        proofs: 0, missed: 0, open: 0, inEra: 0, missions: 0,
        promisesKept: 0, practicesKept: 0, exercisesDone: 0,
      },
      longestRun: 0,
      comebacks: 0,
      firstProof: null,
      lastProof: null,
      from: jan1,
    }
  }

  // Open at the month their record starts, when that is inside this year.
  const startsAt =
    input.startFrom && input.startFrom > jan1 && input.startFrom <= dec31
      ? `${input.startFrom.slice(0, 7)}-01`
      : jan1

  const facts = factsByDay(input)
  const missions = new Set(input.missionDays ?? [])
  const checkIns = new Set(input.checkInDays ?? [])
  const spans = input.eraSpans ?? []
  const inEraOn = (day: string) => spans.some(s => day >= s.from && day <= s.to)

  const counts = {
    proofs: 0, missed: 0, open: 0, inEra: 0, missions: 0,
    promisesKept: 0, practicesKept: 0, exercisesDone: 0,
  }
  const keptInYear: string[] = []
  const days: ProofDay[] = []
  for (let cursor = startsAt; cursor <= lastDay; cursor = nextDay(cursor)) {
    const day = facts.get(cursor) ?? EMPTY_DAY
    const state = stateOf(day)
    const kept = keptCount(day)
    if (state === 'kept') {
      counts.proofs++
      keptInYear.push(cursor)
    } else if (state === 'missed') counts.missed++
    else if (state === 'open') counts.open++
    if (day.promise === true) counts.promisesKept++
    counts.practicesKept += day.practicesKept
    if (day.exerciseDone) counts.exercisesDone++
    const inEra = inEraOn(cursor)
    if (inEra) counts.inEra++
    const mission = missions.has(cursor)
    if (mission) counts.missions++
    days.push({
      day: cursor,
      state,
      kept,
      inEra,
      mission,
      checkIn: checkIns.has(cursor),
      isToday: cursor === today,
      future: false,
    })
  }

  // Out to Saturday, so the last row is a whole week of seven boxes.
  if (thisYear && lastDay < dec31) {
    let cursor = nextDay(lastDay)
    while (weekday(cursor) !== 0 && cursor <= dec31) {
      days.push({
        day: cursor,
        state: 'quiet',
        kept: 0,
        inEra: inEraOn(cursor),
        mission: false,
        checkIn: false,
        isToday: false,
        future: true,
      })
      cursor = nextDay(cursor)
    }
  }

  const weeks: ProofWeek[] = []
  let week: (ProofDay | null)[] = Array(weekday(startsAt)).fill(null)
  for (const day of days) {
    week.push(day)
    if (week.length === 7) {
      weeks.push({ label: monthLabel(week), days: week })
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push({ label: monthLabel(week), days: week })
  }

  // Comebacks and runs read every keep we were given, in and out of the year
  // — and every KIND of keep. Reading only the promises here is what made a
  // month of training look like a month away.
  const allKept = [...facts.entries()]
    .filter(([, f]) => keptCount(f) > 0)
    .map(([day]) => day)
  const inYear = (day: string) => day >= jan1 && day <= lastDay

  return {
    year,
    weeks,
    counts,
    longestRun: longestProofRun(keptInYear),
    comebacks: countComebacks(allKept, inYear),
    firstProof: keptInYear[0] ?? null,
    lastProof: keptInYear[keptInYear.length - 1] ?? null,
    from: startsAt,
  }
}

/** "Sep" on the row where September starts. */
function monthLabel(week: (ProofDay | null)[]): string | null {
  for (const d of week) {
    if (d && d.day.endsWith('-01')) return MONTHS[Number(d.day.slice(5, 7)) - 1]
  }
  return null
}

/**
 * The line under the number. Says what the grid is, in terms of what was
 * counted — never a percentage of a denominator we're guessing at.
 */
export function proofSummary(y: ProofYear): string {
  if (y.counts.proofs === 0) {
    return y.counts.inEra > 0
      ? 'No days kept yet. The first one starts the record.'
      : 'Every promise, practice and exercise you keep lands here.'
  }
  const parts = [`${y.counts.proofs} ${y.counts.proofs === 1 ? 'day' : 'days'} kept`]
  if (y.longestRun > 1) parts.push(`${y.longestRun} in a row at your best`)
  if (y.comebacks > 0) parts.push(`${y.comebacks} ${y.comebacks === 1 ? 'comeback' : 'comebacks'}`)
  return parts.join(' · ')
}

/** Calendar-day gap between two YYYY-MM-DDs, for "x days ago" copy. */
export function daysAgo(day: string, today: string): number {
  return Math.max(0, daysBetween(day, today))
}

/** "September 19", the way the detail sheet titles a day. */
export function longDayLabel(day: string): string {
  const [, m, d] = day.split('-')
  const full = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return `${full[Number(m) - 1]} ${Number(d)}`
}
