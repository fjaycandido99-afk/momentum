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
  common: 'border-white/15',
  rare: 'border-blue-400/30',
  epic: 'border-purple-400/40',
  legendary: 'border-amber-400/50',
}

export const RARITY_BG: Record<AchievementRarity, string> = {
  common: 'bg-white/[0.03]',
  rare: 'bg-blue-400/[0.06]',
  epic: 'bg-purple-400/[0.06]',
  legendary: 'bg-amber-400/[0.08]',
}

export const RARITY_TEXT: Record<AchievementRarity, string> = {
  common: 'text-white/70',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-amber-400',
}

export const RARITY_GLOW: Record<AchievementRarity, string> = {
  common: '',
  rare: 'shadow-[0_0_12px_rgba(96,165,250,0.1)]',
  epic: 'shadow-[0_0_12px_rgba(192,132,252,0.15)]',
  legendary: 'shadow-[0_0_16px_rgba(251,191,36,0.2)]',
}

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  consistency: 'Consistency',
  explorer: 'Explorer',
  dedication: 'Dedication',
  mastery: 'Mastery',
  growth: 'Growth',
  secret: 'Secret',
}

export const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  consistency: '🔥',
  explorer: '🧭',
  dedication: '💎',
  mastery: '⚡',
  growth: '🌱',
  secret: '🔮',
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

  // --- Path (6) ---
  { id: 'path_first', title: 'Path Finder', description: 'Complete your first path day (4/4)', icon: '🧭', category: 'explorer', rarity: 'common', xpReward: 30, condition: { type: 'first_action', action: 'path_complete' } },
  { id: 'path_7', title: 'Path Walker', description: 'Complete 7 full path days', icon: '🛤️', category: 'consistency', rarity: 'rare', xpReward: 100, condition: { type: 'count', action: 'path_complete', count: 7 } },
  { id: 'path_21', title: 'Path Master', description: 'Complete 21 full path days', icon: '🏔️', category: 'consistency', rarity: 'epic', xpReward: 250, condition: { type: 'count', action: 'path_complete', count: 21 } },
  { id: 'path_streak_7', title: 'Devoted Seeker', description: 'Reach a 7-day path streak', icon: '🔗', category: 'consistency', rarity: 'rare', xpReward: 75, condition: { type: 'consecutive_days', days: 7, action: 'path_activity' } },
  { id: 'path_streak_30', title: 'Unwavering', description: 'Reach a 30-day path streak', icon: '⛓️', category: 'consistency', rarity: 'epic', xpReward: 300, condition: { type: 'consecutive_days', days: 30, action: 'path_activity' } },
  { id: 'virtue_tracker', title: 'Virtue Seeker', description: 'Track a virtue for 7 days', icon: '🌿', category: 'growth', rarity: 'rare', xpReward: 75, condition: { type: 'consecutive_days', days: 7, action: 'virtue_track' } },

  // --- Secret (2) ---
  { id: 'midnight_owl', title: 'Midnight Owl', description: 'Use the app at exactly midnight', icon: '🌑', category: 'secret', rarity: 'epic', xpReward: 100, condition: { type: 'time_range', start: 0, end: 1, action: 'any' } },
  { id: 'perfect_week', title: 'Perfect Week', description: 'Complete all modules every day for a week', icon: '✨', category: 'secret', rarity: 'legendary', xpReward: 500, condition: { type: 'consecutive_days', days: 7, action: 'full_day_complete' } },

  // --- Listening (11) — tracked client-side via useListeningStats ---
  { id: 'listener_1hr', title: 'First Hour', description: '1 hour of total listening', icon: '🎵', category: 'dedication', rarity: 'common', xpReward: 30, condition: { type: 'count', action: 'listening_minutes', count: 60 } },
  { id: 'listener_5hr', title: 'Dedicated Listener', description: '5 hours of total listening', icon: '🎧', category: 'dedication', rarity: 'rare', xpReward: 100, condition: { type: 'count', action: 'listening_minutes', count: 300 } },
  { id: 'listener_10hr', title: 'Sound Devotee', description: '10 hours of total listening', icon: '🎶', category: 'dedication', rarity: 'rare', xpReward: 150, condition: { type: 'count', action: 'listening_minutes', count: 600 } },
  { id: 'listener_100hr', title: 'Audio Legend', description: '100 hours of total listening', icon: '👑', category: 'dedication', rarity: 'legendary', xpReward: 500, condition: { type: 'count', action: 'listening_minutes', count: 6000 } },
  { id: 'flow_master', title: 'Flow Master', description: '60+ minute listening session', icon: '🌊', category: 'mastery', rarity: 'rare', xpReward: 75, condition: { type: 'count', action: 'longest_session', count: 60 } },
  { id: 'deep_flow', title: 'Deep Flow', description: '2+ hour listening session', icon: '🧘', category: 'mastery', rarity: 'epic', xpReward: 200, condition: { type: 'count', action: 'longest_session', count: 120 } },
  { id: 'genre_explorer_audio', title: 'Sound Explorer', description: 'Played 5 different genres', icon: '🧭', category: 'explorer', rarity: 'rare', xpReward: 75, condition: { type: 'count', action: 'unique_genres', count: 5 } },
  { id: 'all_genres', title: 'Genre Master', description: 'Played all 7 music genres', icon: '🎹', category: 'explorer', rarity: 'epic', xpReward: 200, condition: { type: 'count', action: 'unique_genres', count: 7 } },
  { id: 'listening_streak_7', title: 'Weekly Listener', description: '7-day listening streak', icon: '🔥', category: 'consistency', rarity: 'common', xpReward: 50, condition: { type: 'consecutive_days', days: 7, action: 'listening' } },
  { id: 'listening_streak_30', title: 'Monthly Listener', description: '30-day listening streak', icon: '💎', category: 'consistency', rarity: 'epic', xpReward: 300, condition: { type: 'consecutive_days', days: 30, action: 'listening' } },
  { id: 'midnight_listener', title: 'Midnight Listener', description: 'Listened between midnight and 5 AM', icon: '🌙', category: 'secret', rarity: 'common', xpReward: 25, condition: { type: 'time_range', start: 0, end: 5, action: 'listening' } },
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
    hasFirstPathComplete: boolean
    pathCompleteCount: number
    consecutivePathDays: number
    consecutiveVirtueDays: number
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
        else if (c.action === 'path_complete') qualified = stats.hasFirstPathComplete
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
        else if (c.action === 'path_complete') qualified = stats.pathCompleteCount >= c.count
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
        if (c.action === 'path_activity') qualified = stats.consecutivePathDays >= c.days
        else if (c.action === 'virtue_track') qualified = stats.consecutiveVirtueDays >= c.days
        else qualified = stats.consecutiveFullDays >= c.days
        break
    }

    if (qualified) {
      newlyUnlocked.push(achievement)
    }
  }

  return newlyUnlocked
}
