/**
 * What your record shows — computed patterns in one person's own history.
 *
 * Deliberately NOT an AI summary (that already exists as the wellness score).
 * This is the auditable kind: every line is a count of things the user
 * logged, every claim carries the numbers behind it, and the engine says
 * nothing at all until each side of a comparison has enough observations.
 * A confident-sounding pattern from four data points would be worse than
 * silence — people make real decisions about themselves from these.
 *
 * Three rules hold the whole file together:
 *
 *  1. NEVER a claim without both sides and their counts. "You keep 90%" is
 *     meaningless alone; "90% before 8am against 40% after noon, 9 of 10 vs
 *     4 of 10" can be checked.
 *  2. NEVER a judgement about a person, and never a cause. Keeping a promise
 *     and having a good day move together; which way is unknowable from
 *     this data, and the copy says so.
 *  3. NEVER their words. The input carries a promise's LENGTH, never its
 *     text — there is no field here that could leak what someone wrote.
 *
 * It is a record, not a diagnosis. Nothing here screens for, detects or
 * treats anything.
 */

import { fisherExactTwoTailed, holmSurvivors } from './significance'

/**
 * Bumped when the rules change in a way that would make two reports
 * incomparable. v2: differences must now survive Fisher's exact and a Holm
 * correction before they read as solid (lib/patterns/significance.ts).
 */
export const PATTERN_RULES_VERSION = 2

export type MoodLevel = 'awful' | 'low' | 'okay' | 'good' | 'great'
export type GuideMood = 'low' | 'medium' | 'high'

/** Moods counted as "a good day" when a rate is reported. */
const GOOD_MOODS: MoodLevel[] = ['good', 'great']

// ─── Thresholds ──────────────────────────────────────────────────────────────
/** Answered promises before any promise pattern may be shown at all. */
export const MIN_ANSWERED_TOTAL = 10
/** Observations needed on EACH side of a comparison. */
export const MIN_PER_GROUP = 5
/** Weekdays split seven ways, so they get a lower bar and a wider gap. */
export const MIN_PER_WEEKDAY = 4
/** Days with both a mood and an answered promise. */
export const MIN_MOOD_DAYS = 10
/** Percentage points between two groups before it's worth saying. */
export const MIN_GAP_POINTS = 15
export const MIN_GAP_POINTS_WEEKDAY = 25
/** Per group, when a pattern stops being "thin" and reads as solid. */
export const SOLID_PER_GROUP = 8
/**
 * The same bar for weekdays, which only come round once a week: eight
 * Thursdays is two months of waiting before the app can act on a weak day.
 * Six is still six weeks, and the weekday gap requirement is stricter to
 * make up for it.
 */
export const SOLID_PER_WEEKDAY = 6
/** A wall of statistics is noise; the strongest few are the useful ones. */
export const MAX_PATTERNS = 4

/** The check-in's one-tap answers (lib/era/reasons.ts keys). */
export interface PromiseExtras {
  /** How sure they were before promising, 1–5, or null if they skipped it. */
  confidence: number | null
  /** What got in the way — only ever on a miss. */
  blocker: string | null
  /** What helped — only ever on a keep. */
  helper: string | null
}

export interface PromiseRecord extends PromiseExtras {
  /** Local calendar day the promise belongs to (YYYY-MM-DD, user's timezone). */
  day: string
  /** Local hour 0–23 the promise was made. */
  hour: number
  /** 0 = Sunday … 6 = Saturday, in the user's own timezone. */
  weekday: number
  kept: boolean | null
  /** Answered on the same local day, or later? Null while unanswered. */
  answeredSameDay: boolean | null
  source: 'typed' | 'spoken'
  /** Characters in the promise — its size. Never its words. */
  length: number
}

export interface MoodDay {
  day: string
  mood: MoodLevel
}

export interface GuideMoodDay {
  day: string
  before: GuideMood
  after: GuideMood
}

/** A consented daily check-in (lib/wellness/scales.ts), 1–5 each. */
export interface WellnessDay {
  day: string
  mood: number | null
  energy: number | null
  stress: number | null
  rested: number | null
}

