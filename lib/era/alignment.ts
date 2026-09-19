import { AXES, contribution, type AxisId } from '@/lib/assessment/axes'

/**
 * Era × Daily Read: is the way someone answers moving toward who their era
 * says they're becoming?
 *
 * Each era targets one Daily Read axis in one direction (lib/era/programs
 * readTarget) — Discipline Era toward "Holds a structure", Stoic Mode toward
 * "Accepts what comes". Answers on that axis are split at the era's start:
 * the ones before are the baseline, the ones during are the era.
 *
 * Honest by construction. It's one self-reported question a day, so:
 *  - nothing is said until the era has MIN_DURING answers on the axis;
 *  - it only ever names a direction ("more like someone who…"), never a
 *    score or a percentage;
 *  - a small wobble reads as "steady", not as progress.
 */

export interface ReadTarget {
  axis: AxisId
  /** +1 toward the axis's high pole, -1 toward its low pole. */
  direction: 1 | -1
}

export interface AlignmentAnswer {
  axis: AxisId
  direction: 1 | -1
  score: number
  local_day: string
}

export type AlignmentStatus = 'early' | 'toward' | 'steady' | 'away'

export interface EraAlignment {
  status: AlignmentStatus
  axis: AxisId
  /** The pole the era is aiming at, e.g. "Holds a structure". */
  toward: string
  /** The opposite pole, e.g. "Follows the day". */
  away: string
  /** Answers on the axis since the era began. */
  duringCount: number
  /** How many more are needed before anything is said (0 once it speaks). */
  needed: number
}

/** Answers on the era's axis before anything is said. */
export const MIN_DURING = 5
/** Baseline answers needed to compare against, rather than against neutral. */
const MIN_BASELINE = 3
/** How far (on the -2..+2 scale) counts as movement rather than wobble. */
const SHIFT = 0.4
/** Without a baseline: how far from neutral counts as leaning. */
const LEAN = 0.5

export function computeAlignment(target: ReadTarget, answers: AlignmentAnswer[], startDay: string): EraAlignment {
  const axisInfo = AXES.find(a => a.id === target.axis)!
  const toward = target.direction > 0 ? axisInfo.high : axisInfo.low
  const away = target.direction > 0 ? axisInfo.low : axisInfo.high

  const onAxis = answers.filter(a => a.axis === target.axis)
  const during = onAxis.filter(a => a.local_day >= startDay)
  const before = onAxis.filter(a => a.local_day < startDay)

  const base = { axis: target.axis, toward, away, duringCount: during.length }
  if (during.length < MIN_DURING) {
    return { ...base, status: 'early', needed: MIN_DURING - during.length }
  }

  // Mean position on the axis, signed so positive means "toward the era".
  const lean = (xs: AlignmentAnswer[]) =>
    (xs.reduce((sum, a) => sum + contribution(a), 0) / xs.length) * target.direction

  const now = lean(during)
  let status: AlignmentStatus
  if (before.length >= MIN_BASELINE) {
    const shift = now - lean(before)
    status = shift >= SHIFT ? 'toward' : shift <= -SHIFT ? 'away' : 'steady'
  } else {
    status = now >= LEAN ? 'toward' : now <= -LEAN ? 'away' : 'steady'
  }
  return { ...base, status, needed: 0 }
}

/** One line for people, in the Daily Read's own words. */
export function alignmentLine(a: EraAlignment): string {
  const who = a.toward.charAt(0).toLowerCase() + a.toward.slice(1)
  switch (a.status) {
    case 'early':
      return `Your Daily Read will show whether you're becoming someone who ${who} — ${a.needed} more answer${a.needed === 1 ? '' : 's'}.`
    case 'toward':
      return `Since this era began, you're answering more like someone who ${who}.`
    case 'steady':
      return `Your answers haven't moved much yet. Becoming someone who ${who} takes more than a few days.`
    case 'away': {
      const drift = a.away.charAt(0).toLowerCase() + a.away.slice(1)
      return `Your answers are drifting toward someone who ${drift}. Worth noticing — not a verdict.`
    }
  }
}
