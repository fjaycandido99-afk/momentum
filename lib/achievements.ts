export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type AchievementCategory = 'consistency' | 'explorer' | 'dedication' | 'mastery' | 'growth' | 'secret'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  rarity: AchievementRarity
  xpReward: number
  condition: AchievementCondition
}

export type AchievementCondition =
  | { type: 'streak'; days: number }
  | { type: 'first_action'; action: string }
  | { type: 'count'; action: string; count: number }
  | { type: 'xp_total'; amount: number }
  | { type: 'level'; level: number }
  | { type: 'time_range'; start: number; end: number; action: string }
  | { type: 'consecutive_days'; days: number; action: string }

export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: 'border-gray-400/40',
  rare: 'border-blue-400/50',
  epic: 'border-purple-400/60',
  legendary: 'border-amber-400/70',
}

export const RARITY_BG: Record<AchievementRarity, string> = {
  common: 'bg-gray-400/10',
  rare: 'bg-blue-400/10',
  epic: 'bg-purple-400/10',
  legendary: 'bg-amber-400/10',
}

export const RARITY_TEXT: Record<AchievementRarity, string> = {
  common: 'text-gray-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-amber-400',
}

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  consistency: 'Consistency',
  explorer: 'Explorer',
  dedication: 'Dedication',
  mastery: 'Mastery',
  growth: 'Growth',
  secret: 'Secret',
}

export const ACHIEVEMENTS: Achievement[] = [
  // --- Consistency (7) ---
  { id: 'streak_3', title: 'Getting Started', description: 'Reach a 3-day streak', icon: '🔥', category: 'consistency', rarity: 'common', xpReward: 25, condition: { type: 'streak', days: 3 } },
  { id: 'streak_7', title: 'Week Warrior', description: 'Reach a 7-day streak', icon: '🔥', category: 'consistency', rarity: 'common', xpReward: 50, condition: { type: 'streak', days: 7 } },
  { id: 'streak_14', title: 'Two Week Titan', description: 'Reach a 14-day streak', icon: '💪', category: 'consistency', rarity: 'rare', xpReward: 100, condition: { type: 'streak', days: 14 } },
  { id: 'streak_30', title: 'Monthly Master', description: 'Reach a 30-day streak', icon: '🏆', category: 'consistency', rarity: 'rare', xpReward: 200, condition: { type: 'streak', days: 30 } },
  { id: 'streak_60', title: 'Unstoppable', description: 'Reach a 60-day streak', icon: '⚡', category: 'consistency', rarity: 'epic', xpReward: 400, condition: { type: 'streak', days: 60 } },
  { id: 'streak_100', title: 'Century Club', description: 'Reach a 100-day streak', icon: '💯', category: 'consistency', rarity: 'epic', xpReward: 600, condition: { type: 'streak', days: 100 } },
  { id: 'streak_365', title: 'Year of Growth', description: 'Reach a 365-day streak', icon: '👑', category: 'consistency', rarity: 'legendary', xpReward: 1000, condition: { type: 'streak', days: 365 } },

  // --- Explorer (5) ---
  { id: 'first_journal', title: 'Dear Diary', description: 'Write your first journal entry', icon: '📝', category: 'explorer', rarity: 'common', xpReward: 20, condition: { type: 'first_action', action: 'journal' } },
  { id: 'first_soundscape', title: 'Sound Explorer', description: 'Listen to your first soundscape', icon: '🎧', category: 'explorer', rarity: 'common', xpReward: 20, condition: { type: 'first_action', action: 'soundscape' } },
  { id: 'first_routine', title: 'Routine Builder', description: 'Create your first routine', icon: '📋', category: 'explorer', rarity: 'common', xpReward: 20, condition: { type: 'first_action', action: 'routine' } },
  { id: 'genre_explorer', title: 'Genre Explorer', description: 'Listen to 5 different music genres', icon: '🎵', category: 'explorer', rarity: 'rare', xpReward: 75, condition: { type: 'count', action: 'unique_genres', count: 5 } },
  { id: 'all_modules', title: 'Full Experience', description: 'Complete all module types at least once', icon: '🌟', category: 'explorer', rarity: 'rare', xpReward: 100, condition: { type: 'count', action: 'unique_modules', count: 5 } },

  // --- Dedication (5) ---
  { id: 'early_bird', title: 'Early Bird', description: 'Complete a module before 7 AM', icon: '🌅', category: 'dedication', rarity: 'common', xpReward: 30, condition: { type: 'time_range', start: 4, end: 7, action: 'moduleComplete' } },
  { id: 'night_owl', title: 'Night Owl', description: 'Complete a module after 10 PM', icon: '🦉', category: 'dedication', rarity: 'common', xpReward: 30, condition: { type: 'time_range', start: 22, end: 4, action: 'moduleComplete' } },
  { id: 'full_day_5x', title: 'All-In', description: 'Complete all daily modules 5 times', icon: '🎯', category: 'dedication', rarity: 'rare', xpReward: 150, condition: { type: 'count', action: 'full_day_complete', count: 5 } },
  { id: 'weekend_warrior', title: 'Weekend Warrior', description: 'Complete modules on 4 weekends', icon: '🏋️', category: 'dedication', rarity: 'rare', xpReward: 100, condition: { type: 'count', action: 'weekend_active', count: 4 } },
  { id: 'modules_50', title: 'Module Machine', description: 'Complete 50 modules', icon: '⚙️', category: 'dedication', rarity: 'epic', xpReward: 300, condition: { type: 'count', action: 'moduleComplete', count: 50 } },

  // --- Mastery (4) ---
  { id: 'xp_500', title: 'Rising Star', description: 'Earn 500 total XP', icon: '⭐', category: 'mastery', rarity: 'common', xpReward: 50, condition: { type: 'xp_total', amount: 500 } },
  { id: 'xp_2000', title: 'XP Collector', description: 'Earn 2,000 total XP', icon: '💫', category: 'mastery', rarity: 'rare', xpReward: 100, condition: { type: 'xp_total', amount: 2000 } },
  { id: 'xp_5000', title: 'XP Legend', description: 'Earn 5,000 total XP', icon: '🌠', category: 'mastery', rarity: 'epic', xpReward: 250, condition: { type: 'xp_total', amount: 5000 } },
  { id: 'level_5', title: 'Warrior Status', description: 'Reach Level 5', icon: '🗡️', category: 'mastery', rarity: 'rare', xpReward: 150, condition: { type: 'level', level: 5 } },

  // --- Growth (5) ---
  { id: 'journal_7', title: 'Journaling Habit', description: 'Write 7 journal entries', icon: '📖', category: 'growth', rarity: 'common', xpReward: 50, condition: { type: 'count', action: 'journal', count: 7 } },
  { id: 'journal_30', title: 'Journaling Pro', description: 'Write 30 journal entries', icon: '📚', category: 'growth', rarity: 'rare', xpReward: 150, condition: { type: 'count', action: 'journal', count: 30 } },
  { id: 'mood_tracker', title: 'Self-Aware', description: 'Log your mood 10 times', icon: '🧠', category: 'growth', rarity: 'common', xpReward: 40, condition: { type: 'count', action: 'mood_log', count: 10 } },
  { id: 'breathing_10', title: 'Breathe Deep', description: 'Complete 10 breathing sessions', icon: '🌬️', category: 'growth', rarity: 'rare', xpReward: 75, condition: { type: 'count', action: 'breathingSession', count: 10 } },
  { id: 'goal_complete', title: 'Goal Getter', description: 'Complete your first goal', icon: '🎯', category: 'growth', rarity: 'common', xpReward: 50, condition: { type: 'first_action', action: 'goal_complete' } },

  // --- Secret (2) ---
  { id: 'midnight_owl', title: 'Midnight Owl', description: 'Use the app at exactly midnight', icon: '🌑', category: 'secret', rarity: 'epic', xpReward: 100, condition: { type: 'time_range', start: 0, end: 1, action: 'any' } },
  { id: 'perfect_week', title: 'Perfect Week', description: 'Complete all modules every day for a week', icon: '✨', category: 'secret', rarity: 'legendary', xpReward: 500, condition: { type: 'consecutive_days', days: 7, action: 'full_day_complete' } },
]

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id)
}