export interface PatternInput {
  promises: PromiseRecord[]
  moods: MoodDay[]
  guideMoods: GuideMoodDay[]
  /** Empty unless the user turned check-ins on. */
  wellness?: WellnessDay[]
  /** Today in the user's timezone (YYYY-MM-DD) — the anchor for "recently". */
  today?: string
  /**
   * Turns a stored blocker/helper key into its label. Injected rather than
   * imported so this file stays free of era concepts and testable on its own.
   */
  reasonLabel?: (key: string) => string
}

export interface PatternGroup {
  label: string
  /** Observations in this group that "hit" — kept the promise, or logged a good mood. */
  hits: number
  /** Observations in this group. */
  of: number
  /** hits / of as a percentage, one decimal. */
  rate: number
}

export type PatternKind =
  | 'timing' | 'weekday' | 'follow_through' | 'size' | 'voice' | 'momentum' | 'mood' | 'guide'
  | 'confidence' | 'blocker' | 'helper'
  | 'energy' | 'stress' | 'rested'

export interface Pattern {
  id: string
  kind: PatternKind
  /** Number-first, both sides, no verdict. */
  headline: string
  /** The counts, and what it does not mean. */
  detail: string
  groups: PatternGroup[]
  /** Points between the two groups — what the list is ordered by. */
  gap: number
  /**
   * 'solid'  the difference survived Fisher's exact + Holm across every
   *          comparison in this report, and both sides have real numbers.
   *          Only these are quoted by the coach or acted on.
   * 'early'  their own record, but chance is still a live explanation.
   *          Shown with its counts, labelled, never acted on.
   */
  strength: 'solid' | 'early'
  /**
   * Fisher's exact two-tailed p, or null for a pattern that is a count
   * rather than a comparison (the blocker and helper tallies, guide days).
   */
  p: number | null
}

/**
 * A pattern before it has been tested. Each rule decides whether the SAMPLE
 * is big enough; whether the DIFFERENCE is more than chance is decided once,
 * for all of them together, in findPatterns — because that question can only
 * be answered knowing how many comparisons were made.
 */
export type RawPattern = Omit<Pattern, 'p'>

export interface PatternReport {
  patterns: Pattern[]
  /** Single rates about themselves — no composite, see computeScores. */
  scores: Score[]
  /** Plain counts of what's still missing before anything can be said. */
  needs: { answeredPromises: number; moodDays: number }
  /** Days and promises the report is computed from. */
  basis: {
    answeredPromises: number
    moodDays: number
    guideDays: number
    rulesVersion: number
  }
  disclaimer: string
}

export const PATTERN_DISCLAIMER =
  'Counts from what you logged — your own record, not advice or a diagnosis.'

const pct = (hits: number, of: number): number => (of === 0 ? 0 : Math.round((hits / of) * 1000) / 10)

function group(label: string, hits: number, of: number): PatternGroup {
  return { label, hits, of, rate: pct(hits, of) }
}

/** Kept-rate group from a set of answered promises. */
function keptGroup(label: string, rows: PromiseRecord[]): PatternGroup {
  return group(label, rows.filter(p => p.kept === true).length, rows.length)
}

/**
 * The best and worst of several groups, if both clear `minPerGroup` and the
 * distance between them clears `minGap`. Returns null when there's nothing
 * honest to say — which is most of the time, early on.
 */
function compare(
  groups: PatternGroup[],
  minPerGroup: number,
  minGap: number,
): { best: PatternGroup; worst: PatternGroup; gap: number } | null {
  const eligible = groups.filter(g => g.of >= minPerGroup)
  if (eligible.length < 2) return null
  // Stable: equal rates fall back to the label so the order never jitters.
  const sorted = [...eligible].sort((a, b) => b.rate - a.rate || a.label.localeCompare(b.label))
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  const gap = Math.round((best.rate - worst.rate) * 10) / 10
  if (gap < minGap) return null
  return { best, worst, gap }
}

const strengthOf = (...groups: PatternGroup[]): 'solid' | 'early' =>
  groups.every(g => g.of >= SOLID_PER_GROUP) ? 'solid' : 'early'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const HOUR_BUCKETS: { label: string; test: (h: number) => boolean }[] = [
  { label: 'before 8am', test: h => h < 8 },
  { label: 'in the morning', test: h => h >= 8 && h < 12 },
  { label: 'in the afternoon', test: h => h >= 12 && h < 18 },
  { label: 'in the evening', test: h => h >= 18 },
]

// ─── Rules ───────────────────────────────────────────────────────────────────

