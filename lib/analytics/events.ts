import { track } from '@vercel/analytics'

// --- Audio events ---
export function trackAudioPlay(props: {
  type: 'music' | 'soundscape' | 'guide'
  label: string
  genreId?: string
}) {
  track('audio_play', props)
}

export function trackAudioStop(props: {
  type: 'music' | 'soundscape' | 'guide'
  label: string
  durationSeconds?: number
}) {
  track('audio_stop', props)
}

// --- Journal ---
export function trackJournalEntryCreated(props?: {
  wordCount?: number
  hasMood?: boolean
}) {
  track('journal_entry_created', props ?? {})
}

// --- Daily Guide ---
export function trackDailyGuideStarted(props?: {
  voiceTone?: string
  mindset?: string
}) {
  track('daily_guide_started', props ?? {})
}

export function trackDailyGuideCompleted(props?: {
  durationSeconds?: number
  modulesCompleted?: number
}) {
  track('daily_guide_completed', props ?? {})
}

// --- Subscription ---
export function trackUpgradeModalOpened(props?: {
  trigger?: string
}) {
  track('upgrade_modal_opened', props ?? {})
}

export function trackUpgradeClicked(props?: {
  plan?: string
}) {
  track('upgrade_clicked', props ?? {})
}

// --- Mindset ---
export function trackMindsetSelected(props: {
  mindset: string
  isFirstTime: boolean
}) {
  track('mindset_selected', props)
}

// --- Onboarding ---
export function trackOnboardingStepCompleted(props: {
  step: number
  stepName: string
}) {
  track('onboarding_step_completed', props)
}

export function trackOnboardingCompleted() {
  track('onboarding_completed', {})
}

// --- Streaks ---
export function trackStreakMilestone(props: {
  days: number
}) {
  track('streak_milestone', props)
}

// --- Sharing ---
export function trackShareAction(props: {
  contentType: 'journal' | 'quote' | 'streak'
  method: 'native' | 'clipboard'
}) {
  track('share_action', props)
}

// --- Feature usage ---
export function trackFeatureUsed(props: {
  feature: string
  context?: string
}) {
  track('feature_used', props)
}
