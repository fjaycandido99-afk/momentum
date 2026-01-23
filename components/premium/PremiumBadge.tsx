'use client'

import { Crown, Sparkles } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

interface PremiumBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  variant?: 'default' | 'subtle' | 'outline'
}

export function PremiumBadge({
  size = 'md',
  showLabel = true,
  variant = 'default',
}: PremiumBadgeProps) {
  const { isPremium, isTrialing, trialDaysLeft } = useSubscription()

  if (!isPremium) return null

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const variantClasses = {
    default: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
    subtle: 'bg-amber-500/10 border-transparent text-amber-400/80',
    outline: 'bg-transparent border-amber-500/50 text-amber-400',
  }

  return (
    <div
      className={`
        inline-flex items-center rounded-full border font-medium
        ${sizeClasses[size]}
        ${variantClasses[variant]}
      `}
    >
      <Crown className={iconSizes[size]} />
      {showLabel && (
        <span>
          {isTrialing ? `Trial (${trialDaysLeft}d)` : 'Premium'}
        </span>
      )}
    </div>
  )
}

// Minimal inline badge for tight spaces
export function PremiumBadgeInline() {
  const { isPremium } = useSubscription()

  if (!isPremium) return null

  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      <Crown className="w-3 h-3" />
    </span>
  )
}

// "PRO" label badge
export function ProLabel({ className = '' }: { className?: string }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold
        bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400
        ${className}
      `}
    >
      <Sparkles className="w-3 h-3" />
      PRO
    </span>
  )
}