function timingPattern(answered: PromiseRecord[]): RawPattern | null {
  const groups = HOUR_BUCKETS.map(b => keptGroup(b.label, answered.filter(p => b.test(p.hour))))
  const c = compare(groups, MIN_PER_GROUP, MIN_GAP_POINTS)
  if (!c) return null
  return {
    id: 'timing',
    kind: 'timing',
    headline: `You keep ${c.best.rate}% of the promises you make ${c.best.label} — and ${c.worst.rate}% of the ones you make ${c.worst.label}.`,
    detail: `${c.best.hits} of ${c.best.of} against ${c.worst.hits} of ${c.worst.of}.`,
    groups: [c.best, c.worst],
    gap: c.gap,
    strength: strengthOf(c.best, c.worst),
  }
}

function weekdayPattern(answered: PromiseRecord[]): RawPattern | null {
  const groups = WEEKDAYS.map((name, i) => keptGroup(name, answered.filter(p => p.weekday === i)))
  const c = compare(groups, MIN_PER_WEEKDAY, MIN_GAP_POINTS_WEEKDAY)
  if (!c) return null
  return {
    id: 'weekday',
    kind: 'weekday',
    headline: `${c.worst.label} is where your promises slip: ${c.worst.rate}% kept, against ${c.best.rate}% on ${c.best.label}.`,
    detail: `${c.worst.hits} of ${c.worst.of} on ${c.worst.label}, ${c.best.hits} of ${c.best.of} on ${c.best.label}.`,
    groups: [c.worst, c.best],
    gap: c.gap,
    strength: [c.best, c.worst].every(g => g.of >= SOLID_PER_WEEKDAY) ? 'solid' : 'early',
  }
}

function followThroughPattern(answered: PromiseRecord[]): RawPattern | null {
  const sameDay = keptGroup('when you answer the same day', answered.filter(p => p.answeredSameDay === true))
  const later = keptGroup('when you answer later', answered.filter(p => p.answeredSameDay === false))
  const c = compare([sameDay, later], MIN_PER_GROUP, MIN_GAP_POINTS)
  if (!c) return null
  return {
    id: 'follow_through',
    kind: 'follow_through',
    headline: `${c.best.rate}% kept ${c.best.label} — ${c.worst.rate}% ${c.worst.label}.`,
    detail: `${c.best.hits} of ${c.best.of} against ${c.worst.hits} of ${c.worst.of}. Answering while the day is fresh is also when the answer is most honest.`,
    groups: [c.best, c.worst],
    gap: c.gap,
    strength: strengthOf(c.best, c.worst),
  }
}

/** Short promises vs long ones — the size they wrote, not what it said. */
function sizePattern(answered: PromiseRecord[]): RawPattern | null {
  const short = keptGroup('short promises', answered.filter(p => p.length <= 40))
  const long = keptGroup('longer ones', answered.filter(p => p.length > 40))
  const c = compare([short, long], MIN_PER_GROUP, MIN_GAP_POINTS)
  if (!c) return null
  return {
    id: 'size',
    kind: 'size',
    headline: `${c.best.label === 'short promises' ? 'Short' : 'Longer'} promises hold for you: ${c.best.rate}% kept, against ${c.worst.rate}% for ${c.worst.label}.`,
    detail: `${c.best.hits} of ${c.best.of} against ${c.worst.hits} of ${c.worst.of}.`,
    groups: [c.best, c.worst],
    gap: c.gap,
    strength: strengthOf(c.best, c.worst),
  }
}

function voicePattern(answered: PromiseRecord[]): RawPattern | null {
  const spoken = keptGroup('spoken out loud', answered.filter(p => p.source === 'spoken'))
  const typed = keptGroup('typed', answered.filter(p => p.source === 'typed'))
  const c = compare([spoken, typed], MIN_PER_GROUP, MIN_GAP_POINTS)
  if (!c) return null
  return {
    id: 'voice',
    kind: 'voice',
    headline: `Promises you ${c.best.label}: ${c.best.rate}% kept. ${c.worst.label === 'typed' ? 'Typed' : 'Spoken'}: ${c.worst.rate}%.`,
    detail: `${c.best.hits} of ${c.best.of} against ${c.worst.hits} of ${c.worst.of}.`,
    groups: [c.best, c.worst],
    gap: c.gap,
    strength: strengthOf(c.best, c.worst),
  }
}

