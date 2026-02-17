'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'

interface PathInsight {
  text: string
  theme: string
  affirmation: string
}

interface DailyInsightCardProps {
  mindsetId: MindsetId
}

const THEME_COLORS: Record<string, string> = {
  stoic: 'from-slate-500/20 to-zinc-500/20 text-slate-300',
  existentialist: 'from-violet-500/20 to-indigo-500/20 text-violet-300',
  cynic: 'from-orange-500/20 to-amber-500/20 text-orange-300',
  hedonist: 'from-emerald-500/20 to-teal-500/20 text-emerald-300',
  samurai: 'from-red-500/20 to-rose-500/20 text-red-300',
  scholar: 'from-blue-500/20 to-indigo-500/20 text-blue-300',
}

export function DailyInsightCard({ mindsetId }: DailyInsightCardProps) {
  const [insight, setInsight] = useState<PathInsight | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const response = await fetch(`/api/daily-guide/path-insight?mindset=${mindsetId}`, { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setInsight(data.insight)
        }
      } catch (error) {
        console.error('Failed to load path insight:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchInsight()
  }, [mindsetId])

  const themeColor = THEME_COLORS[mindsetId] || THEME_COLORS.stoic

  if (isLoading) {
    return (
      <div className="card-path p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <Sparkles className="w-4 h-4 text-white/85" />
          <h3 className="text-sm font-medium text-white">Daily Insight</h3>
        </div>
        <div className="space-y-2.5">
          <div className="h-4 rounded bg-white/5 skeleton-shimmer w-full" />
          <div className="h-4 rounded bg-white/5 skeleton-shimmer w-5/6" />
          <div className="h-4 rounded bg-white/5 skeleton-shimmer w-2/3" />
        </div>
      </div>
    )
  }

  if (!insight) return null

  return (
    <div className="card-path p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-white/85" />
          <h3 className="text-sm font-medium text-white">Daily Insight</h3>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-white/[0.06] text-white/85">
          {insight.theme}
        </span>
      </div>

      <p className="text-[14px] text-white leading-relaxed">{insight.text}</p>

      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        <p className="text-[13px] text-white/80 italic">&ldquo;{insight.affirmation}&rdquo;</p>
      </div>
    </div>
  )
}
