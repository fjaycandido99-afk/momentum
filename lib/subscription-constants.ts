// Subscription tier types
export type SubscriptionTier = 'free' | 'premium'
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'expired'

// Premium feature flags
export type PremiumFeature =
  | 'unlimited_sessions'
  | 'extended_duration'
  | 'checkpoints'
  | 'ai_voice'
  | 'ai_reflections'
  | 'ai_coach'
  | 'ai_affirmation'
  | 'goal_tracker'
  | 'weekly_ai_summary'

// Freemium content limits
export const FREEMIUM_LIMITS = {
  soundscapes: {
    freeCount: 4, // First 4 by index: focus, relax, sleep, energy
    freeIds: ['focus', 'relax', 'sleep', 'energy'],
  },
  voiceGuides: {
    freeIds: ['breathing'], // Only breathing is free
  },
  motivation: {
    freeCount: 2, // First 2 per topic
  },
  musicPerGenre: {
    freeCount: 2, // First 2 per genre
  },
  voiceTones: {
    freeCount: 1, // User picks one during onboarding, locked afterward
  },
  previewSeconds: 30,
  coachNudgeDelayMs: 5 * 60 * 1000, // 5 minutes
}

// Content type for freemium checks
export type FreemiumContentType = 'soundscape' | 'voiceGuide' | 'motivation' | 'music'

// Check if content is free based on type and index/id
export function isContentFree(
  type: FreemiumContentType,
  indexOrId: number | string,
  isPremium: boolean
): boolean {
  if (isPremium) return true

  switch (type) {
    case 'soundscape':
      if (typeof indexOrId === 'number') {
        return indexOrId < FREEMIUM_LIMITS.soundscapes.freeCount
      }
      return FREEMIUM_LIMITS.soundscapes.freeIds.includes(indexOrId)

    case 'voiceGuide':
      return FREEMIUM_LIMITS.voiceGuides.freeIds.includes(String(indexOrId))

    case 'motivation':
      return typeof indexOrId === 'number' && indexOrId < FREEMIUM_LIMITS.motivation.freeCount

    case 'music':
      return typeof indexOrId === 'number' && indexOrId < FREEMIUM_LIMITS.musicPerGenre.freeCount

    default:
      return false
  }
}

// Free tier limits — sessions are now effectively unlimited
// Free users get all modules as text-only; premium = AI voices + AI features
export const FREE_TIER_LIMITS = {
  sessions_per_day: 99, // Effectively unlimited
  session_duration_minutes: 999, // No meaningful limit
  music_genres: ['daily_rotation'], // Only daily rotation
  checkpoints_enabled: true,
  journal_history_enabled: false,
  offline_enabled: false,
  // AI feature gates (free = false)
  ai_voice_enabled: false,
  ai_reflections_enabled: false,
  ai_coach_enabled: false,
  ai_affirmation_enabled: false,
  goal_tracker_enabled: false,
  weekly_ai_summary_enabled: false,
}

// Premium features
export const PREMIUM_FEATURES = {
  unlimited_sessions: true,
  all_music_genres: true,
  all_checkpoints: true,
  full_journal_history: true,
  weekly_review_full: true,
  all_backgrounds: true,
  offline_downloads: true,
  // AI features (premium = true)
  ai_voice_enabled: true,
  ai_reflections_enabled: true,
  ai_coach_enabled: true,
  ai_affirmation_enabled: true,
  goal_tracker_enabled: true,
  weekly_ai_summary_enabled: true,
}

// Trial duration
export const TRIAL_DAYS = 7

// Helper to check if user has premium access
export function hasPremiumAccess(
  tier: SubscriptionTier,
  status: SubscriptionStatus
): boolean {
  return tier === 'premium' && (status === 'active' || status === 'trialing')
}

// Helper to check if user can start a session
export function canStartSession(
  tier: SubscriptionTier,
  status: SubscriptionStatus,
  sessionsToday: number
): boolean {
  if (hasPremiumAccess(tier, status)) {
    return true
  }
  return sessionsToday < FREE_TIER_LIMITS.sessions_per_day
}

// Helper to get session duration limit in seconds
export function getSessionDurationLimit(
  tier: SubscriptionTier,
  status: SubscriptionStatus
): number | null {
  if (hasPremiumAccess(tier, status)) {
    return null // No limit
  }
  return FREE_TIER_LIMITS.session_duration_minutes * 60
}

// Check if a specific premium feature is available
export function hasFeatureAccess(
  tier: SubscriptionTier,
  status: SubscriptionStatus,
  feature: PremiumFeature
): boolean {
  if (hasPremiumAccess(tier, status)) {
    return true
  }

  // Free users get access to basic features but not AI features
  switch (feature) {
    case 'unlimited_sessions':
    case 'extended_duration':
    case 'checkpoints':
      return true // Free users now get these
    case 'ai_voice':
      return FREE_TIER_LIMITS.ai_voice_enabled
    case 'ai_reflections':
      return FREE_TIER_LIMITS.ai_reflections_enabled
    case 'ai_coach':
      return FREE_TIER_LIMITS.ai_coach_enabled
    case 'ai_affirmation':
      return FREE_TIER_LIMITS.ai_affirmation_enabled
    case 'goal_tracker':
      return FREE_TIER_LIMITS.goal_tracker_enabled
    case 'weekly_ai_summary':
      return FREE_TIER_LIMITS.weekly_ai_summary_enabled
    default:
      return false
  }
}
