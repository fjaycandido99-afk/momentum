export const XP_REWARDS = {
  dailyGuideComplete: 50,
  moduleComplete: 10,
  journalEntry: 20,
  streakDay: 5,
  breathingSession: 15,
  focusSession: 25,
  coachChat: 10,
  routineComplete: 30,
} as const

export type XPEventType = keyof typeof XP_REWARDS

export interface Level {
  level: number
  title: string
  minXP: number
  color: string
}

export const LEVELS: Level[] = [
  { level: 1, title: 'Beginner', minXP: 0, color: 'text-gray-400' },
  { level: 2, title: 'Seeker', minXP: 100, color: 'text-blue-400' },
  { level: 3, title: 'Explorer', minXP: 300, color: 'text-cyan-400' },
  { level: 4, title: 'Achiever', minXP: 600, color: 'text-green-400' },
  { level: 5, title: 'Warrior', minXP: 1000, color: 'text-yellow-400' },
  { level: 6, title: 'Champion', minXP: 1500, color: 'text-orange-400' },
  { level: 7, title: 'Master', minXP: 2200, color: 'text-red-400' },
  { level: 8, title: 'Sage', minXP: 3000, color: 'text-purple-400' },
  { level: 9, title: 'Enlightened', minXP: 4000, color: 'text-indigo-400' },
  { level: 10, title: 'Cosmic Master', minXP: 5500, color: 'text-amber-400' },
]

const XP_STORAGE_KEY = 'voxu_xp_log'

interface XPLogEntry {
  type: XPEventType
  xp: number
  timestamp: number
}

function getXPLog(): XPLogEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(XP_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveXPLog(log: XPLogEntry[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(XP_STORAGE_KEY, JSON.stringify(log))
  } catch {
    // Storage full or unavailable
  }
}

export function logXPEvent(eventType: XPEventType): number {
  const xp = XP_REWARDS[eventType]
  const log = getXPLog()
  log.push({ type: eventType, xp, timestamp: Date.now() })
  saveXPLog(log)
  return xp
}

export function getTotalXP(): number {
  const log = getXPLog()
  return log.reduce((sum, entry) => sum + entry.xp, 0)
}

export function getLevelFromXP(xp: number): { current: Level; next: Level | null; progress: number } {
  let current = LEVELS[0]
  for (const level of LEVELS) {
    if (xp >= level.minXP) {
      current = level
    } else {
      break
    }
  }

  const currentIndex = LEVELS.indexOf(current)
  const next = currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null

  let progress = 1
  if (next) {
    const range = next.minXP - current.minXP
    progress = range > 0 ? (xp - current.minXP) / range : 1
  }

  return { current, next, progress }
}

export function getTodaysXP(): number {
  const log = getXPLog()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayMs = todayStart.getTime()
  return log
    .filter(entry => entry.timestamp >= todayMs)
    .reduce((sum, entry) => sum + entry.xp, 0)
}
