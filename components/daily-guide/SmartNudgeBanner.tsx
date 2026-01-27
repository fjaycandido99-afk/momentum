'use client'

import { useState, useEffect } from 'react'
import { Flame, PenLine, TrendingUp, Heart, Zap, X } from 'lucide-react'

interface Nudge {
  type: string
  message: string
  icon: string
}

const ICON_MAP: Record<string, typeof Flame> = {
  flame: Flame,
  pen: PenLine,
  'trending-up': TrendingUp,
  heart: Heart,
  zap: Zap,
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  streak_risk: { bg: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  journal_reminder: { bg: 'from-blue-500/10 to-indigo-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  mood_trend: { bg: 'from-emerald-500/10 to-teal-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  inactive: { bg: 'from-pink-500/10 to-rose-500/10', border: 'border-pink-500/20', text: 'text-pink-400' },
  energy_pattern: { bg: 'from-yellow-500/10 to-amber-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400' },
}

function getTodayDismissKey() {
  const now = new Date()
  return `nudge_dismissed_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`
}

export function SmartNudgeBanner() {
  const [nudge, setNudge] = useState<Nudge | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

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
        if (data?.nudge) setNudge(data.nudge)
      })
      .catch(err => console.error('Smart nudge error:', err))
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem(getTodayDismissKey(), 'true')
  }

  if (isDismissed || !nudge) return null

  const colors = COLOR_MAP[nudge.type] || COLOR_MAP.streak_risk
  const Icon = ICON_MAP[nudge.icon] || Flame

  return (
    <div className={`rounded-2xl bg-gradient-to-r ${colors.bg} border ${colors.border} p-3 flex items-center gap-3`}>
      <div className={`p-2 rounded-xl bg-white/10 shrink-0`}>
        <Icon className={`w-4 h-4 ${colors.text}`} />
      </div>
      <p className="text-sm text-white/80 flex-1">{nudge.message}</p>
      <button
        onClick={handleDismiss}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5 text-white/40" />
      </button>
    </div>
  )
}
