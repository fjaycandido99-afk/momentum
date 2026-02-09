'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Brain, Heart, Lightbulb, TrendingUp, Loader2 } from 'lucide-react'

interface JournalInsightsData {
  themes: string[]
  emotionalTrend: string
  gratitudePatterns: string
  suggestion: string
  moodCorrelation: string
  insufficient?: boolean
}

export function JournalInsights() {
  const [data, setData] = useState<JournalInsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch('/api/ai/journal-insights')
        if (!res.ok) throw new Error('Failed')
        const json = await res.json()
        setData(json)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchInsights()
  }, [])

  if (loading) {
    return (
      <div className="glass-refined rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-medium text-white">Journal Insights</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !data) return null

  if (data.insufficient) {
    return (
      <div className="glass-refined rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-medium text-white">Journal Insights</h3>
        </div>
        <p className="text-xs text-white/40 py-4 text-center">{data.suggestion}</p>
      </div>
    )
  }

  return (
    <div className="glass-refined rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-medium text-white">Journal Insights</h3>
        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full">AI</span>
      </div>

      {/* Theme tags */}
      {data.themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.themes.map((theme, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/70 border border-white/5"
            >
              {theme}
            </span>
          ))}
        </div>
      )}

      {/* Emotional trend */}
      {data.emotionalTrend && (
        <div className="flex items-start gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-white/60 leading-relaxed">{data.emotionalTrend}</p>
        </div>
      )}

      {/* Gratitude patterns */}
      {data.gratitudePatterns && (
        <div className="flex items-start gap-2">
          <Heart className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-white/60 leading-relaxed">{data.gratitudePatterns}</p>
        </div>
      )}

      {/* Mood correlation */}
      {data.moodCorrelation && (
        <div className="flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-white/60 leading-relaxed">{data.moodCorrelation}</p>
        </div>
      )}

      {/* Suggestion */}
      {data.suggestion && (
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
            <p className="text-xs font-medium text-cyan-300">Suggestion</p>
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed">{data.suggestion}</p>
        </div>
      )}
    </div>
  )
}
