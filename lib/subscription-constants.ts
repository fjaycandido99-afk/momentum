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
  | 'ai_smart_session'
  | 'ai_meditation'

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
  playlists: { freeCount: 1 },
  routines: { freeCount: 1 },
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
  ai_smart_session_enabled: false,
  ai_meditation_enabled: false,
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
  ai_smart_session_enabled: true,
  ai_meditation_enabled: true,
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
    case 'ai_smart_session':
      return FREE_TIER_LIMITS.ai_smart_session_enabled
    case 'ai_meditation':
      return FREE_TIER_LIMITS.ai_meditation_enabled
    default:
      return false
  }
}

// ---------------------------------------------------------------------------
// Metered AI features
// ---------------------------------------------------------------------------
//
// Every gate above this line is a boolean: you have the feature or you
// don't. That shape can't express "a taste, then a paywall", which is
// what the free tier needs in order to sell itself — a locked door
// converts far worse than a door that opens twice and then explains why
// it stopped.
//
// So AI features carry a per-day allowance per tier instead:
//
//   0    → locked. Identical to the old boolean-false.
//   n    → n calls per local day, then a paywall citing the limit.
//   null → unlimited (still subject to the per-minute rate limiter).
//
// Counts are persisted per user/feature/day in AiUsageDaily. They are
// NOT in lib/rate-limit.ts, which is a per-instance in-memory Map and
// would hand out a fresh allowance on every cold start.

export type AiFeatureKey =
  | 'chat'
  | 'reflections'
  | 'dream'
  | 'smart_session'
  | 'wellness'
  | 'briefing'
  | 'quote_explain'
  | 'goal_decompose'
  | 'letter'
  | 'retrospective'
  | 'mindset_evolution'

export interface AiFeatureLimit {
  /** Calls per local day. 0 = locked, null = unlimited. */
  free: number | null
  premium: number | null
  /** Shown in the paywall when a free user runs out. */
  label: string
}

// Free allowances are deliberately small. The goal is for a free user to
// feel the thing work and want more of it — not to have a workable free
// product. Anything periodic by nature (a monthly retrospective, a letter
// you write to your future self) stays fully premium: metering something
// you'd only ever use once a month communicates nothing.
export const AI_FEATURE_LIMITS: Record<AiFeatureKey, AiFeatureLimit> = {
  chat:              { free: 5, premium: null, label: 'AI chat' },
  quote_explain:     { free: 3, premium: null, label: 'Quote insights' },
  reflections:       { free: 2, premium: null, label: 'AI reflections' },
  dream:             { free: 1, premium: null, label: 'Dream interpretation' },
  smart_session:     { free: 1, premium: null, label: 'Smart sessions' },
  wellness:          { free: 1, premium: null, label: 'Wellness score' },
  briefing:          { free: 1, premium: null, label: 'Morning briefing' },
  goal_decompose:    { free: 1, premium: null, label: 'Goal breakdown' },
  letter:            { free: 0, premium: null, label: 'Letter to self' },
  retrospective:     { free: 0, premium: null, label: 'Monthly retrospective' },
  mindset_evolution: { free: 0, premium: null, label: 'Mindset evolution' },
}

export function aiFeatureAllowance(feature: AiFeatureKey, isPremium: boolean): number | null {
  const limit = AI_FEATURE_LIMITS[feature]
  if (!limit) return 0
  return isPremium ? limit.premium : limit.free
}

// ---------------------------------------------------------------------------
// Chat memory depth
// ---------------------------------------------------------------------------
//
// The second lever, and the one actually worth paying for. A message cap
// cuts someone off mid-thought and reads as the product breaking. A
// memory cap makes the companion visibly want to know more — the limit
// argues for the upgrade on its own, and honestly, because it's true.
//
// Gated on consent FIRST (UserPreferences.ai_memory_enabled), tier second.
// A user who hasn't opted in gets no memory at either tier.

export interface AiMemoryDepth {
  /** Days of journal history to read back. */
  journalDays: number
  /** Saved quotes/favourites to include, newest first. */
  savedItems: number
  /** Whether active goals are included. */
  goals: boolean
  /** Whether the 7-day mood trend is included. */
  moodTrend: boolean
}

export const AI_MEMORY_DEPTH: Record<'free' | 'premium', AiMemoryDepth> = {
  free:    { journalDays: 1,  savedItems: 3,  goals: false, moodTrend: false },
  premium: { journalDays: 30, savedItems: 25, goals: true,  moodTrend: true },
}