export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category)
}

/**
 * Check which achievements should be newly unlocked based on user stats.
 * Returns only achievements that are NOT already in the unlockedIds set.
 */
export function checkNewAchievements(
  stats: {
    streak: number
    totalXP: number
    level: number
    journalCount: number
    moodLogCount: number
    breathingCount: number
    moduleCount: number
    fullDayCount: number
    weekendActiveCount: number
    uniqueGenres: number
    uniqueModuleTypes: number
    hasFirstJournal: boolean
    hasFirstSoundscape: boolean
    hasFirstRoutine: boolean
    hasCompletedGoal: boolean
    currentHour: number
    consecutiveFullDays: number
  },
  unlockedIds: Set<string>
): Achievement[] {
  const newlyUnlocked: Achievement[] = []

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) continue

    const c = achievement.condition
    let qualified = false

    switch (c.type) {
      case 'streak':
        qualified = stats.streak >= c.days
        break
      case 'first_action':
        if (c.action === 'journal') qualified = stats.hasFirstJournal
        else if (c.action === 'soundscape') qualified = stats.hasFirstSoundscape
        else if (c.action === 'routine') qualified = stats.hasFirstRoutine
        else if (c.action === 'goal_complete') qualified = stats.hasCompletedGoal
        break
      case 'count':
        if (c.action === 'journal') qualified = stats.journalCount >= c.count
        else if (c.action === 'mood_log') qualified = stats.moodLogCount >= c.count
        else if (c.action === 'breathingSession') qualified = stats.breathingCount >= c.count
        else if (c.action === 'moduleComplete') qualified = stats.moduleCount >= c.count
        else if (c.action === 'full_day_complete') qualified = stats.fullDayCount >= c.count
        else if (c.action === 'weekend_active') qualified = stats.weekendActiveCount >= c.count
        else if (c.action === 'unique_genres') qualified = stats.uniqueGenres >= c.count
        else if (c.action === 'unique_modules') qualified = stats.uniqueModuleTypes >= c.count
        break
      case 'xp_total':
        qualified = stats.totalXP >= c.amount
        break
      case 'level':
        qualified = stats.level >= c.level
        break
      case 'time_range':
        if (c.start < c.end) {
          qualified = stats.currentHour >= c.start && stats.currentHour < c.end
        } else {
          // Wraps around midnight (e.g., 22-4)
          qualified = stats.currentHour >= c.start || stats.currentHour < c.end
        }
        break
      case 'consecutive_days':
        qualified = stats.consecutiveFullDays >= c.days
        break
    }

    if (qualified) {
      newlyUnlocked.push(achievement)
    }
  }

  return newlyUnlocked
}
