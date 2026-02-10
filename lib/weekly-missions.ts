export interface WeeklyMission {
  id: string
  title: string
  description: string
  icon: string
  xpReward: number
  target: number
  condition: MissionCondition
}

export type MissionCondition =
  | { type: 'journal_days'; days: number }
  | { type: 'modules_total'; count: number }
  | { type: 'xp_earned'; amount: number }
  | { type: 'streak_maintain'; days: number }
  | { type: 'breathing_sessions'; count: number }
  | { type: 'mood_logs'; count: number }
  | { type: 'active_days'; days: number }
  | { type: 'routines_complete'; count: number }

const MISSION_POOL: WeeklyMission[] = [
  { id: 'journal_5', title: 'Journal Journey', description: 'Write in your journal 5 days this week', icon: '📝', xpReward: 100, target: 5, condition: { type: 'journal_days', days: 5 } },
  { id: 'modules_20', title: 'Module Marathon', description: 'Complete 20 modules this week', icon: '🏃', xpReward: 150, target: 20, condition: { type: 'modules_total', count: 20 } },
  { id: 'xp_200', title: 'XP Surge', description: 'Earn 200 XP this week', icon: '⚡', xpReward: 75, target: 200, condition: { type: 'xp_earned', amount: 200 } },
  { id: 'streak_7', title: 'Streak Keeper', description: 'Maintain your streak all week', icon: '🔥', xpReward: 100, target: 7, condition: { type: 'streak_maintain', days: 7 } },
  { id: 'breathe_5', title: 'Zen Master', description: 'Do 5 breathing sessions this week', icon: '🌬️', xpReward: 75, target: 5, condition: { type: 'breathing_sessions', count: 5 } },
  { id: 'mood_5', title: 'Self Check', description: 'Log your mood 5 times this week', icon: '🧠', xpReward: 60, target: 5, condition: { type: 'mood_logs', count: 5 } },
  { id: 'active_6', title: 'Six-Pack', description: 'Be active 6 days this week', icon: '💪', xpReward: 120, target: 6, condition: { type: 'active_days', days: 6 } },
  { id: 'routines_3', title: 'Routine Master', description: 'Complete 3 routines this week', icon: '📋', xpReward: 80, target: 3, condition: { type: 'routines_complete', count: 3 } },
]

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function weekToSeed(weekStr: string): number {
  let hash = 0
  for (let i = 0; i < weekStr.length; i++) {
    hash = ((hash << 5) - hash + weekStr.charCodeAt(i)) | 0
  }
  return Math.abs(hash + 7777) // Different offset from daily
}

/** Get the ISO week string for a date (YYYY-WNN) */
export function getWeekString(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

/** Get 2 deterministic weekly missions for a given week string */
export function getWeeklyMissions(weekStr: string): WeeklyMission[] {
  const rand = seededRandom(weekToSeed(weekStr))
  const pool = [...MISSION_POOL]

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, 2)
}

/** Check mission progress */
export function checkMissionProgress(
  condition: MissionCondition,
  weekData: {
    journalDays: number
    modulesCompleted: number
    xpEarned: number
    streak: number
    breathingSessions: number
    moodLogs: number
    activeDays: number
    routinesCompleted: number
  }
): { progress: number; target: number; completed: boolean } {
  let progress = 0
  let target = 0

  switch (condition.type) {
    case 'journal_days':
      progress = weekData.journalDays; target = condition.days; break
    case 'modules_total':
      progress = weekData.modulesCompleted; target = condition.count; break
    case 'xp_earned':
      progress = weekData.xpEarned; target = condition.amount; break
    case 'streak_maintain':
      progress = Math.min(weekData.streak, condition.days); target = condition.days; break
    case 'breathing_sessions':
      progress = weekData.breathingSessions; target = condition.count; break
    case 'mood_logs':
      progress = weekData.moodLogs; target = condition.count; break
    case 'active_days':
      progress = weekData.activeDays; target = condition.days; break
    case 'routines_complete':
      progress = weekData.routinesCompleted; target = condition.count; break
  }

  return { progress: Math.min(progress, target), target, completed: progress >= target }
}
