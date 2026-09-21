/**
 * One way to dismiss things, instead of eleven.
 *
 * Before this, every card hand-rolled its own storage: some in
 * sessionStorage (so they came back on every cold launch), some in component
 * state (so they came back on every navigation), some with a UTC date key (so
 * "today" rolled over at the wrong hour), and some with no off switch at all.
 * The app ended up shouting at people who had already answered it.
 *
 * The rules here:
 *  - A dismissal is remembered in localStorage, keyed by id.
 *  - "Today" means the user's LOCAL day, never UTC.
 *  - Storage may be unavailable (private windows, embedded webviews); every
 *    access is guarded and a failure means "not dismissed", which shows the
 *    card. Never hide content because storage threw.
 */

const PREFIX = 'voxu.dismissed.'

/** Dismissed for good. */
export const FOREVER = 'forever'

/** YYYY-MM-DD in the device's own timezone. */
export function localDayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Pure: does a stored value hide the thing today?
 *
 * Anything unrecognised is treated as "not dismissed" — a corrupt value must
 * not silently hide a card for ever.
 */
export function hiddenByValue(value: string | null, today: string): boolean {
  if (!value) return false
  if (value === FOREVER) return true
  return value === today
}

/** Pure: what to store for a dismissal. */
export function valueFor(scope: 'forever' | 'today', today: string): string {
  return scope === 'forever' ? FOREVER : today
}

export function isDismissed(id: string, at = new Date()): boolean {
  try {
    return hiddenByValue(localStorage.getItem(PREFIX + id), localDayKey(at))
  } catch {
    return false
  }
}

export function setDismissed(id: string, scope: 'forever' | 'today' = 'forever', at = new Date()): void {
  try {
    localStorage.setItem(PREFIX + id, valueFor(scope, localDayKey(at)))
  } catch {
    // A dismissal that can't be stored is still a dismissal for this view.
  }
}

export function clearDismissed(id: string): void {
  try {
    localStorage.removeItem(PREFIX + id)
  } catch {
    // Nothing to do.
  }
}

/**
 * Drop day-scoped dismissals from previous days.
 *
 * Without this the keys accumulate for ever — one per card per day — and
 * localStorage is a few megabytes shared with everything else the app keeps.
 */
export function sweepDismissals(at = new Date()): void {
  try {
    const today = localDayKey(at)
    const stale: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(PREFIX)) continue
      const value = localStorage.getItem(key)
      if (value && value !== FOREVER && value !== today) stale.push(key)
    }
    for (const key of stale) localStorage.removeItem(key)
  } catch {
    // Not worth a single visible error.
  }
}
