import type { MindsetId } from '@/lib/mindset/types'

/**
 * The Daily Read scoring model.
 *
 * Scoring toward eight mindsets directly would need hundreds of items before
 * anything could honestly be said. Instead every item loads onto ONE of four
 * axes, and the eight mindsets sit at fixed coordinates in that space. A
 * person's "lean" is simply the nearest mindset to where their answers sit.
 *
 * That buys two things a direct model doesn't: a usable read from ~8 answers
 * instead of ~80, and the ability to be legibly BETWEEN two mindsets — the
 * distance itself says how much to trust the read, which is what stops this
 * from over-claiming. It is not a validated instrument and must never be
 * presented as one.
 */

export type AxisId = 'agency' | 'discipline' | 'inquiry' | 'faith'

export const AXES: { id: AxisId; label: string; low: string; high: string }[] = [
  { id: 'agency',     label: 'Agency',     low: 'Accepts what comes',   high: 'Bends things to will' },
  { id: 'discipline', label: 'Discipline', low: 'Follows the day',      high: 'Holds a structure' },
  { id: 'inquiry',    label: 'Inquiry',    low: 'Acts on instinct',     high: 'Questions first' },
  { id: 'faith',      label: 'Faith',      low: 'Expects the catch',    high: 'Expects it to work out' },
]

export const AXIS_IDS: AxisId[] = AXES.map(a => a.id)

/** Where each mindset sits, per axis, on the same -2..+2 scale answers use. */
export const MINDSET_COORDS: Record<MindsetId, Record<AxisId, number>> = {
  stoic:          { agency: -2, discipline:  2, inquiry:  1, faith:  0 },
  existentialist: { agency:  1, discipline: -1, inquiry:  2, faith: -1 },
  cynic:          { agency: -1, discipline:  0, inquiry:  2, faith: -2 },
  hedonist:       { agency:  0, discipline: -2, inquiry: -1, faith:  1 },
  samurai:        { agency:  1, discipline:  2, inquiry: -1, faith:  0 },
  scholar:        { agency:  0, discipline:  1, inquiry:  2, faith:  1 },
  manifestor:     { agency:  2, discipline:  0, inquiry: -2, faith:  2 },
  hustler:        { agency:  2, discipline:  1, inquiry: -1, faith:  1 },
}

/** Answers needed before we're willing to name a lean at all. */
export const MIN_ANSWERS_FOR_READ = 8
/** Answers that count as a "full" picture, for the completeness readout. */
export const FULL_PICTURE = 40

export interface ScoredAnswer {
  axis: AxisId
  /** Which way the item loads: +1 means agreeing pushes the axis up. */
  direction: 1 | -1
  /** 1..5 as the user tapped it. */
  score: number
}

export type Confidence = 'none' | 'early' | 'emerging' | 'clear'

export interface Read {
  /** Null until there is genuinely enough to say. Never guess here. */
  lean: MindsetId | null
  runnerUp: MindsetId | null
  confidence: Confidence
  /** Axis position, -2..+2. Zero also means "no answers yet" — check coverage. */
  axes: Record<AxisId, number>
  /** How many answers landed on each axis. */
  coverage: Record<AxisId, number>
  answered: number
  /** 0..1, for the "how much of the picture is known" readout. */
  completeness: number
}

/** A 1..5 tap becomes -2..+2, then the item's direction decides the sign. */
export function contribution(answer: ScoredAnswer): number {
  return (answer.score - 3) * answer.direction
}

function distance(axes: Record<AxisId, number>, coords: Record<AxisId, number>): number {
  let sum = 0
  for (const id of AXIS_IDS) {
    const d = axes[id] - coords[id]
    sum += d * d
  }
  return Math.sqrt(sum)
}

/**
 * Turn a pile of answers into a read.
 *
 * Deliberately returns `lean: null` rather than a weak guess when there isn't
 * enough behind it — "too early to say" is an honest thing to render and a
 * better first impression than a confident wrong answer on day two.
 */
export function computeRead(answers: ScoredAnswer[]): Read {
  const totals: Record<AxisId, number> = { agency: 0, discipline: 0, inquiry: 0, faith: 0 }
  const coverage: Record<AxisId, number> = { agency: 0, discipline: 0, inquiry: 0, faith: 0 }

  for (const a of answers) {
    if (!AXIS_IDS.includes(a.axis)) continue
    totals[a.axis] += contribution(a)
    coverage[a.axis] += 1
  }

  const axes: Record<AxisId, number> = { agency: 0, discipline: 0, inquiry: 0, faith: 0 }
  for (const id of AXIS_IDS) {
    axes[id] = coverage[id] > 0 ? totals[id] / coverage[id] : 0
  }

  const answered = answers.length
  const completeness = Math.min(1, answered / FULL_PICTURE)
  const everyAxisHeardFrom = AXIS_IDS.every(id => coverage[id] > 0)

  if (answered < MIN_ANSWERS_FOR_READ || !everyAxisHeardFrom) {
    return { lean: null, runnerUp: null, confidence: 'none', axes, coverage, answered, completeness }
  }

  const ranked = (Object.keys(MINDSET_COORDS) as MindsetId[])
    .map(id => ({ id, d: distance(axes, MINDSET_COORDS[id]) }))
    .sort((a, b) => a.d - b.d)

  const margin = ranked[1].d - ranked[0].d

  // Margin, not answer count, decides how loudly we say it: plenty of answers
  // sitting exactly between two mindsets is a genuinely ambiguous result and
  // should read that way.
  let confidence: Confidence = 'early'
  if (margin >= 1.0 && answered >= 20) confidence = 'clear'
  else if (margin >= 0.5) confidence = 'emerging'

  return {
    lean: ranked[0].id,
    runnerUp: ranked[1].id,
    confidence,
    axes,
    coverage,
    answered,
    completeness,
  }
}
