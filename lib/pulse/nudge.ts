/**
 * Which Pulse moment deserves the one interstitial of this app open.
 *
 * Only two kinds ever interrupt: a discipline SLIPPING and one DUE NOW —
 * the moments where acting in the next few minutes changes the day. The
 * gates (yesterday, the morning check-in) and the promise already have the
 * era moment; everything else waits on home.
 *
 * Each (discipline, kind) interrupts at most once a local day: showing it
 * spends it. So a discipline can nudge twice in a day at most — due now,
 * then slipping — and never twice the same way.
 *
 * Pure.
 */

import type { Pulse, RightNow } from './engine'

export interface PulseNudge {
  /** Dismissal key: spent once shown, until tomorrow. */
  key: string
  rightNow: RightNow
  primary: string
}

export function nudgeKey(rightNow: RightNow): string | null {
  if (rightNow.kind !== 'slipping' && rightNow.kind !== 'due_now') return null
  const t = rightNow.action?.target
  if (!t || t.type !== 'practice') return null
  return `pulse-nudge-${t.id}-${rightNow.kind}`
}

export function pickNudge(pulse: Pulse | null, isSpent: (key: string) => boolean): PulseNudge | null {
  const r = pulse?.rightNow
  if (!r) return null
  const key = nudgeKey(r)
  if (!key || isSpent(key)) return null
  return { key, rightNow: r, primary: r.kind === 'slipping' ? 'Do the minimum' : 'Start now' }
}
