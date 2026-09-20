/**
 * The era funnel, shaped for the founder view (/dev-analytics).
 *
 * Most of it is counted from real rows — Era, EraPromise, EraReferral — not
 * from events, so it is accurate and works for eras that started before any
 * tracking existed. Only the steps that leave no row behind (seeing the
 * picker, opening the share sheet, visiting a join link) come from
 * FeatureEvent.
 *
 * Rules here exist because a funnel that lies is worse than no funnel:
 *   - No denominator, no percentage. Zero of zero is "—", never 0%.
 *   - A step that can exceed the one above it (events vs rows, or a visit by
 *     someone who never signed in) is flagged instead of silently reading
 *     like a >100% conversion.
 */

export interface FunnelStep {
  key: string
  label: string
  value: number
  /** Shown under the label — e.g. what the number counts, or its caveat. */
  note?: string
  /** Counts visits/events rather than people, so it can outrun the step above. */
  events?: boolean
}

export interface FunnelRow extends FunnelStep {
  /** Share of the first step, 0–100, or null when there's nothing to divide by. */
  ofTop: number | null
  /** Share of the step above, 0–100, or null. */
  ofPrev: number | null
  /** Bigger than the step above it — real, but not a conversion. */
  anomaly: boolean
}

function percent(value: number, base: number): number | null {
  if (base <= 0) return null
  return Math.round((value / base) * 1000) / 10
}

export function funnelRows(steps: FunnelStep[]): FunnelRow[] {
  const top = steps[0]?.value ?? 0
  return steps.map((step, i) => {
    const prev = i === 0 ? null : steps[i - 1].value
    return {
      ...step,
      ofTop: i === 0 ? null : percent(step.value, top),
      ofPrev: prev === null ? null : percent(step.value, prev),
      anomaly: prev !== null && step.value > prev,
    }
  })
}

/** kept / answered as a percentage, or null before anything is answered. */
export function keptRate(kept: number, answered: number): number | null {
  return percent(kept, answered)
}

/** "3 of 10 (30%)" / "0 of 0" — a count that never invents a rate. */
export function rateLabel(part: number, whole: number): string {
  const p = percent(part, whole)
  return p === null ? `${part} of ${whole}` : `${part} of ${whole} (${p}%)`
}

export interface EraKeyStat {
  key: string
  starts: number
  promises: number
  kept: number
  answered: number
}

export interface EraKeyRow extends EraKeyStat {
  keptPercent: number | null
  promisesPerEra: number | null
}

/** Per-era breakdown, most-started first, ties alphabetical for a stable order. */
export function eraKeyRows(stats: EraKeyStat[]): EraKeyRow[] {
  return [...stats]
    .sort((a, b) => b.starts - a.starts || a.key.localeCompare(b.key))
    .map(s => ({
      ...s,
      keptPercent: keptRate(s.kept, s.answered),
      promisesPerEra: s.starts > 0 ? Math.round((s.promises / s.starts) * 10) / 10 : null,
    }))
}
