/**
 * Daily Guide Decision Tree (v2)
 *
 * Simplified to 4 time-based audio sessions:
 * - Morning Prime (wake → 11am)
 * - Midday Reset (11am → 4pm)
 * - Wind Down (4pm → 9pm)
 * - Bedtime Story (9pm → wake)
 *
 * Auto-selects the current session based on time of day.
 * Time windows adjust based on user's wake_time preference.
 */

export type SessionType = 'morning_prime' | 'midday_reset' | 'wind_down' | 'bedtime_story'

export type GuideTone = 'calm' | 'direct' | 'neutral'

export type SessionStatus = 'completed' | 'current' | 'upcoming' | 'missed'

export interface SessionConfig {
  id: SessionType
  name: string
  tagline: string
  startHour: number // 24h format
  endHour: number   // 24h format
}

export interface SessionState {
  session: SessionConfig
  status: SessionStatus
}

export interface TimeWindows {
  morning_prime: { start: number; end: number }
  midday_reset: { start: number; end: number }
  wind_down: { start: number; end: number }
  bedtime_story: { start: number; end: number }
}

// Session metadata
export const SESSIONS: SessionConfig[] = [
  {
    id: 'morning_prime',
    name: 'Morning Prime',
    tagline: 'Wake up, set intention, energy',
    startHour: 5,
    endHour: 11,
  },
  {
    id: 'midday_reset',
    name: 'Midday Reset',
    tagline: 'Recharge, affirm, refocus',
    startHour: 11,
    endHour: 16,
  },
  {
    id: 'wind_down',
    name: 'Wind Down',
    tagline: 'Reflect, release, ground',
    startHour: 16,
    endHour: 21,
  },
  {
    id: 'bedtime_story',
    name: 'Bedtime Story',
    tagline: 'Motivational sleep story',
    startHour: 21,
    endHour: 5, // wraps to next day
  },
]

// Session durations in seconds
export const SESSION_DURATIONS: Record<SessionType, number> = {
  morning_prime: 120,   // 2 min
  midday_reset: 120,    // 2 min
  wind_down: 120,       // 2 min
  bedtime_story: 420,   // ~7 min (6-8 min stories)
}

/**
 * Parse "HH:MM" time string to hour number
 */
function parseHour(timeStr: string): number {
  const [h] = timeStr.split(':').map(Number)
  return h
}

/**
 * Get time windows adjusted by user's wake time.
 * The wake time shifts the morning start; other windows adjust proportionally.
 */
export function getTimeWindows(wakeTime: string = '07:00'): TimeWindows {
  const wake = parseHour(wakeTime)

  // Morning Prime: wake time → wake + 6 hours (capped at reasonable midday)
  const morningEnd = Math.min(wake + 6, 14)
  // Midday Reset: morning end → morning end + 5 hours
  const middayEnd = Math.min(morningEnd + 5, 19)
  // Wind Down: midday end → midday end + 4 hours (max 23)
  const windDownEnd = Math.min(middayEnd + 4, 23)
  // Bedtime Story: wind down end → wake time (next day)

  return {
    morning_prime: { start: wake, end: morningEnd },
    midday_reset: { start: morningEnd, end: middayEnd },
    wind_down: { start: middayEnd, end: windDownEnd },
    bedtime_story: { start: windDownEnd, end: wake },
  }
}

/**
 * Get the current session based on time of day
 */
export function getCurrentSession(now: Date = new Date(), wakeTime: string = '07:00'): SessionType {
  const hour = now.getHours()
  const windows = getTimeWindows(wakeTime)

  // Check each window (bedtime_story wraps around midnight)
  if (hour >= windows.morning_prime.start && hour < windows.morning_prime.end) {
    return 'morning_prime'
  }
  if (hour >= windows.midday_reset.start && hour < windows.midday_reset.end) {
    return 'midday_reset'
  }
  if (hour >= windows.wind_down.start && hour < windows.wind_down.end) {
    return 'wind_down'
  }
  // Everything else is bedtime story (late night + early morning before wake)
  return 'bedtime_story'
}

/**
 * Get all 4 sessions with their current status
 */
export function getAllSessionsStatus(
  completedSessions: SessionType[],
  now: Date = new Date(),
  wakeTime: string = '07:00'
): SessionState[] {
  const currentSession = getCurrentSession(now, wakeTime)
  const windows = getTimeWindows(wakeTime)
  const hour = now.getHours()

  // Session order for the day
  const sessionOrder: SessionType[] = ['morning_prime', 'midday_reset', 'wind_down', 'bedtime_story']
  const currentIndex = sessionOrder.indexOf(currentSession)

  return SESSIONS.map((session, index) => {
    const isCompleted = completedSessions.includes(session.id)
    const isCurrent = session.id === currentSession

    let status: SessionStatus
    if (isCompleted) {
      status = 'completed'
    } else if (isCurrent) {
      status = 'current'
    } else if (index < currentIndex) {
      status = 'missed' // past window, not completed
    } else {
      status = 'upcoming'
    }

    return { session, status }
  })
}

/**
 * Get session config by ID
 */
export function getSessionConfig(sessionId: SessionType): SessionConfig {
  return SESSIONS.find(s => s.id === sessionId) || SESSIONS[0]
}

/**
 * Format time estimate for display
 */
export function formatTimeEstimate(seconds: number): string {
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}
