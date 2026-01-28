'use client'

import { Sparkles, Crown, Mic2 } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

interface SessionLimitBannerProps {
  variant?: 'full' | 'compact'
}

export function SessionLimitBanner({ variant = 'full' }: SessionLimitBannerProps) {
  const { isPremium, openUpgradeModal } = useSubscription()

  // Don't show for premium users
  if (isPremium) {
    return null
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={openUpgradeModal}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/15 transition-colors"
      >
        <Mic2 className="w-4 h-4 text-amber-400" />
        <span className="text-sm text-white/80">Upgrade for AI voices</span>
        <Crown className="w-4 h-4 text-amber-400 ml-auto" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <Mic2 className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white mb-1">
              Upgrade for AI Voices &amp; Coaching
            </h3>
            <p className="text-white/60 text-sm mb-3">
              You have full access to all modules as text. Upgrade for AI-generated voices, personalized coaching, and deeper insights.
            </p>
            <button
              onClick={openUpgradeModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Unlock Premium</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inline message for within cards/modules
export function SessionLimitMessage() {
  const { openUpgradeModal, isPremium } = useSubscription()

  if (isPremium) {
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
      {' '}for AI voices and coaching
    </p>
  )
}
