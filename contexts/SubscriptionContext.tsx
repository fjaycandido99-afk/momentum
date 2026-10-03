'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react'
import { setWidgetPremium } from '@/lib/widget-sync'
import { FREE_TIER_LIMITS, FREEMIUM_LIMITS, isContentFree, FreemiumContentType } from '@/lib/subscription-constants'

// Helper to get today's date key for localStorage
function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

// LocalStorage key for daily free unlock
const DAILY_FREE_UNLOCK_KEY = 'voxu_daily_free_unlock'

export type SubscriptionTier = 'free' | 'premium'
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'expired'

export interface SubscriptionData {
  tier: SubscriptionTier
  status: SubscriptionStatus
  isTrialing: boolean
  trialDaysLeft: number
  trialEnd: string | null
  sessionsToday: number
  canStartSession: boolean
  isPremium: boolean
  isGuest: boolean
  billingPeriodEnd: string | null
  limits: typeof FREE_TIER_LIMITS | null
}

interface SubscriptionContextType {
  // Subscription state
  tier: SubscriptionTier
  status: SubscriptionStatus
  isTrialing: boolean
  trialDaysLeft: number
  sessionsToday: number
  canStartSession: boolean
  isPremium: boolean
  isGuest: boolean
  billingPeriodEnd: Date | null
  isLoading: boolean

  // Free tier limits
  limits: typeof FREE_TIER_LIMITS | null
  freemiumLimits: typeof FREEMIUM_LIMITS

  // Daily free unlock
  dailyFreeUnlockUsed: boolean
  useDailyFreeUnlock: () => void

  // Content gating
  isContentFree: (type: FreemiumContentType, indexOrId: number | string) => boolean

  // Actions
  checkAccess: (feature: PremiumFeature) => boolean
  recordSession: () => Promise<boolean>
  refreshSubscription: () => Promise<void>

  // UI state
  showUpgradeModal: boolean
  /** `reason`: what they reached for — the screen leads with it. */
  openUpgradeModal: (reason?: UpgradeReason | object) => void
  upgradeReason: UpgradeReason | null
  closeUpgradeModal: () => void
}

export type PremiumFeature =
  | 'unlimited_sessions'
  | 'extended_duration'
  | 'all_genres'
  | 'checkpoints'
  | 'journal_history'
  | 'weekly_review_full'
  | 'all_backgrounds'
  | 'offline'
  | 'ai_voice'
  | 'ai_reflections'
  | 'ai_coach'
  | 'ai_affirmation'
  | 'goal_tracker'
  | 'weekly_ai_summary'

const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

