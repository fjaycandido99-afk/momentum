import type { Pulse } from './engine'

/**
 * The latest Pulse home has loaded, for the one-per-open moment to read when
 * its timer fires — so the nudge never costs a second /api/pulse request.
 * Module state, not a context: it is read once, at fire time.
 */
let latest: Pulse | null = null

export function setLatestPulse(p: Pulse | null): void {
  latest = p
}

export function getLatestPulse(): Pulse | null {
  return latest
}
