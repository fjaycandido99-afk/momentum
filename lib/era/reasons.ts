/**
 * The two fixed lists behind a check-in: what got in the way of a promise,
 * and what helped keep one.
 *
 * Fixed, not free text, for three reasons: one tap is all anyone will spend
 * at 9pm; a closed list can be counted across days without reading anyone's
 * words; and a stored key stays meaningful when the wording changes. The
 * KEYS are the contract — rename a label freely, never a key, or every row
 * already collected stops matching.
 *
 * Both are always optional. A check-in must never wait on a second question.
 */

export interface Reason {
  key: string
  /** What the chip says. */
  label: string
}

/** Asked only after a missed promise. */
export const BLOCKERS: Reason[] = [
  { key: 'too_tired', label: 'Too tired' },
  { key: 'no_time', label: 'No time' },
  { key: 'forgot', label: 'Forgot' },
  { key: 'put_it_off', label: 'Put it off' },
  { key: 'too_big', label: 'Too big' },
  { key: 'life_happened', label: 'Life happened' },
]

/** Asked after a kept promise. */
export const HELPERS: Reason[] = [
  { key: 'started_early', label: 'Started early' },
  { key: 'kept_it_small', label: 'Kept it small' },
  { key: 'the_audio', label: 'The audio' },
  { key: 'the_reminder', label: 'The reminder' },
  { key: 'someone_knew', label: 'Someone knew' },
  { key: 'just_wanted_it', label: 'Just wanted it' },
]

const BLOCKER_KEYS = new Set(BLOCKERS.map(b => b.key))
const HELPER_KEYS = new Set(HELPERS.map(h => h.key))

export const isBlocker = (value: unknown): value is string =>
  typeof value === 'string' && BLOCKER_KEYS.has(value)

export const isHelper = (value: unknown): value is string =>
  typeof value === 'string' && HELPER_KEYS.has(value)

export function reasonLabel(key: string | null | undefined): string | null {
  if (!key) return null
  return BLOCKERS.find(b => b.key === key)?.label ?? HELPERS.find(h => h.key === key)?.label ?? key
}

/**
 * How sure they are before making the promise, 1–5. Optional: a promise is
 * never held up by it, and a missing answer is a missing answer, never a 3.
 */
export const CONFIDENCE_MIN = 1
export const CONFIDENCE_MAX = 5

export function parseConfidence(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isInteger(n) || n < CONFIDENCE_MIN || n > CONFIDENCE_MAX) return null
  return n
}

/** The word under each dot on the scale. */
export const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Not sure',
  2: 'Maybe',
  3: 'Even odds',
  4: 'Pretty sure',
  5: 'Certain',
}
