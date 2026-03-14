import type { SessionType } from './decision-tree'
import { getCurrentSession } from './decision-tree'

export type { SessionType }

/**
 * Get ISO date string from a Date
 */
export function getDateString(date: Date): string {
  return date.toISOString().split('T')[0] // "2025-01-21"
}

/**
 * Parse "HH:MM" time string
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours, minutes }
}

/**
 * Get the current session type based on time and wake time
 */
export function getActiveSession(
  now: Date = new Date(),
  wakeTime: string = '07:00'
): SessionType {
  return getCurrentSession(now, wakeTime)
}

/**
 * Get human-readable date string
 */
export function getFormattedDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const dayName = days[date.getDay()]
  const monthName = months[date.getMonth()]
  const dayNum = date.getDate()

  return `${dayName}, ${monthName} ${dayNum}`
}

/**
 * Format time window for display (e.g., "5am - 11am")
 */
export function formatTimeWindow(startHour: number, endHour: number): string {
  const fmt = (h: number) => {
    const period = h >= 12 && h < 24 ? 'pm' : 'am'
    const display = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${display}${period}`
  }
  return `${fmt(startHour)} - ${fmt(endHour)}`
}
