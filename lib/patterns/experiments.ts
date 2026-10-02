import { fisherExactTwoTailed } from './significance'
import type { Pattern, PatternKind } from './rules'

/**
 * Self-experiments: one small change for 7 days, judged against the
 * person's OWN previous four weeks — "adjust → test → learn", honestly.
 *
 * Seven days is a small test. The verdict says so: a big difference is
 * "promising", never "proven"; a small one is "no clear difference"; and with
 * too few answered days it says nothing. Every verdict carries both counts
 * and Fisher's exact p, so it can be checked.
 *
 * Only levers Voxu can actually observe from rows: when the promise was
 * made, how long it is (its length, never its words), and whether a guided
 * session was finished before it.
 *
 * Pure.
 */

export const EXPERIMENT_DAYS = 7
export const BASELINE_DAYS = 28
/** Answered promises needed inside the experiment / in the baseline. */
export const MIN_DURING = 4
export const MIN_BASELINE = 10
/** Points of difference before a result reads as more than noise. */
export const MIN_GAP = 15

/** One day's facts — no words, only times, sizes and outcomes. */
export interface DayFact {
  day: string
  /** The promise: local hour made, its length in characters, kept or not. */
  promiseHour: number | null
  promiseLength: number | null
  kept: boolean | null
  /** Epoch ms: when the promise was made, and the first finished guide that day. */
  promiseAt: number | null
  guideAt: number | null
}

export interface ExperimentDef {
  key: 'morning_promise' | 'small_promise' | 'guide_first'
  title: string
  /** What to do, said to them. */
  ask: string
  /** The pattern it tests, when they have one. */
  tests: PatternKind
  /** Did this day follow the experiment? */
  followed: (d: DayFact) => boolean
}

export const EXPERIMENTS: ExperimentDef[] = [
  {
    key: 'morning_promise',
    title: 'Promise before 9 AM',
    ask: 'For 7 days, make your promise before 9 AM.',
    tests: 'timing',
    followed: d => d.promiseHour !== null && d.promiseHour < 9,
  },
  {
    key: 'small_promise',
    title: 'Keep it small',
    ask: 'For 7 days, make each promise one small thing — a short sentence.',
    tests: 'size',
    followed: d => d.promiseLength !== null && d.promiseLength <= 40,
  },
  {
    key: 'guide_first',
    title: 'Guide first',
    ask: 'For 7 days, finish a guided session before you make your promise.',
    tests: 'guided_day',
    followed: d => d.guideAt !== null && d.promiseAt !== null && d.guideAt < d.promiseAt,
  },
]

export const EXPERIMENT_BY_KEY = new Map(EXPERIMENTS.map(e => [e.key, e]))

/** The experiment that tests a law, if there is one. */
export function experimentFor(pattern: Pick<Pattern, 'kind'>): ExperimentDef | null {
  return EXPERIMENTS.find(e => e.tests === pattern.kind) ?? null
}

export interface ExperimentResult {
  daysFollowed: number
  during: { hits: number; of: number; rate: number }
  before: { hits: number; of: number; rate: number }
  verdict: 'promising' | 'worse' | 'no_clear_difference' | 'not_enough'
  p: number | null
  /** One plain sentence. */
  line: string
}

const rate = (hits: number, of: number) => ({ hits, of, rate: of === 0 ? 0 : Math.round((hits / of) * 1000) / 10 })

/** Judge an experiment from its days and the four weeks before it. */
export function evaluateExperiment(def: ExperimentDef, during: DayFact[], baseline: DayFact[]): ExperimentResult {
  const ans = (xs: DayFact[]) => xs.filter(d => d.kept !== null)
  const d = ans(during)
  const b = ans(baseline)
  const dur = rate(d.filter(x => x.kept).length, d.length)
  const bef = rate(b.filter(x => x.kept).length, b.length)
  const daysFollowed = during.filter(def.followed).length

  if (d.length < MIN_DURING || b.length < MIN_BASELINE) {
    return {
      daysFollowed, during: dur, before: bef, verdict: 'not_enough', p: null,
      line: `Not enough answered promises to compare yet (${d.length} during, ${b.length} before).`,
    }
  }
  const p = fisherExactTwoTailed(dur.hits, dur.of, bef.hits, bef.of)
  const gap = dur.rate - bef.rate
  const counts = `${dur.hits} of ${dur.of} kept during, against ${bef.hits} of ${bef.of} in the four weeks before.`
  if (gap >= MIN_GAP) {
    return { daysFollowed, during: dur, before: bef, verdict: 'promising', p, line: `Promising: ${counts} Seven days is a small test — worth keeping and watching.` }
  }
  if (gap <= -MIN_GAP) {
    return { daysFollowed, during: dur, before: bef, verdict: 'worse', p, line: `It went the other way: ${counts} This one may not be your lever.` }
  }
  return { daysFollowed, during: dur, before: bef, verdict: 'no_clear_difference', p, line: `No clear difference: ${counts}` }
}

/** Day N of the experiment (1-based) for a given day, or null outside it. */
export function experimentDay(startDay: string, day: string): number | null {
  const n = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${startDay}T00:00:00Z`)) / 86400000) + 1
  return n >= 1 && n <= EXPERIMENT_DAYS ? n : null
}

export function addDays(day: string, n: number): string {
  const x = new Date(`${day}T00:00:00Z`)
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}
