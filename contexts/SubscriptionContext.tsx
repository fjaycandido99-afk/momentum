'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react'
import { FREE_TIER_LIMITS } from '@/lib/subscription-constants'

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
  billingPeriodEnd: Date | null
  isLoading: boolean

  // Free tier limits
  limits: typeof FREE_TIER_LIMITS | null

  // Actions
  checkAccess: (feature: PremiumFeature) => boolean
  recordSession: () => Promise<boolean>
  refreshSubscription: () => Promise<void>

  // UI state
  showUpgradeModal: boolean
  openUpgradeModal: () => void
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
    billingPeriodEnd: null,
    limits: FREE_TIER_LIMITS,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const isMountedRef = useRef(true)

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

    // Free tier feature checks
    switch (feature) {
      case 'unlimited_sessions':
        return false
      case 'extended_duration':
        return false
      case 'all_genres':
        return false
      case 'checkpoints':
        return false
      case 'journal_history':
        return false
      case 'weekly_review_full':
        return false
      case 'all_backgrounds':
        return false
      case 'offline':
        return false
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
  const openUpgradeModal = useCallback(() => {
    setShowUpgradeModal(true)
  }, [])

  const closeUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false)
  }, [])

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
    billingPeriodEnd,
    isLoading,
    limits: subscriptionData.limits,
    checkAccess,
    recordSession,
    refreshSubscription,
    showUpgradeModal,
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
    subscriptionData.limits,
    billingPeriodEnd,
    isLoading,
    checkAccess,
    recordSession,
    refreshSubscription,
    showUpgradeModal,
    openUpgradeModal,
    closeUpgradeModal,
  ])

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

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
