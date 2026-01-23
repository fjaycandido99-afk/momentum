'use client'

import { Clock, Crown, Sparkles } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

interface SessionLimitBannerProps {
  variant?: 'full' | 'compact'
}

export function SessionLimitBanner({ variant = 'full' }: SessionLimitBannerProps) {
  const { canStartSession, sessionsToday, limits, openUpgradeModal, isPremium } = useSubscription()

  // Don't show if user can start sessions or is premium
  if (canStartSession || isPremium) {
    return null
  }

  const sessionLimit = limits?.sessions_per_day || 1

  if (variant === 'compact') {
    return (
      <div
        onClick={openUpgradeModal}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/15 transition-colors"
      >
        <Clock className="w-4 h-4 text-amber-400" />
        <span className="text-sm text-white/80">Daily limit reached</span>
        <Crown className="w-4 h-4 text-amber-400 ml-auto" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-500/20">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              Daily Session Used
            </h3>
            <p className="text-white/60 text-sm mb-4">
              You&apos;ve completed {sessionsToday} of {sessionLimit} free {sessionLimit === 1 ? 'session' : 'sessions'} today.
              Come back tomorrow, or upgrade for unlimited access.
            </p>
            <button
              onClick={openUpgradeModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Unlock Unlimited Sessions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inline message for within cards/modules
export function SessionLimitMessage() {
  const { canStartSession, openUpgradeModal, isPremium } = useSubscription()

  if (canStartSession || isPremium) {
    return null
  }

  return (
    <p className="text-sm text-amber-400/80">
      <button
        onClick={openUpgradeModal}
        className="underline hover:text-amber-400 transition-colors"
      >
        Upgrade to Premium
      </button>
      {' '}for unlimited sessions
    </p>
  )
}
