'use client'

import { useState, useEffect } from 'react'
import { BarChart3, ChevronDown, ChevronUp, Crown } from 'lucide-react'
import Link from 'next/link'

interface WeeklyStats {
  completedDays: number
  totalModules: number
  completionRate: number
}

interface WeeklyData {
  summary: string
  stats: WeeklyStats
  moodChart: { date: string; before: number | null; after: number | null }[]
}

interface WeeklyDigestCardProps {
  isPremium: boolean
}

export function WeeklyDigestCard({ isPremium }: WeeklyDigestCardProps) {
  const [data, setData] = useState<WeeklyData | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  // Only show on Sunday (0) and Monday (1)
  const day = new Date().getDay()
  const isDigestDay = day === 0 || day === 1

  useEffect(() => {
    if (!isDigestDay || !isPremium) {
      setIsLoading(false)
      return
    }
    fetch('/api/daily-guide/weekly-summary')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setIsLoading(false))
  }, [isPremium, isDigestDay])

  if (!isDigestDay || error) return null

  return (
    <div className="px-6 mb-4 liquid-reveal section-fade-bg">
      <div className="p-5 rounded-3xl bg-black border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-white/70" />
            <h3 className="text-sm font-medium text-white">Your Week</h3>
          </div>
          {isPremium && data && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              {isExpanded
                ? <ChevronUp className="w-4 h-4 text-white/50" />
                : <ChevronDown className="w-4 h-4 text-white/50" />
              }
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
          </div>
        ) : !isPremium ? (
          <div>
            <p className="text-xs text-white/60 mb-3">
              See your weekly stats, AI insights, and mood trends.
            </p>
            <Link
              href="/settings?tab=subscription"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-medium"
            >
              <Crown className="w-3 h-3" />
              Unlock with Premium
            </Link>
          </div>
        ) : data ? (
          <>
            <div className="flex items-center gap-4 text-xs text-white/80">
              <span>{data.stats.completedDays}/7 days</span>
              <span>{data.stats.totalModules} modules</span>
              <span>{data.stats.completionRate}%</span>
            </div>

            {/* Mini mood bars */}
            {data.moodChart.length > 0 && (
              <div className="flex items-end gap-1 mt-3 h-8">
                {data.moodChart.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-sm bg-white"
                      style={{ height: `${((m.after ?? 0) + 1) * 8}px` }}
                    />
                  </div>
                ))}
              </div>
            )}

            {isExpanded && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-xs text-white/70 leading-relaxed">{data.summary}</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
