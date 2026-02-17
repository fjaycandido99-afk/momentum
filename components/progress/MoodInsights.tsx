'use client'

import { TrendingUp, TrendingDown, Minus, Calendar, BookOpen } from 'lucide-react'

interface MoodInsightsProps {
  insights: {
    averageMood: number
    improvementPercent: number
    bestDay: string
    journalCorrelation: boolean
    totalEntries: number
    weeklyBreakdown: { day: string; average: number }[]
  }
}

const MOOD_LABELS: Record<number, string> = {
  1: 'Awful',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
}

function getMoodLabel(score: number): string {
  const rounded = Math.round(score)
  return MOOD_LABELS[rounded] || 'N/A'
}

function getMoodColor(score: number): string {
  if (score >= 4) return 'text-emerald-400'
  if (score >= 3) return 'text-amber-400'
  return 'text-red-400'
}

export function MoodInsights({ insights }: MoodInsightsProps) {
  if (insights.totalEntries < 3) {
    return (
      <div className="glass-refined rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-white mb-2">Mood Insights</h3>
        <p className="text-xs text-white/60">Log your mood at least 3 times to see insights</p>
      </div>
    )
  }

  const TrendIcon = insights.improvementPercent > 0
    ? TrendingUp
    : insights.improvementPercent < 0
    ? TrendingDown
    : Minus

  const trendColor = insights.improvementPercent > 0
    ? 'text-emerald-400'
    : insights.improvementPercent < 0
    ? 'text-red-400'
    : 'text-white/60'

  return (
    <div className="glass-refined rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Mood Insights</h3>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 rounded-xl bg-white/[0.03] text-center">
          <p className={`text-lg font-bold ${getMoodColor(insights.averageMood)}`}>
            {insights.averageMood.toFixed(1)}
          </p>
          <p className="text-[9px] text-white/60">Avg Mood</p>
          <p className={`text-[8px] ${getMoodColor(insights.averageMood)}`}>{getMoodLabel(insights.averageMood)}</p>
        </div>
        <div className="p-2 rounded-xl bg-white/[0.03] text-center">
          <div className="flex items-center justify-center gap-0.5">
            <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
            <p className={`text-lg font-bold ${trendColor}`}>
              {Math.abs(insights.improvementPercent)}%
            </p>
          </div>
          <p className="text-[9px] text-white/60">30d Trend</p>
        </div>
        <div className="p-2 rounded-xl bg-white/[0.03] text-center">
          <p className="text-lg font-bold text-blue-400">{insights.totalEntries}</p>
          <p className="text-[9px] text-white/60">Entries</p>
        </div>
      </div>

      {/* Insight cards */}
      <div className="space-y-2">
        {insights.bestDay && (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02]">
            <Calendar className="w-3.5 h-3.5 text-blue-400/60 shrink-0" />
            <p className="text-[11px] text-white/75">
              Your best day is <span className="text-white font-medium">{insights.bestDay}</span>
            </p>
          </div>
        )}
        {insights.journalCorrelation && (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02]">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400/60 shrink-0" />
            <p className="text-[11px] text-white/75">
              Your mood is <span className="text-emerald-400 font-medium">higher</span> on days you journal
            </p>
          </div>
        )}
      </div>

      {/* Weekly breakdown mini bars */}
      {insights.weeklyBreakdown.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] text-white/50 mb-2">Weekly Pattern</p>
          <div className="flex items-end gap-1 h-10">
            {insights.weeklyBreakdown.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-t-sm ${getMoodColor(d.average).replace('text-', 'bg-')}/30`}
                  style={{ height: `${(d.average / 5) * 100}%` }}
                />
                <span className="text-[7px] text-white/50">{d.day.slice(0, 2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
