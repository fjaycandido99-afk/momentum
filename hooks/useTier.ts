'use client'

import { useSubscription, useSubscriptionOptional } from '@/contexts/SubscriptionContext'

export type Tier = 'guest' | 'free' | 'premium'

export function useTier() {
  const { isPremium, isGuest } = useSubscription()
  const tier: Tier = isPremium ? 'premium' : isGuest ? 'guest' : 'free'
  return { tier, isGuest, isFree: tier === 'free', isPremium }
}

export function useTierOptional() {
  const ctx = useSubscriptionOptional()
  if (!ctx) return { tier: 'guest' as Tier, isGuest: true, isFree: false, isPremium: false }
  const tier: Tier = ctx.isPremium ? 'premium' : ctx.isGuest ? 'guest' : 'free'
  return { tier, isGuest: ctx.isGuest, isFree: tier === 'free', isPremium: ctx.isPremium }
}
