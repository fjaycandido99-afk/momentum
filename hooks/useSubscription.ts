'use client'

import { useSubscription as useSubscriptionContext, useSubscriptionOptional } from '@/contexts/SubscriptionContext'

// Re-export the hooks from context for convenience
export { useSubscriptionContext as useSubscription, useSubscriptionOptional }

// Additional utility hook for checking premium features
export function usePremiumFeature(feature: string): boolean {
  const subscription = useSubscriptionOptional()
  if (!subscription) return false
  return subscription.isPremium
}

// Hook for session tracking
export function useSessionTracking() {
  const subscription = useSubscriptionOptional()

  return {
    canStartSession: subscription?.canStartSession ?? true,
    sessionsToday: subscription?.sessionsToday ?? 0,
    sessionLimit: subscription?.limits?.sessions_per_day ?? 1,
    recordSession: subscription?.recordSession ?? (async () => true),
    isPremium: subscription?.isPremium ?? false,
  }
}

// Hook for upgrade prompts
export function useUpgradePrompt() {
  const subscription = useSubscriptionOptional()

  return {
    showUpgradeModal: subscription?.showUpgradeModal ?? false,
    openUpgradeModal: subscription?.openUpgradeModal ?? (() => {}),
    closeUpgradeModal: subscription?.closeUpgradeModal ?? (() => {}),
    isPremium: subscription?.isPremium ?? false,
    isTrialing: subscription?.isTrialing ?? false,
    trialDaysLeft: subscription?.trialDaysLeft ?? 0,
  }
}