interface SubscriptionProviderProps {
  children: ReactNode
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    tier: 'free',
    status: 'active',
    isTrialing: false,
    trialDaysLeft: 0,
    trialEnd: null,
    sessionsToday: 0,
    canStartSession: true,
    isPremium: false,
    isGuest: true,
    billingPeriodEnd: null,
    limits: FREE_TIER_LIMITS,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null)
  const isMountedRef = useRef(true)

  // Daily free unlock state
  const [dailyFreeUnlockUsed, setDailyFreeUnlockUsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const stored = localStorage.getItem(DAILY_FREE_UNLOCK_KEY)
      if (stored) {
        const { date } = JSON.parse(stored)
        return date === getTodayKey()
      }
    } catch {}
    return false
  })

  // Use daily free unlock
  const useDailyFreeUnlock = useCallback(() => {
    if (dailyFreeUnlockUsed) return
    setDailyFreeUnlockUsed(true)
    try {
      localStorage.setItem(DAILY_FREE_UNLOCK_KEY, JSON.stringify({ date: getTodayKey() }))
    } catch {}
  }, [dailyFreeUnlockUsed])

  // Check if content is free for this user
  const checkContentFree = useCallback((type: FreemiumContentType, indexOrId: number | string) => {
    return isContentFree(type, indexOrId, subscriptionData.isPremium)
  }, [subscriptionData.isPremium])

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    try {
      const response = await fetch('/api/subscription')
      if (!isMountedRef.current) return
      if (response.ok) {
        const { data } = await response.json()
        if (isMountedRef.current) setSubscriptionData(data)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true
    fetchSubscription()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchSubscription])

  // Check if user has access to a premium feature
  const checkAccess = useCallback((feature: PremiumFeature): boolean => {
    if (subscriptionData.isPremium) {
      return true
    }

    // Free tier feature checks — basic features now available to all
    switch (feature) {
      case 'unlimited_sessions':
      case 'extended_duration':
      case 'checkpoints':
        return true // Free users now get these
      case 'all_genres':
      case 'journal_history':
      case 'weekly_review_full':
      case 'all_backgrounds':
      case 'offline':
      case 'ai_voice':
      case 'ai_reflections':
      case 'ai_coach':
      case 'ai_affirmation':
      case 'goal_tracker':
      case 'weekly_ai_summary':
        return false // Premium only
      default:
        return false
    }
  }, [subscriptionData.isPremium])

  // Record a session (increment session count for free users)
  const recordSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/subscription/record-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const { data } = await response.json()
        if (isMountedRef.current) {
          setSubscriptionData(prev => ({
            ...prev,
            sessionsToday: data.sessionsToday,
            canStartSession: data.canStartMoreSessions,
          }))
        }
        return true
      }

      if (response.status === 403) {
        // Session limit reached
        if (isMountedRef.current) {
          setSubscriptionData(prev => ({
            ...prev,
            canStartSession: false,
          }))
        }
        return false
      }

      return false
    } catch (error) {
      console.error('Error recording session:', error)
      return false
    }
  }, [])

  // Refresh subscription data
  const refreshSubscription = useCallback(async () => {
    setIsLoading(true)
    await fetchSubscription()
  }, [fetchSubscription])

  // UI actions
  const openUpgradeModal = useCallback((reason?: UpgradeReason | object) => {
    // A React onClick passes its event here; only a real reason counts.
    setUpgradeReason(typeof reason === 'string' ? reason : null)
    setShowUpgradeModal(true)
  }, [])

  const closeUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false)
  }, [])

  // Anything can ask for the upgrade screen without the context: a lock
  // card, or the widget's "Unlock with Premium" (voxu://app/?upgrade=1 →
  // hooks/useDeepLink).
  useEffect(() => {
    const open = (e: Event) => {
      const r = (e as CustomEvent<{ reason?: UpgradeReason }>).detail?.reason
      setUpgradeReason(typeof r === 'string' ? r : null)
      setShowUpgradeModal(true)
    }
    window.addEventListener(OPEN_UPGRADE_EVENT, open)
    return () => window.removeEventListener(OPEN_UPGRADE_EVENT, open)
  }, [])

  // The widget shows Guided and Noticed only to Premium, so it needs to know.
  useEffect(() => {
    if (!isLoading) setWidgetPremium(subscriptionData.isPremium)
  }, [isLoading, subscriptionData.isPremium])

  // Memoize billingPeriodEnd to avoid creating new Date on every render
  const billingPeriodEnd = useMemo(() => {
    return subscriptionData.billingPeriodEnd
      ? new Date(subscriptionData.billingPeriodEnd)
      : null
  }, [subscriptionData.billingPeriodEnd])

  const value = useMemo<SubscriptionContextType>(() => ({
    tier: subscriptionData.tier,
    status: subscriptionData.status,
    isTrialing: subscriptionData.isTrialing,
    trialDaysLeft: subscriptionData.trialDaysLeft,
    sessionsToday: subscriptionData.sessionsToday,
    canStartSession: subscriptionData.canStartSession,
    isPremium: subscriptionData.isPremium,
    isGuest: subscriptionData.isGuest,
    billingPeriodEnd,
    isLoading,
    limits: subscriptionData.limits,
    freemiumLimits: FREEMIUM_LIMITS,
    dailyFreeUnlockUsed,
    useDailyFreeUnlock,
    isContentFree: checkContentFree,
    checkAccess,
    recordSession,
    refreshSubscription,
    showUpgradeModal,
    upgradeReason,
    openUpgradeModal,
    closeUpgradeModal,
  }), [
    subscriptionData.tier,
    subscriptionData.status,
    subscriptionData.isTrialing,
    subscriptionData.trialDaysLeft,
    subscriptionData.sessionsToday,
    subscriptionData.canStartSession,
    subscriptionData.isPremium,
    subscriptionData.isGuest,
    subscriptionData.limits,
    billingPeriodEnd,
    isLoading,
    dailyFreeUnlockUsed,
    useDailyFreeUnlock,
    checkContentFree,
    checkAccess,
    recordSession,
    refreshSubscription,
    showUpgradeModal,
    upgradeReason,
    openUpgradeModal,
    closeUpgradeModal,
  ])

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

/** Fire to open the upgrade screen from anywhere (SubscriptionContext listens). */
export const OPEN_UPGRADE_EVENT = 'voxu:open-upgrade'
export function openUpgrade(reason?: UpgradeReason) { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(OPEN_UPGRADE_EVENT, { detail: { reason } })) }

/** What someone reached for when the upgrade screen opened (components/premium/UpgradeModal). */
export type UpgradeReason = 'experiments' | 'charts' | 'lesson' | 'voice' | 'talk' | 'widget'

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}

// Optional hook that doesn't throw if outside provider
export function useSubscriptionOptional() {
  return useContext(SubscriptionContext)
}
