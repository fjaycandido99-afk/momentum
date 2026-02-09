'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Lightbulb, Target, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'

interface MoodChartPoint {
  date: string
  before: number | null
  after: number | null
}

interface WeeklyStats {
  completedDays: number
  totalModules: number
  journalEntries: number
  completionRate: number
  moodImprovedPercent: number
  energyCounts: { low: number; normal: number; high: number }
}

interface WeeklyData {
  summary: string
  insights: string[]
  nextWeekFocus: string
  moodChart: MoodChartPoint[]
  stats: WeeklyStats
}

export function WeeklyReflection() {
  const [data, setData] = useState<WeeklyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchWeekly() {
      try {
        const res = await fetch('/api/daily-guide/weekly-summary')
        if (!res.ok) throw new Error('Failed')
        const json = await res.json()
        setData(json)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchWeekly()
  }, [])

  if (loading) {
    return (
      <div className="glass-refined rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-white">Weekly Reflection</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  const { summary, insights, nextWeekFocus, moodChart, stats } = data

  // Mini mood chart
  const chartW = 280
  const chartH = 60
  const padding = 10
  const validPoints = moodChart.filter(p => p.before !== null || p.after !== null)
  const xStep = validPoints.length > 1 ? (chartW - padding * 2) / (validPoints.length - 1) : 0

  function toY(val: number | null): number | null {
    if (val === null) return null
    return chartH - padding - ((val / 2) * (chartH - padding * 2))
  }

  function buildPath(points: (number | null)[]): string {
    const segments: string[] = []
    let started = false
    points.forEach((y, i) => {
      if (y === null) { started = false; return }
      const x = padding + i * xStep
      segments.push(started ? `L${x},${y}` : `M${x},${y}`)
      started = true
    })
    return segments.join(' ')
  }

  const beforePath = buildPath(validPoints.map(p => toY(p.before)))
  const afterPath = buildPath(validPoints.map(p => toY(p.after)))

  return (
    <div className="glass-refined rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-medium text-white">Weekly Reflection</h3>
      </div>

      {/* Summary narrative */}
      <p className="text-xs text-white/70 leading-relaxed">{summary}</p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <p className="text-lg font-bold text-white">{stats.completedDays}</p>
          <p className="text-[10px] text-white/40">Full Days</p>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <p className="text-lg font-bold text-white">{stats.totalModules}</p>
          <p className="text-[10px] text-white/40">Modules</p>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <p className="text-lg font-bold text-white">{stats.moodImprovedPercent}%</p>
          <p className="text-[10px] text-white/40">Mood Up</p>
        </div>
      </div>

      {/* Mini mood chart */}
      {validPoints.length >= 2 && (
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/40 mb-2">Mood This Week</p>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ height: 60 }}>
            {beforePath && (
              <path d={beforePath} fill="none" stroke="rgba(251,191,36,0.5)" strokeWidth="2" strokeLinecap="round" />
            )}
            {afterPath && (
              <path d={afterPath} fill="none" stroke="rgba(168,85,247,0.8)" strokeWidth="2" strokeLinecap="round" />
            )}
            {/* Dots */}
            {validPoints.map((p, i) => {
              const x = padding + i * xStep
              const yB = toY(p.before)
              const yA = toY(p.after)
              return (
                <g key={i}>
                  {yB !== null && <circle cx={x} cy={yB} r="3" fill="rgba(251,191,36,0.7)" />}
                  {yA !== null && <circle cx={x} cy={yA} r="3" fill="rgba(168,85,247,0.9)" />}
                </g>
              )
            })}
          </svg>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-400/70" />
              <span className="text-[9px] text-white/40">Before</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-400/90" />
              <span className="text-[9px] text-white/40">After</span>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-xs font-medium text-white/80">Insights</p>
          </div>
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 bg-white/5 rounded-lg p-2">
              <div className="w-1 h-1 rounded-full bg-amber-400/60 mt-1.5 shrink-0" />
              <p className="text-[11px] text-white/60 leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      )}

      {/* Next week focus */}
      {nextWeekFocus && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-purple-400" />
            <p className="text-xs font-medium text-purple-300">Next Week Focus</p>
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed">{nextWeekFocus}</p>
        </div>
      )}
    </div>
  )
}
