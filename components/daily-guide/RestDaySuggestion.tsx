'use client'

import { useState, useEffect } from 'react'
import { Heart, X } from 'lucide-react'

interface RestDaySuggestionProps {
  streak: number
  dayType: string
  onTakeRecoveryDay: () => void
}

function getTodayDismissKey() {
  const now = new Date()
  return `rest_day_dismissed_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`
}

export function RestDaySuggestion({ streak, dayType, onTakeRecoveryDay }: RestDaySuggestionProps) {
  const [dismissed, setDismissed] = useState(true) // Start hidden, show after check

  useEffect(() => {
    const key = getTodayDismissKey()
    const wasDismissed = localStorage.getItem(key) === 'true'
    setDismissed(wasDismissed)

    // Clean up old keys
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('rest_day_dismissed_') && k !== key) {
        localStorage.removeItem(k)
      }
    })
  }, [])

  // Only show when streak is a multiple of 7 and not already recovery
  if (dismissed || streak < 7 || streak % 7 !== 0 || dayType === 'recovery') {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem(getTodayDismissKey(), 'true')
  }

  const handleTakeRecovery = () => {
    onTakeRecoveryDay()
    handleDismiss()
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-pink-500/20">
            <Heart className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <h3 className="font-medium text-white text-sm">Rest Day Suggestion</h3>
            <p className="text-xs text-white/50">{streak}-day streak! You&apos;ve earned it</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss suggestion"
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
      <p className="text-sm text-white/70 mb-3">
        You&apos;ve been consistent for {streak} days straight. Recovery days help you come back stronger.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleTakeRecovery}
          className="flex-1 py-2 px-3 rounded-xl bg-pink-500/20 border border-pink-500/30 text-pink-400 text-sm font-medium hover:bg-pink-500/30 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          Take Recovery Day
        </button>
        <button
          onClick={handleDismiss}
          className="py-2 px-3 rounded-xl bg-white/5 text-white text-sm hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          Not today
        </button>
      </div>
    </div>
  )
}
