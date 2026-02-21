'use client'

import { useState, useEffect } from 'react'
import { X, UserPlus, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useTierOptional, type Tier } from '@/hooks/useTier'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'

type TierPage = 'home' | 'coach' | 'journal' | 'focus' | 'progress' | 'settings'

const MESSAGES: Record<TierPage, { guest: string; free: string }> = {
  home: {
    guest: 'Sign in to save your streaks, progress, and personalize Voxu',
    free: 'Upgrade to unlock AI coaching, all content, and guided voices',
  },
  coach: {
    guest: 'Sign in to access AI coaching conversations',
    free: 'Upgrade for personalized AI coaching and check-ins',
  },
  journal: {
    guest: 'Sign in to save your journal entries and build streaks',
    free: 'Upgrade for AI reflections and full journal history',
  },
  focus: {
    guest: 'Sign in to track your focus sessions and earn XP',
    free: 'Upgrade for all soundscapes and music genres',
  },
  progress: {
    guest: 'Sign in to save your streaks, achievements, and XP',
    free: 'Upgrade for wellness insights, missions, and AI summaries',
  },
  settings: {
    guest: 'Sign in to save your preferences across devices',
    free: "You're on the Free plan \u2014 upgrade for the full experience",
  },
}

function getStorageKey(page: TierPage, tier: Tier) {
  return `voxu_tier_banner_${page}_${tier}`
}

interface TierBannerProps {
  page: TierPage
}

export function TierBanner({ page }: TierBannerProps) {
  const { tier, isGuest } = useTierOptional()
  const subscription = useSubscriptionOptional()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (tier === 'premium') return
    try {
      const key = getStorageKey(page, tier)
      const wasDismissed = sessionStorage.getItem(key) === '1'
      setDismissed(wasDismissed)
    } catch {
      setDismissed(false)
    }
  }, [page, tier])

  if (tier === 'premium' || dismissed) return null

  const message = isGuest ? MESSAGES[page].guest : MESSAGES[page].free

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(getStorageKey(page, tier), '1')
    } catch {}
  }

  return (
    <div className="mx-6 mb-3 px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] flex items-start gap-3 animate-fade-in">
      <div className="p-1.5 rounded-lg bg-white/[0.08] shrink-0 mt-0.5">
        {isGuest ? (
          <UserPlus className="w-4 h-4 text-white/60" />
        ) : (
          <Sparkles className="w-4 h-4 text-white/60" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 leading-snug">{message}</p>
        <div className="mt-2">
          {isGuest ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] border border-white/15 text-xs font-medium text-white/85 hover:bg-white/[0.12] transition-colors press-scale"
            >
              <UserPlus className="w-3 h-3" />
              Sign In
            </Link>
          ) : (
            <button
              onClick={() => subscription?.openUpgradeModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] border border-white/15 text-xs font-medium text-white/85 hover:bg-white/[0.12] transition-colors press-scale"
            >
              <Sparkles className="w-3 h-3" />
              Upgrade
            </button>
          )}
        </div>
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5 text-white/40" />
      </button>
    </div>
  )
}
