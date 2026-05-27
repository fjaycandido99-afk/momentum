'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, ChevronDown, Loader2, Sparkles, TrendingUp } from 'lucide-react'
import { logXPEventServer } from '@/lib/gamification'

interface RetroData {
  month?: string
  stats?: {
    totalDays: number
    journalDays: number
    dominantMood: string
    avgWellness: number | null
    topTags: string[]
    moodChart: { date: string; mood: string }[]
  }
  emotionalArc?: string
  commonThemes?: string[]
  goalProgress?: string
  bestDays?: string[]
  growthInsights?: string[]
  nextMonthSuggestion?: string
  insufficient?: boolean
  message?: string
}

const MOOD_EMOJI: Record<string, string> = {
  awful: '😞', low: '😔', okay: '😐', good: '😊', great: '😄',
}

export function MonthlyRetrospective() {
  const [data, setData] = useState<RetroData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [xpAwarded, setXpAwarded] = useState(false)

  const loadRetro = async () => {
    if (data) {
      setExpanded(!expanded)
      return
    }
    setLoading(true)
    setExpanded(true)
    try {
      const res = await fetch('/api/ai/monthly-retrospective')
      if (res.ok) {
        const result = await res.json()
        setData(result)
        if (!result.insufficient && !result.cached && !xpAwarded) {
          logXPEventServer('monthlyReview', 'monthly-retrospective')
          setXpAwarded(true)
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-refined rounded-2xl overflow-hidden">
      <button
        onClick={loadRetro}
        className="w-full p-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/15">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-white">Monthly Review</h3>
            <p className="text-[10px] text-white/70">Personalized monthly insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 text-white/70 animate-spin" />}
          <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && data && !data.insufficient && (
        <div className="px-5 pb-5 space-y-4 animate-fade-in">
          {/* Stats summary */}
          {data.stats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-white/5 text-center">
                <p className="text-lg font-bold text-white">{data.stats.totalDays}</p>
                <p className="text-[9px] text-white/70">Days Tracked</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 text-center">
                <p className="text-lg font-bold text-white">{data.stats.journalDays}</p>
                <p className="text-[9px] text-white/70">Journal Days</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 text-center">
                <p className="text-lg">{MOOD_EMOJI[data.stats.dominantMood] || '😐'}</p>
                <p className="text-[9px] text-white/70 capitalize">{data.stats.dominantMood}</p>
              </div>
            </div>
          )}

          {/* Top Tags */}
          {data.stats?.topTags && data.stats.topTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.stats.topTags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] text-white">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Emotional Arc */}
          {data.emotionalArc && (
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-[10px] font-semibold text-white uppercase tracking-wider mb-1">Emotional Arc</p>
              <p className="text-xs text-white/80 leading-relaxed">{data.emotionalArc}</p>
            </div>
          )}

          {/* Growth Insights */}
          {data.growthInsights && data.growthInsights.length > 0 && (
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-[10px] font-semibold text-white uppercase tracking-wider mb-2">
                <TrendingUp className="w-3 h-3 inline mr-1" />Growth Insights
              </p>
              <ul className="space-y-1.5">
                {data.growthInsights.map((insight, i) => (
                  <li key={i} className="text-xs text-white/85 flex items-start gap-2">
                    <span className="text-white mt-0.5">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Best Days */}
          {data.bestDays && data.bestDays.length > 0 && (
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-[10px] font-semibold text-white uppercase tracking-wider mb-2">Standout Days</p>
              <ul className="space-y-1.5">
                {data.bestDays.map((day, i) => (
                  <li key={i} className="text-xs text-white/85 flex items-start gap-2">
                    <span className="text-white">⭐</span>
                    {day}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Month Suggestion */}
          {data.nextMonthSuggestion && (
            <div className="p-3 rounded-xl bg-white/10 border border-white/20">
              <p className="text-[10px] font-semibold text-white uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3 inline mr-1" />Next Month
              </p>
              <p className="text-xs text-white/80 leading-relaxed">{data.nextMonthSuggestion}</p>
            </div>
          )}
        </div>
      )}

      {expanded && data?.insufficient && (
        <div className="px-5 pb-5">
          <p className="text-xs text-white/70">{data.message}</p>
        </div>
      )}
    </div>
  )
}
