/**
 * The year in proof.
 *
 * A streak is one number that a single missed day destroys. This is the
 * other thing: a calendar of days you actually kept a promise, which nothing
 * can take back. Miss a week and the week is blank — the 47 days before it
 * are still 47 days.
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
 *  - kept    they promised and said they kept it
 *  - missed  they promised and said they didn't
 *  - open    they promised and never came back to say (not a failure)
 *  - quiet   no promise that day
 */
export type ProofState = 'kept' | 'missed' | 'open' | 'quiet'

/** One promise, as the grid needs it. */
export interface ProofPromise {
  day: string
  kept: boolean | null
}

/** A day someone can tap. */
export interface ProofDay {
  day: string
  state: ProofState
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
    /** Days kept. THE number — the one the page leads with. */
    proofs: number
    missed: number
    open: number
    /** Days that fell inside an era, kept or not. The denominator. */
    inEra: number
    missions: number
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
  missionDays?: string[]
  checkInDays?: string[]
  /** Era spans, inclusive, clamped however the caller likes. */
  eraSpans?: { from: string; to: string }[]
}

/** The day of the week, 0 = Sunday, by arithmetic rather than a timezone. */
function weekday(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function stateOf(kept: boolean | null | undefined, hasPromise: boolean): ProofState {
  if (!hasPromise) return 'quiet'
  if (kept === true) return 'kept'
  if (kept === false) return 'missed'
  return 'open'
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
      counts: { proofs: 0, missed: 0, open: 0, inEra: 0, missions: 0 },
      longestRun: 0,
      comebacks: 0,
      firstProof: null,
      lastProof: null,
    }
  }

  const byDay = new Map<string, boolean | null>()
  for (const p of input.promises) byDay.set(p.day, p.kept)
  const missions = new Set(input.missionDays ?? [])
  const checkIns = new Set(input.checkInDays ?? [])
  const spans = input.eraSpans ?? []
  const inEraOn = (day: string) => spans.some(s => day >= s.from && day <= s.to)

  const counts = { proofs: 0, missed: 0, open: 0, inEra: 0, missions: 0 }
  const keptInYear: string[] = []
  const days: ProofDay[] = []
  for (let cursor = jan1; cursor <= lastDay; cursor = nextDay(cursor)) {
    const hasPromise = byDay.has(cursor)
    const state = stateOf(byDay.get(cursor), hasPromise)
    if (state === 'kept') {
      counts.proofs++
      keptInYear.push(cursor)
    } else if (state === 'missed') counts.missed++
    else if (state === 'open') counts.open++
    const inEra = inEraOn(cursor)
    if (inEra) counts.inEra++
    const mission = missions.has(cursor)
    if (mission) counts.missions++
    days.push({
      day: cursor,
      state,
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
  let week: (ProofDay | null)[] = Array(weekday(jan1)).fill(null)
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

  // Comebacks and runs read every keep we were given, in and out of the year.
  const allKept = input.promises.filter(p => p.kept === true).map(p => p.day)
  const inYear = (day: string) => day >= jan1 && day <= lastDay

  return {
    year,
    weeks,
    counts,
    longestRun: longestProofRun(keptInYear),
    comebacks: countComebacks(allKept, inYear),
    firstProof: keptInYear[0] ?? null,
    lastProof: keptInYear[keptInYear.length - 1] ?? null,
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
      : 'Start an era and every day you keep a promise lands here.'
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
