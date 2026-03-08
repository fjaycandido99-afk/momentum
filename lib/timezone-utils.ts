/**
 * Timezone utilities for scheduling notifications at the right local time.
 *
 * Used by push-service.ts to filter users whose local hour matches
 * the desired notification time.
 */

/**
 * Get the current hour (0-23) in a given IANA timezone.
 * Returns null if timezone is invalid.
 */
export function getCurrentHourInTimezone(timezone: string): number | null {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const hour = parseInt(formatter.format(now), 10)
    return isNaN(hour) ? null : hour
  } catch {
    return null
  }
}

/**
 * Check if a user's local time matches a target hour.
 * Falls back to UTC if no timezone is set.
 */
export function isLocalHour(timezone: string | null | undefined, targetHour: number): boolean {
  if (!timezone) {
    // No timezone stored — fall back to UTC
    return new Date().getUTCHours() === targetHour
  }
  const localHour = getCurrentHourInTimezone(timezone)
  if (localHour === null) {
    return new Date().getUTCHours() === targetHour
  }
  return localHour === targetHour
}

/**
 * Get all IANA timezones where the current local hour matches the target.
 * Useful for batching: instead of checking per-user, find which timezones
 * are currently at the target hour.
 */
export function getTimezonesAtHour(targetHour: number): Set<string> {
  const matching = new Set<string>()
  // Check common timezone offsets (-12 to +14)
  const now = new Date()
  const utcHour = now.getUTCHours()

  // The offset (in hours) needed for local time to be targetHour
  // offset = targetHour - utcHour (mod 24)
  const neededOffset = ((targetHour - utcHour) % 24 + 24) % 24

  // Common IANA timezones grouped by typical offset
  const COMMON_TIMEZONES = [
    'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles',
    'America/Denver', 'America/Chicago', 'America/New_York',
    'America/Sao_Paulo', 'Atlantic/Reykjavik', 'Europe/London',
    'Europe/Paris', 'Europe/Helsinki', 'Europe/Moscow',
    'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Shanghai',
    'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
    'America/Phoenix', 'America/Toronto', 'America/Vancouver',
    'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
    'Asia/Singapore', 'Asia/Seoul', 'Asia/Manila',
  ]

  for (const tz of COMMON_TIMEZONES) {
    const hour = getCurrentHourInTimezone(tz)
    if (hour === targetHour) {
      matching.add(tz)
    }
  }

  return matching
}