/**
 * Does yesterday carry? Kept-rate the day after a kept promise against the
 * day after a broken one. Only consecutive days count — a gap is not a
 * "day after".
 */
function momentumPattern(answered: PromiseRecord[]): RawPattern | null {
  const byDay = new Map(answered.map(p => [p.day, p]))
  const afterKept: PromiseRecord[] = []
  const afterMissed: PromiseRecord[] = []
  for (const p of answered) {
    const prev = byDay.get(previousDay(p.day))
    if (!prev || prev.kept === null) continue
    if (prev.kept) afterKept.push(p)
    else afterMissed.push(p)
  }
  const a = keptGroup('the day after one you kept', afterKept)
  const b = keptGroup('the day after one you missed', afterMissed)
  const c = compare([a, b], MIN_PER_GROUP, MIN_GAP_POINTS)
  if (!c) return null
  return {
    id: 'momentum',
    kind: 'momentum',
    headline: `${c.best.rate}% kept ${c.best.label} — ${c.worst.rate}% ${c.worst.label}.`,
    detail: `${c.best.hits} of ${c.best.of} against ${c.worst.hits} of ${c.worst.of}. One missed day is the one worth answering the next morning.`,
    groups: [c.best, c.worst],
    gap: c.gap,
    strength: strengthOf(c.best, c.worst),
  }
}

/** YYYY-MM-DD one day earlier, by UTC arithmetic on the date parts. */
function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const t = Date.UTC(y, (m ?? 1) - 1, d ?? 1) - 86400000
  return new Date(t).toISOString().slice(0, 10)
}

/**
 * The one people actually feel: mood on the days a promise was kept against
 * the days it wasn't. Reported as a link in both directions, never as a
 * cause — a good day makes a promise easier to keep just as much as the
 * reverse, and this data cannot tell the two apart.
 */
function moodPattern(answered: PromiseRecord[], moods: MoodDay[]): RawPattern | null {
  const moodByDay = new Map(moods.map(m => [m.day, m.mood]))
  const kept: MoodLevel[] = []
  const missed: MoodLevel[] = []
  for (const p of answered) {
    const mood = moodByDay.get(p.day)
    if (!mood) continue
    ;(p.kept ? kept : missed).push(mood)
  }
  if (kept.length + missed.length < MIN_MOOD_DAYS) return null
  const good = (list: MoodLevel[]) => list.filter(m => GOOD_MOODS.includes(m)).length
  const a = group('days you kept it', good(kept), kept.length)
  const b = group("days you didn't", good(missed), missed.length)
  const c = compare([a, b], MIN_PER_GROUP, MIN_GAP_POINTS)
  if (!c) return null
  return {
    id: 'mood',
    kind: 'mood',
    headline: `You logged a good day ${a.rate}% of the time when you kept your promise, and ${b.rate}% of the time when you didn't.`,
    detail: `${a.hits} of ${a.of} against ${b.hits} of ${b.of}. That's a link, not a cause — an easier day also makes a promise easier to keep.`,
    groups: [a, b],
    gap: c.gap,
    strength: strengthOf(a, b),
  }
}

/**
 * Does their own certainty mean anything? Kept-rate on promises they were
 * sure about (4–5) against ones they weren't (1–3).
 *
 * The useful answer is sometimes the uncomfortable one — someone who keeps
 * promises equally either way is not short of motivation, and someone who
 * only delivers when they already felt sure knows something about how to
 * set tomorrow's promise.
 */
function confidencePattern(answered: PromiseRecord[]): RawPattern | null {
  const sure = keptGroup('when you felt sure', answered.filter(p => p.confidence !== null && p.confidence >= 4))
  const unsure = keptGroup("when you weren't", answered.filter(p => p.confidence !== null && p.confidence <= 3))
  const c = compare([sure, unsure], MIN_PER_GROUP, MIN_GAP_POINTS)
  if (!c) return null
  return {
    id: 'confidence',
    kind: 'confidence',
    headline: `${c.best.rate}% kept ${c.best.label}, ${c.worst.rate}% ${c.worst.label}.`,
    detail: `${c.best.hits} of ${c.best.of} against ${c.worst.hits} of ${c.worst.of}. How sure you feel before you promise is worth listening to.`,
    groups: [c.best, c.worst],
    gap: c.gap,
    strength: strengthOf(c.best, c.worst),
  }
}

