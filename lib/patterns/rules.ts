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

export const PATTERN_RULES_VERSION = 1

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
/** A wall of statistics is noise; the strongest few are the useful ones. */
export const MAX_PATTERNS = 4

export interface PromiseRecord {
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

export interface PatternInput {
  promises: PromiseRecord[]
  moods: MoodDay[]
  guideMoods: GuideMoodDay[]
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
  /** 'thin' while a group is still small: shown, but labelled as early. */
  strength: 'solid' | 'thin'
}

export interface PatternReport {
  patterns: Pattern[]
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

const strengthOf = (...groups: PatternGroup[]): 'solid' | 'thin' =>
  groups.every(g => g.of >= SOLID_PER_GROUP) ? 'solid' : 'thin'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const HOUR_BUCKETS: { label: string; test: (h: number) => boolean }[] = [
  { label: 'before 8am', test: h => h < 8 },
  { label: 'in the morning', test: h => h >= 8 && h < 12 },
  { label: 'in the afternoon', test: h => h >= 12 && h < 18 },
  { label: 'in the evening', test: h => h >= 18 },
]

// ─── Rules ───────────────────────────────────────────────────────────────────

function timingPattern(answered: PromiseRecord[]): Pattern | null {
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

function weekdayPattern(answered: PromiseRecord[]): Pattern | null {
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
    strength: strengthOf(c.best, c.worst),
  }
}

function followThroughPattern(answered: PromiseRecord[]): Pattern | null {
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
function sizePattern(answered: PromiseRecord[]): Pattern | null {
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

function voicePattern(answered: PromiseRecord[]): Pattern | null {
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
function momentumPattern(answered: PromiseRecord[]): Pattern | null {
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
function moodPattern(answered: PromiseRecord[], moods: MoodDay[]): Pattern | null {
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

/** Did the guide day end higher than it started? One group, so no comparison. */
function guidePattern(guideMoods: GuideMoodDay[]): Pattern | null {
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
    strength: moved.length >= SOLID_PER_GROUP ? 'solid' : 'thin',
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

export function findPatterns(input: PatternInput): PatternReport {
  const answered = input.promises.filter(p => p.kept !== null)
  const moodDaysWithPromise = new Set(
    input.promises.filter(p => p.kept !== null).map(p => p.day),
  )
  const moodDays = input.moods.filter(m => moodDaysWithPromise.has(m.day)).length

  const patterns: Pattern[] = []
  // Below the bar, the engine stays quiet rather than guessing from a handful
  // of days. The guide pattern stands on its own data, so it isn't gated here.
  if (answered.length >= MIN_ANSWERED_TOTAL) {
    patterns.push(
      ...[
        timingPattern(answered),
        weekdayPattern(answered),
        followThroughPattern(answered),
        sizePattern(answered),
        voicePattern(answered),
        momentumPattern(answered),
        moodPattern(answered, input.moods),
      ].filter((p): p is Pattern => p !== null),
    )
  }
  const guide = guidePattern(input.guideMoods)
  if (guide) patterns.push(guide)

  // Biggest difference first; solid before thin at equal size; id last so the
  // same history always produces the same order.
  const rank = { solid: 0, thin: 1 }
  patterns.sort((a, b) =>
    b.gap - a.gap || rank[a.strength] - rank[b.strength] || a.id.localeCompare(b.id))

  return {
    patterns: patterns.slice(0, MAX_PATTERNS),
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
