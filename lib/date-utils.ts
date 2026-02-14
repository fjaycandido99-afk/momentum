/**
 * Shared date utilities to avoid repeating date initialization patterns.
 */

/** Returns today's date at midnight (00:00:00.000) */
export function getTodayDate(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Returns today's date as ISO string (YYYY-MM-DD) */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

/** Converts a Date to ISO date string (YYYY-MM-DD) */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/** Returns a Date N days ago at midnight */
export function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}
