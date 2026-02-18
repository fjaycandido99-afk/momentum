'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Lock, X, Crown, Sparkles, Gift } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

// Soft lock badge - shows a subtle amber lock icon on locked content
interface SoftLockBadgeProps {
  isLocked: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function SoftLockBadge({ isLocked, size = 'sm', className = '' }: SoftLockBadgeProps) {
  if (!isLocked) return null

  const sizeClasses = size === 'sm'
    ? 'w-5 h-5 p-1'
    : 'w-6 h-6 p-1.5'

  const iconClasses = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <div className={`absolute top-2 right-2 ${className}`}>
      <Lock className={`${iconClasses} text-white`} />
    </div>
  )
}

// Preview timer display
interface PreviewTimerProps {
  secondsLeft: number
}

export function PreviewTimer({ secondsLeft }: PreviewTimerProps) {
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md border border-amber-500/30 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-sm text-white/90">
          Preview: <span className="text-amber-400 font-medium">{secondsLeft}s</span>
        </span>
      </div>
    </div>
  )
}

// Preview paywall modal - shown after 30-second preview ends
interface PreviewPaywallProps {
  isOpen: boolean
  onClose: () => void
  contentName: string
  onUseDailyUnlock?: () => void
  showDailyUnlock: boolean
}

export function PreviewPaywall({
  isOpen,
  onClose,
  contentName,
  onUseDailyUnlock,
  showDailyUnlock,
}: PreviewPaywallProps) {
  const { openUpgradeModal } = useSubscription()

  if (!isOpen) return null

  const handleUpgrade = () => {
    onClose()
    openUpgradeModal()
  }

  const handleDailyUnlock = () => {
    if (onUseDailyUnlock) {
      onUseDailyUnlock()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#1a1a24] to-[#0f0f15] rounded-3xl border border-white/15 overflow-hidden animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5 text-white/85" />
        </button>

        {/* Header */}
        <div className="pt-8 pb-4 px-6 text-center">
          <Lock className="w-8 h-8 text-white mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Preview Ended
          </h2>
          <p className="text-white/85 text-sm">
            Unlock <span className="text-white">{contentName}</span> to continue listening
          </p>
        </div>

        {/* Options */}
        <div className="px-6 pb-6 space-y-3">
          {/* Daily free unlock option */}
          {showDailyUnlock && (
            <button
              onClick={handleDailyUnlock}
              className="w-full py-3.5 px-4 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 group"
            >
              <Gift className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-white font-medium">Use Daily Free Unlock</span>
            </button>
          )}

          {/* Upgrade to Premium */}
          <button
            onClick={handleUpgrade}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2 shimmer-cta"
          >
            <Crown className="w-5 h-5" />
            <span>Upgrade to Premium</span>
          </button>

          {/* Skip/cancel */}
          <button
            onClick={onClose}
            className="w-full py-2 text-white/70 text-sm hover:text-white/85 transition-colors"
          >
            Not now
          </button>
        </div>

        {/* Benefits hint */}
        <div className="px-6 pb-6">
          <div className="p-3 rounded-xl bg-white/5 border border-white/15">
            <p className="text-white/75 text-xs text-center">
              <Sparkles className="w-3 h-3 inline-block mr-1 text-amber-400" />
              Premium unlocks all content, AI features & more
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for managing 30-second preview
interface UsePreviewOptions {
  onPreviewEnd: () => void
  previewDuration?: number
}

export function usePreview({ onPreviewEnd, previewDuration = 30 }: UsePreviewOptions) {
  const [isPreviewActive, setIsPreviewActive] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(previewDuration)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const endCallbackRef = useRef(onPreviewEnd)

  // Keep callback ref updated
  endCallbackRef.current = onPreviewEnd

  const startPreview = useCallback(() => {
    setIsPreviewActive(true)
    setSecondsLeft(previewDuration)

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          // Preview ended
          if (timerRef.current) clearInterval(timerRef.current)
          setIsPreviewActive(false)
          endCallbackRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [previewDuration])

  const stopPreview = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsPreviewActive(false)
    setSecondsLeft(previewDuration)
  }, [previewDuration])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return {
    isPreviewActive,
    secondsLeft,
    startPreview,
    stopPreview,
  }
}

// AI Coach Nudge component
interface AICoachNudgeProps {
  isVisible: boolean
  onDismiss: () => void
}

export function AICoachNudge({ isVisible, onDismiss }: AICoachNudgeProps) {
  if (!isVisible) return null

  return (
    <div className="fixed right-5 bottom-44 z-20 animate-slide-in-right">
      <div className="relative max-w-[200px] p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/25 backdrop-blur-sm shadow-lg shadow-amber-500/10">
        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/80 border border-white/25 flex items-center justify-center hover:bg-black transition-colors"
        >
          <X className="w-3 h-3 text-white/85" />
        </button>

        {/* Content */}
        <p className="text-sm text-white/90 leading-relaxed">
          Need guidance? Your <span className="text-amber-400 font-medium">Mentor</span> can help...
        </p>

        {/* Arrow pointing to coach button */}
        <div className="absolute -bottom-2 right-8 w-4 h-4 rotate-45 bg-gradient-to-br from-amber-500/15 to-orange-500/15 border-r border-b border-amber-500/25" />
      </div>
    </div>
  )
}

// Hook for AI Coach nudge timing
export function useCoachNudge(delayMs: number = 5 * 60 * 1000) {
  const [showNudge, setShowNudge] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (dismissed) return

    timerRef.current = setTimeout(() => {
      setShowNudge(true)
    }, delayMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [delayMs, dismissed])

  const dismissNudge = useCallback(() => {
    setShowNudge(false)
    setDismissed(true)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return {
    showNudge,
    dismissNudge,
  }
}
