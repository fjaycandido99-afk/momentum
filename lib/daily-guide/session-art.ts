/**
 * Session art rotation — deterministic, date-seeded.
 *
 * Each session has a base image plus an optional set of variants in
 * `/public/sessions/<session>_NN.jpg` (NN = 02, 03, …). Given a date,
 * `getSessionImage` returns the same variant for the whole day, then
 * rotates the next day. Same day = same image (no flicker on refresh,
 * no mismatch between the home card and the fullscreen player).
 *
 * Drop a new `morning_prime_05.jpg` into /public/sessions/ + add it to
 * SESSION_VARIANTS below and the rotation expands automatically — no
 * other code needs to change.
 */
import type { SessionType } from './decision-tree'

const SESSION_BASE: Record<SessionType, string> = {
  morning_prime: '/sessions/morning_prime.jpg',
  midday_reset: '/sessions/midday_reset.jpg',
  wind_down: '/sessions/wind_down.jpg',
  bedtime_story: '/sessions/bedtime_story.jpg',
}

// Numbered variants currently available on disk (besides the base image).
// Keep in sync with files in /public/sessions/. The base image is always
// slot 0, so listing `02, 03, 04` here means the pool has 4 images.
const SESSION_VARIANTS: Record<SessionType, string[]> = {
  morning_prime: [
    '/sessions/morning_prime_02.jpg',
    '/sessions/morning_prime_03.jpg',
    '/sessions/morning_prime_04.jpg',
  ],
  midday_reset: [],
  wind_down: [],
  bedtime_story: [],
}

/**
 * Stable day-of-year hash. Same date in any timezone resolves to the
 * same number — we only care that it's monotonic-ish and deterministic.
 */
function dayHash(date: Date): number {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  // Fold y/m/d together with a prime so adjacent days land far apart in
  // the modulo space (no two consecutive days picking the same variant
  // when the pool grows past 2).
  return Math.abs(y * 373 + m * 31 + d * 17)
}

/**
 * Pick the session's image for a given day. Deterministic: same date +
 * same pool → same image. Defaults to the base image when there are no
 * variants yet.
 */
export function getSessionImage(session: SessionType, date: Date = new Date()): string {
  const base = SESSION_BASE[session]
  const variants = SESSION_VARIANTS[session]
  if (!variants || variants.length === 0) return base
  const pool = [base, ...variants]
  const idx = dayHash(date) % pool.length
  return pool[idx]
}
