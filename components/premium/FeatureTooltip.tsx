'use client'

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { X, UserPlus, Sparkles, Lock } from 'lucide-react'
import Link from 'next/link'
import { useTierOptional } from '@/hooks/useTier'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'

export type FeatureId =
  | 'ai_coaching'
  | 'guided_voices'
  | 'ai_reflections'
  | 'ai_affirmations'
  | 'goal_tracker'
  | 'weekly_ai_summary'
  | 'journal_history'
  | 'all_content'
  | 'save_progress'
  | 'save_journal'

interface FeatureInfo {
  name: string
  description: string
  guestOnly?: boolean
}

const FEATURE_REGISTRY: Record<FeatureId, FeatureInfo> = {
  ai_coaching: {
    name: 'AI Coaching',
    description: 'Personalized coaching conversations that adapt to your mindset',
  },
  guided_voices: {
    name: 'Guided Voices',
    description: 'AI-generated voice sessions for breathing, sleep, and focus',
  },
  ai_reflections: {
    name: 'AI Reflections',
    description: 'Thoughtful AI insights on your journal entries',
  },
  ai_affirmations: {
    name: 'AI Affirmations',
    description: 'Daily affirmations tailored to your goals',
  },
  goal_tracker: {
    name: 'Goal Tracker',
    description: 'Set and track personal goals with AI accountability',
  },
  weekly_ai_summary: {
    name: 'Weekly AI Summary',
    description: 'AI-powered weekly review of your progress',
  },
  journal_history: {
    name: 'Journal History',
    description: 'Access your complete journal archive and search entries',
  },
  all_content: {
    name: 'All Content',
    description: 'Unlock every soundscape, genre, and guided session',
  },
  save_progress: {
    name: 'Save Progress',
    description: 'Your streaks, XP, and achievements are saved when you sign in',
    guestOnly: true,
  },
  save_journal: {
    name: 'Save Journal',
    description: 'Sign in to save your journal entries across devices',
    guestOnly: true,
  },
}

// --- Context for showing tooltips from anywhere ---
interface FeatureTooltipContextType {
  showFeatureTooltip: (featureId: FeatureId) => boolean
}

const FeatureTooltipContext = createContext<FeatureTooltipContextType | null>(null)

export function useFeatureTooltip() {
  return useContext(FeatureTooltipContext)
}

// --- Provider ---
interface FeatureTooltipProviderProps {
  children: ReactNode
}

export function FeatureTooltipProvider({ children }: FeatureTooltipProviderProps) {
  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null)
  const { isGuest, isPremium } = useTierOptional()
  const subscription = useSubscriptionOptional()

  // Auto-dismiss after 6s
  useEffect(() => {
    if (!activeFeature) return
    const timer = setTimeout(() => setActiveFeature(null), 6000)
    return () => clearTimeout(timer)
  }, [activeFeature])

  const showFeatureTooltip = useCallback((featureId: FeatureId): boolean => {
    if (isPremium) return false

    const feature = FEATURE_REGISTRY[featureId]
    if (!feature) return false

    // Guest-only features only show for guests
    if (feature.guestOnly && !isGuest) return false

    // Check sessionStorage — only show once per feature per session
    try {
      const key = `voxu_feature_tip_${featureId}`
      if (sessionStorage.getItem(key) === '1') return false
      sessionStorage.setItem(key, '1')
    } catch {}

    setActiveFeature(featureId)
    return true
  }, [isPremium, isGuest])

  return (
    <FeatureTooltipContext.Provider value={{ showFeatureTooltip }}>
      {children}

      {/* Bottom-sheet tooltip */}
      {activeFeature && (
        <div className="fixed bottom-0 left-0 right-0 z-[55] animate-slide-up pointer-events-auto">
          <div className="mx-4 mb-[calc(env(safe-area-inset-bottom)+5rem)] p-4 rounded-2xl bg-black border border-white/15 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white/[0.08] shrink-0">
                <Lock className="w-4 h-4 text-white/60" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {FEATURE_REGISTRY[activeFeature].name}
                </p>
                <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
                  {FEATURE_REGISTRY[activeFeature].description}
                </p>

                <div className="mt-2.5">
                  {isGuest ? (
                    <Link
                      href="/login"
                      onClick={() => setActiveFeature(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] border border-white/15 text-xs font-medium text-white/85 hover:bg-white/[0.12] transition-colors press-scale"
                    >
                      <UserPlus className="w-3 h-3" />
                      Sign In to Unlock
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveFeature(null)
                        subscription?.openUpgradeModal()
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] border border-white/15 text-xs font-medium text-white/85 hover:bg-white/[0.12] transition-colors press-scale"
                    >
                      <Sparkles className="w-3 h-3" />
                      Upgrade to Unlock
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => setActiveFeature(null)}
                aria-label="Dismiss"
                className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>
          </div>
        </div>
      )}
    </FeatureTooltipContext.Provider>
  )
}
