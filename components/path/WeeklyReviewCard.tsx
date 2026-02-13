'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Flame, Trophy, Star } from 'lucide-react'

interface WeeklyReview {
  activeDays: number
  totalActivities: number
  currentStreak: number
  longestStreak: number
  topActivity: string | null
  rank: string
  totalDays: number
  weekData: { date: string; active: boolean; count: number }[]
}

const ACTIVITY_LABELS: Record<string, string> = {
  reflection: 'Reflection',
  exercise: 'Exercise',
  quote: 'Quote',
  soundscape: 'Soundscape',
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function WeeklyReviewCard() {
  const [data, setData] = useState<WeeklyReview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/path/weekly-review')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="card-path p-5 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-white/[0.07]" />
          <div className="h-4 w-28 rounded bg-white/10" />
        </div>
        <div className="space-y-3">
          <div className="h-3 w-full rounded bg-white/[0.07]" />
          <div className="h-16 w-full rounded bg-white/[0.07]" />
          <div className="h-3 w-2/3 rounded bg-white/[0.07]" />
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-white/[0.07]">
          <BarChart3 className="w-4 h-4 text-white/80" />
        </div>
        <h3 className="text-sm font-medium text-white">Weekly Review</h3>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-white">{data.activeDays}<span className="text-xs text-white/60">/7</span></div>
          <div className="text-[10px] text-white/60 uppercase tracking-wider">Active Days</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-lg font-semibold text-white">{data.currentStreak}</span>
          </div>
          <div className="text-[10px] text-white/60 uppercase tracking-wider">Streak</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-white">{data.totalActivities}</div>
          <div className="text-[10px] text-white/60 uppercase tracking-wider">Activities</div>
        </div>
      </div>

      {/* 7-day bar chart */}
      <div className="flex items-end justify-between gap-1.5 h-16 mb-3">
        {data.weekData.map((day, i) => {
          const maxCount = 4
          const height = day.count > 0 ? Math.max(20, (day.count / maxCount) * 100) : 8
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-sm transition-all ${
                  day.active ? 'bg-white/30' : 'bg-white/[0.07]'
                }`}
                style={{ height: `${height}%` }}
              />
              <span className="text-[9px] text-white/40">{DAY_LABELS[i]}</span>
            </div>
          )
        })}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        {data.topActivity && (
          <div className="flex items-center gap-1.5">
            <Star className="w-3 h-3 text-amber-400/70" />
            <span className="text-[11px] text-white/60">
              Top: {ACTIVITY_LABELS[data.topActivity] || data.topActivity}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3 h-3 text-white/40" />
          <span className="text-[11px] text-white/60">
            Best: {data.longestStreak} days
          </span>
        </div>
      </div>
    </div>
  )
}
