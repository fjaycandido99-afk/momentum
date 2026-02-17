'use client'

import { useState } from 'react'
import { Snowflake, AlertTriangle, X } from 'lucide-react'

interface StreakFreezeIndicatorProps {
  freezeCount: number
  freezeUsedToday: boolean
  streakLost: { value: number; at: string } | null
}

export function StreakFreezeIndicator({ freezeCount, freezeUsedToday, streakLost }: StreakFreezeIndicatorProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  // Streak freeze was used today
  if (freezeUsedToday) {
    return (
      <div className="mx-6 mb-4 p-3 rounded-2xl bg-black border border-cyan-500/30">
        <div className="flex items-start gap-3">
          <Snowflake className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-white font-medium">Streak saved!</p>
            <p className="text-xs text-white/85 mt-0.5">
              1 freeze used ({freezeCount} remaining)
            </p>
          </div>
          <button onClick={() => setDismissed(true)} className="p-1 text-white/70 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  // Streak was lost today (check if lost_at is today)
  if (streakLost) {
    const lostDate = new Date(streakLost.at).toDateString()
    const today = new Date().toDateString()
    if (lostDate !== today) return null

    return (
      <div className="mx-6 mb-4 p-3 rounded-2xl bg-black border border-red-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-white font-medium">
              Your {streakLost.value}-day streak ended
            </p>
            <p className="text-xs text-white/85 mt-0.5">
              Complete all daily challenges to earn extra freezes
            </p>
          </div>
          <button onClick={() => setDismissed(true)} className="p-1 text-white/70 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return null
}
