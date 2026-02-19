'use client'

import { Lock, Crown, Sparkles } from 'lucide-react'
import { useSubscription, type PremiumFeature } from '@/contexts/SubscriptionContext'

interface FeatureLockProps {
  feature: PremiumFeature
  children: React.ReactNode
  fallback?: React.ReactNode
  showOverlay?: boolean
  message?: string
}

// Lock overlay that covers content
export function FeatureLock({
  feature,
  children,
  fallback,
  showOverlay = true,
  message = 'Premium feature',
}: FeatureLockProps) {
  const { checkAccess, openUpgradeModal, isPremium } = useSubscription()

  const hasAccess = checkAccess(feature)

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showOverlay) {
    return null
  }

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="blur-sm pointer-events-none opacity-50">
        {children}
      </div>

      {/* Lock overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-xl cursor-pointer"
        onClick={openUpgradeModal}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openUpgradeModal() } }}
      >
        <div className="flex flex-col items-center gap-2 p-4">
          <Lock className="w-6 h-6 text-white" />
          <p className="text-sm text-white font-medium text-center">
            {message}
          </p>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-colors">
            <Crown className="w-3 h-3" />
            Upgrade
          </button>
        </div>
      </div>
    </div>
  )
}

// Inline lock icon that shows next to locked features
interface LockIconProps {
  onClick?: () => void
  size?: 'sm' | 'md'
}

export function LockIcon({ onClick, size = 'sm' }: LockIconProps) {
  const { openUpgradeModal } = useSubscription()

  const handleClick = onClick || openUpgradeModal

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  }

  return (
    <button
      onClick={handleClick}
      className="hover:opacity-80 transition-opacity"
      title="Premium feature - Click to upgrade"
    >
      <Lock className={`${sizeClasses[size]} text-white`} />
    </button>
  )
}

// Premium-only wrapper that shows upgrade prompt
interface PremiumOnlyProps {
  feature: PremiumFeature
  children: React.ReactNode
  upgradeMessage?: string
}

export function PremiumOnly({
  feature,
  children,
  upgradeMessage = 'Upgrade to Premium to unlock this feature',
}: PremiumOnlyProps) {
  const { checkAccess, openUpgradeModal } = useSubscription()

  if (checkAccess(feature)) {
    return <>{children}</>
  }

  return (
    <div
      onClick={openUpgradeModal}
      className="p-4 rounded-xl border border-dashed border-white/25 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] hover:border-amber-500/30 transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-white font-medium">{upgradeMessage}</p>
          <p className="text-xs text-amber-400 mt-0.5">Click to upgrade</p>
        </div>
        <Crown className="w-5 h-5 text-amber-400/60" />
      </div>
    </div>
  )
}

// Check if feature is locked (for conditional rendering)
export function useFeatureLock(feature: PremiumFeature) {
  const { checkAccess, openUpgradeModal } = useSubscription()
  return {
    isLocked: !checkAccess(feature),
    unlock: openUpgradeModal,
  }
}