/** Minimum tagged check-ins before naming the most common one. */
export const MIN_TAGGED = 5
/** Times the top answer must appear before it's "the" answer. */
export const MIN_TOP_TAG = 3

/**
 * The most common thing in the way, and the most common thing that helped.
 * A count, not a comparison — so no best-vs-worst, and it sorts below the
 * real comparisons.
 */
function reasonPattern(
  answered: PromiseRecord[],
  which: 'blocker' | 'helper',
  label: (key: string) => string,
): RawPattern | null {
  const tagged = answered
    .filter(p => (which === 'blocker' ? p.kept === false : p.kept === true))
    .map(p => (which === 'blocker' ? p.blocker : p.helper))
    .filter((k): k is string => !!k)
  if (tagged.length < MIN_TAGGED) return null

  const counts = new Map<string, number>()
  for (const key of tagged) counts.set(key, (counts.get(key) ?? 0) + 1)
  // Ties broken by key so the same history always names the same one.
  const [topKey, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  if (topCount < MIN_TOP_TAG) return null

  const g = group(label(topKey), topCount, tagged.length)
  return {
    id: which,
    kind: which,
    headline: which === 'blocker'
      ? `What stops you most often: ${label(topKey).toLowerCase()} — ${topCount} of the ${tagged.length} misses you told me about.`
      : `What helps you most often: ${label(topKey).toLowerCase()} — ${topCount} of the ${tagged.length} keeps you told me about.`,
    detail: which === 'blocker'
      ? 'Worth designing tomorrow around, rather than pushing harder against.'
      : 'Worth doing on purpose instead of by accident.',
    groups: [g],
    gap: 0,
    strength: tagged.length >= SOLID_PER_GROUP ? 'solid' : 'early',
  }
}

/**
 * What state actually costs them: kept-rate on days they rated a scale high
 * (4–5) against days they rated it low (1–2). Middling days (3) are left out
 * of both sides on purpose — the question is whether the ends differ.
 *
 * Reported as a link both ways, like the mood pattern. Low energy may cost
 * follow-through, and a day that went badly may also feel low; this data
 * can't separate them, and the copy doesn't pretend otherwise.
 */
function wellnessPattern(
  answered: PromiseRecord[],
  wellness: WellnessDay[],
  scale: 'energy' | 'stress' | 'rested',
  wording: { high: string; low: string; note: string },
): RawPattern | null {
  const byDay = new Map(wellness.map(w => [w.day, w[scale]]))
  const high: PromiseRecord[] = []
  const low: PromiseRecord[] = []
  for (const p of answered) {
    const score = byDay.get(p.day)
    if (score === null || score === undefined) continue
    if (score >= 4) high.push(p)
    else if (score <= 2) low.push(p)
  }
  const a = keptGroup(wording.high, high)
  const b = keptGroup(wording.low, low)
  const c = compare([a, b], MIN_PER_GROUP, MIN_GAP_POINTS)
  if (!c) return null
  return {
    id: scale,
    kind: scale,
    headline: `${c.best.rate}% kept on ${c.best.label} — ${c.worst.rate}% on ${c.worst.label}.`,
    detail: `${c.best.hits} of ${c.best.of} against ${c.worst.hits} of ${c.worst.of}. ${wording.note}`,
    groups: [c.best, c.worst],
    gap: c.gap,
    strength: strengthOf(a, b),
  }
}

/** Did the guide day end higher than it started? One group, so no comparison. */
function guidePattern(guideMoods: GuideMoodDay[]): RawPattern | null {
  const rank: Record<GuideMood, number> = { low: 1, medium: 2, high: 3 }
  const moved = guideMoods.filter(d => rank[d.before] && rank[d.after])
  if (moved.length < MIN_PER_GROUP) return null
  const better = moved.filter(d => rank[d.after] > rank[d.before]).length
  const g = group('guide days', better, moved.length)
  return {
    id: 'guide',
    kind: 'guide',
    headline: `Your mood ended higher than it started on ${g.rate}% of the days you ran the guide.`,
    detail: `${g.hits} of ${g.of} days where you recorded both.`,
    groups: [g],
    // No second group to compare, so it sorts below real comparisons.
    gap: 0,
    strength: moved.length >= SOLID_PER_GROUP ? 'solid' : 'early',
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

export function findPatterns(input: PatternInput): PatternReport {
  const answered = input.promises.filter(p => p.kept !== null)
  const moodDaysWithPromise = new Set(
    input.promises.filter(p => p.kept !== null).map(p => p.day),
  )
  const moodDays = input.moods.filter(m => moodDaysWithPromise.has(m.day)).length

  const raw: RawPattern[] = []
  // Below the bar, the engine stays quiet rather than guessing from a handful
  // of days. The guide pattern stands on its own data, so it isn't gated here.
  if (answered.length >= MIN_ANSWERED_TOTAL) {
    raw.push(
      ...[
        timingPattern(answered),
        weekdayPattern(answered),
        followThroughPattern(answered),
        sizePattern(answered),
        voicePattern(answered),
        momentumPattern(answered),
        moodPattern(answered, input.moods),
        confidencePattern(answered),
        reasonPattern(answered, 'blocker', input.reasonLabel ?? (k => k)),
        reasonPattern(answered, 'helper', input.reasonLabel ?? (k => k)),
        wellnessPattern(answered, input.wellness ?? [], 'energy', {
          high: 'days you had energy', low: 'drained days',
          note: 'Worth making the promise smaller on a drained day than skipping it.',
        }),
        wellnessPattern(answered, input.wellness ?? [], 'stress', {
          high: 'high-stress days', low: 'calm days',
          note: 'A link, not a cause — a day that goes badly raises both.',
        }),
        wellnessPattern(answered, input.wellness ?? [], 'rested', {
          high: 'rested days', low: 'days you woke up tired',
          note: 'The night before shows up in the next day’s promise.',
        }),
      ].filter((x): x is RawPattern => x !== null),
    )
  }
  const guide = guidePattern(input.guideMoods)
  if (guide) raw.push(guide)

  // Now the one question that can only be answered for all of them at once:
  // is each difference more than chance, given how many were tested?
  //
  // A pattern that fails is still shown — it is their own record — but it is
  // labelled early, and coachPatternLine/weakDayLine only ever take a solid
  // one, so nothing the app SAYS or DOES rests on a coin flip.
  const pValues = raw.map(r =>
    r.groups.length === 2
      ? fisherExactTwoTailed(r.groups[0].hits, r.groups[0].of, r.groups[1].hits, r.groups[1].of)
      : null)
  const tested = pValues.filter((p): p is number => p !== null)
  const survived = holmSurvivors(tested)
  let testedIndex = 0
  const patterns: Pattern[] = raw.map((r, i) => {
    const p = pValues[i]
    if (p === null) return { ...r, p: null } // a count, not a comparison
    const passed = survived[testedIndex++]
    return { ...r, p, strength: passed && r.strength === 'solid' ? 'solid' : 'early' }
  })

  // Biggest difference first; solid before early at equal size; id last so the
  // same history always produces the same order.
  const rank = { solid: 0, early: 1 }
  patterns.sort((a, b) =>
    b.gap - a.gap || rank[a.strength] - rank[b.strength] || a.id.localeCompare(b.id))

  return {
    patterns: patterns.slice(0, MAX_PATTERNS),
    scores: computeScores(input),
    needs: {
      answeredPromises: Math.max(0, MIN_ANSWERED_TOTAL - answered.length),
      moodDays: Math.max(0, MIN_MOOD_DAYS - moodDays),
    },
    basis: {
      answeredPromises: answered.length,
      moodDays,
      guideDays: input.guideMoods.length,
      rulesVersion: PATTERN_RULES_VERSION,
    },
    disclaimer: PATTERN_DISCLAIMER,
  }
}

// ─── Acting on it ────────────────────────────────────────────────────────────

/**
 * A line for the morning of a day this person usually slips, or null.
 *
 * The point is to shrink the ask BEFORE the miss rather than commiserate
 * after it. Only fires on a solid weekday pattern, and only on that weekday
 * — being told "today is your weak day" on a Tuesday that isn't would be
 * both wrong and discouraging.
 *
 * `weekday`: 0 = Sunday … 6 = Saturday, in the user's own timezone.
 */
export function weakDayLine(report: PatternReport, weekday: number): string | null {
  const p = report.patterns.find(x => x.kind === 'weekday' && x.strength === 'solid')
  if (!p) return null
  const worst = p.groups[0]
  if (WEEKDAYS[weekday] !== worst.label) return null
  return `${worst.label}s are where you slip — ${worst.hits} of ${worst.of} kept. Make today's promise small enough that you keep it.`
}

// ─── Scores ──────────────────────────────────────────────────────────────────

/** A single rate needs less evidence than a comparison, but not none. */
export const SCORE_MIN_ANSWERED = 5
/** Times they came back after a miss, before an average means anything. */
export const SCORE_MIN_RETURNS = 3
/** Promises made on days they logged a low mood. */
export const SCORE_MIN_LOW_DAYS = 5
/** The window "recently" means, in days. */
export const SCORE_WINDOW_DAYS = 28

export interface Score {
  id: 'follow_through' | 'showing_up' | 'bounce_back' | 'low_day'
  label: string
  value: number
  unit: '%' | 'days'
  /** The counts behind the number, always. */
  detail: string
}

/** Days between two YYYY-MM-DD dates, by UTC arithmetic. */
function daysBetween(from: string, to: string): number {
  const [ay, am, ad] = from.split('-').map(Number)
  const [by, bm, bd] = to.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

/**
 * The numbers people actually want about themselves, each one a rate with
 * its counts and no composite. A single blended "consistency score" would
 * hide which part moved — and any weight in it would be invented.
 */
export function computeScores(input: PatternInput): Score[] {
  const answered = input.promises.filter(p => p.kept !== null)
  const scores: Score[] = []

  if (answered.length >= SCORE_MIN_ANSWERED) {
    const kept = answered.filter(p => p.kept).length
    scores.push({
      id: 'follow_through',
      label: 'Follow-through',
      value: pct(kept, answered.length),
      unit: '%',
      detail: `${kept} of ${answered.length} answered promises kept`,
    })
  }

  // Showing up: days with a promise inside the window ending today.
  const today = input.today
  if (today) {
    const days = new Set(
      input.promises
        .filter(p => {
          const age = daysBetween(p.day, today)
          return age >= 0 && age < SCORE_WINDOW_DAYS
        })
        .map(p => p.day),
    )
    if (days.size > 0) {
      scores.push({
        id: 'showing_up',
        label: 'Showing up',
        value: days.size,
        unit: 'days',
        detail: `promises made on ${days.size} of the last ${SCORE_WINDOW_DAYS} days`,
      })
    }
  }

  // Bounce-back: from a missed promise to the next one they kept.
  const sorted = [...answered].sort((a, b) => a.day.localeCompare(b.day))
  const gaps: number[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].kept !== false) continue
    const back = sorted.slice(i + 1).find(p => p.kept === true)
    if (back) gaps.push(daysBetween(sorted[i].day, back.day))
  }
  if (gaps.length >= SCORE_MIN_RETURNS) {
    const mid = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)]
    scores.push({
      id: 'bounce_back',
      label: 'Bounce-back',
      value: mid,
      unit: 'days',
      detail: `you came back after ${gaps.length} misses — usually within ${mid} ${mid === 1 ? 'day' : 'days'}`,
    })
  }

  // Following through on the days that were already hard.
  const lowDays = new Set(input.moods.filter(m => m.mood === 'low' || m.mood === 'awful').map(m => m.day))
  const onLowDays = answered.filter(p => lowDays.has(p.day))
  if (onLowDays.length >= SCORE_MIN_LOW_DAYS) {
    const kept = onLowDays.filter(p => p.kept).length
    scores.push({
      id: 'low_day',
      label: 'On your low days',
      value: pct(kept, onLowDays.length),
      unit: '%',
      detail: `${kept} of ${onLowDays.length} kept on days you logged a low mood`,
    })
  }

  return scores
}

/**
 * The single line the coach may quote, or null. Only ever a solid pattern,
 * and only the kinds that say something about TODAY's promise — a weekday or
 * mood observation isn't the coach's business at 6am.
 */
export function coachPatternLine(report: PatternReport): string | null {
  const useful: PatternKind[] = ['timing', 'momentum', 'size', 'follow_through', 'voice']
  const p = report.patterns.find(x => x.strength === 'solid' && useful.includes(x.kind))
  return p ? `${p.headline} (${p.detail.split('.')[0]}.)` : null
}
