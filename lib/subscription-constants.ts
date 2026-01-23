// Subscription tier types
export type SubscriptionTier = 'free' | 'premium'
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'expired'

// Free tier limits
export const FREE_TIER_LIMITS = {
  sessions_per_day: 1,
  session_duration_minutes: 10,
  music_genres: ['daily_rotation'], // Only daily rotation
  checkpoints_enabled: false,
  journal_history_enabled: false,
  offline_enabled: false,
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
