'use client'

import { Crown, Clock, ChevronRight } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

interface TrialBannerProps {
  variant?: 'full' | 'compact' | 'minimal'
}

export function TrialBanner({ variant = 'compact' }: TrialBannerProps) {
  const { isTrialing, trialDaysLeft, isPremium } = useSubscription()

  // Only show during trial
  if (!isTrialing || !isPremium) {
    return null
  }

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
        <Clock className="w-3 h-3" />
        <span>{trialDaysLeft}d left</span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-white/95">
            <span className="font-medium text-amber-400">{trialDaysLeft} days</span> left in your free trial
          </span>
        </div>
      </div>
    )
  }

  // Full variant
  return (
    <div className="mx-4 mt-4 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-medium">
              Premium Trial
            </p>
            <p className="text-white/95 text-sm">
              {trialDaysLeft === 1
                ? 'Last day of your trial!'
                : `${trialDaysLeft} days remaining`
              }
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/95" />
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all"
              style={{ width: `${((7 - trialDaysLeft) / 7) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Warning banner for last day of trial
export function TrialEndingBanner() {
  const { isTrialing, trialDaysLeft } = useSubscription()

  if (!isTrialing || trialDaysLeft > 1) {
    return null
  }

  return (
    <div className="mx-4 mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-500/20">
          <Clock className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="text-white font-medium">Trial Ending Soon</p>
          <p className="text-white/95 text-sm mt-0.5">
            {trialDaysLeft === 0
              ? 'Your trial ends today. Subscribe to keep premium features.'
              : 'Your trial ends tomorrow. Subscribe to keep premium features.'
            }
          </p>
        </div>
      </div>
    </div>
  )
}
