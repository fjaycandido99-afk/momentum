export const XP_REWARDS = {
  dailyGuideComplete: 50,
  moduleComplete: 10,
  journalEntry: 20,
  streakDay: 5,
  breathingSession: 15,
  focusSession: 25,
  coachChat: 10,
  routineComplete: 30,
  accountabilityCheckIn: 10,
  pathActivity: 10,
  streakRecovery: 10,
  morningBriefing: 15,
  monthlyReview: 30,
  letterToSelf: 20,
  dailyIntention: 5,
  dailyBonus: 25,
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

/** Log XP event to the server */
export async function logXPEventServer(
  eventType: XPEventType,
  source?: string
): Promise<{
  totalXP: number
  todaysXP: number
  level: number
  newAchievements: { id: string; title: string; xpReward: number }[]
} | null> {
  try {
    const res = await fetch('/api/gamification/xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, source }),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/** One-time migration from localStorage to server */
export async function migrateLocalXP(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const XP_STORAGE_KEY = 'voxu_xp_log'
  const MIGRATED_KEY = 'voxu_xp_migrated'

  try {
    // Skip if already migrated
    if (localStorage.getItem(MIGRATED_KEY)) return false

    const raw = localStorage.getItem(XP_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(MIGRATED_KEY, '1')
      return false
    }

    const entries: { type: string; xp: number; timestamp: number }[] = JSON.parse(raw)
    if (entries.length === 0) {
      localStorage.setItem(MIGRATED_KEY, '1')
      return false
    }

    const res = await fetch('/api/gamification/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    })

    if (res.ok) {
      localStorage.setItem(MIGRATED_KEY, '1')
      return true
    }
    return false
  } catch {
    return false
  }
}
