'use client'

import { useState, useEffect } from 'react'
import { Flame, PenLine, TrendingUp, Heart, Zap, X } from 'lucide-react'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { logXPEventServer } from '@/lib/gamification'

interface Nudge {
  type: string
  message: string
  icon: string
  label?: string
}

const ICON_MAP: Record<string, typeof Flame> = {
  flame: Flame,
  pen: PenLine,
  'trending-up': TrendingUp,
  heart: Heart,
  zap: Zap,
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  streak_recovery: { bg: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  streak_risk: { bg: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  journal_reminder: { bg: 'from-blue-500/10 to-indigo-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  mood_trend: { bg: 'from-emerald-500/10 to-teal-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  inactive: { bg: 'from-pink-500/10 to-rose-500/10', border: 'border-pink-500/20', text: 'text-pink-400' },
  energy_pattern: { bg: 'from-yellow-500/10 to-amber-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400' },
  mood_dip: { bg: 'from-cyan-500/10 to-blue-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
  goal_reminder: { bg: 'from-violet-500/10 to-purple-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
  completion_pattern: { bg: 'from-teal-500/10 to-emerald-500/10', border: 'border-teal-500/20', text: 'text-teal-400' },
}

function getTodayDismissKey() {
  const now = new Date()
  return `nudge_dismissed_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`
}

export function SmartNudgeBanner() {
  const [nudge, setNudge] = useState<Nudge | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if dismissed today
    const key = getTodayDismissKey()
    if (localStorage.getItem(key) === 'true') {
      setIsDismissed(true)
      return
    }

    // Clean up old keys
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('nudge_dismissed_') && k !== key) {
        localStorage.removeItem(k)
      }
    })

    // Fetch nudge
    fetch('/api/daily-guide/smart-nudge')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.nudge) {
          setNudge(data.nudge)
          setTimeout(() => setIsVisible(true), 600)

          // Award XP for streak recovery (first time only)
          if (data.isRecovery && !data.cached) {
            logXPEventServer('streakRecovery', 'streak-recovery')
          }
        }
      })
      .catch(err => console.error('Smart nudge error:', err))
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => {
      setIsDismissed(true)
      localStorage.setItem(getTodayDismissKey(), 'true')
    }, 300)
  }

  if (isDismissed || !nudge) return null

  const colors = COLOR_MAP[nudge.type] || COLOR_MAP.streak_risk
  const Icon = ICON_MAP[nudge.icon] || Flame
  const label = nudge.label || 'Smart Nudge'

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${colors.bg} border ${colors.border} p-4 animate-scale-in transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl bg-white/10 shrink-0`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-medium tracking-widest uppercase mb-1 ${colors.text} opacity-70`}>
            {label}
          </p>
          <p className="text-sm text-white/70 italic leading-relaxed">{nudge.message}</p>
          {nudge.type !== 'streak_recovery' && (
            <FeatureHint id="smart-nudge" text="Nudges adapt to your patterns — dismiss if not relevant" mode="once" />
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5 text-white/70" />
        </button>
      </div>
    </div>
  )
}
