'use client'

import { useState, useEffect } from 'react'
import { Activity, AlertTriangle, Loader2 } from 'lucide-react'

interface WellnessData {
  score: number | null
  mood?: number
  energy?: number
  engagement?: number
  trend?: number
  daysTracked?: number
  alert?: string | null
  insufficient?: boolean
  message?: string
}

function getScoreColor(score: number): string {
  if (score < 40) return 'text-red-400'
  if (score < 65) return 'text-yellow-400'
  return 'text-emerald-400'
}

function getScoreRingColor(score: number): string {
  if (score < 40) return 'stroke-red-400'
  if (score < 65) return 'stroke-yellow-400'
  return 'stroke-emerald-400'
}

function getScoreLabel(score: number): string {
  if (score < 40) return 'Needs care'
  if (score < 65) return 'Fair'
  if (score < 80) return 'Good'
  return 'Thriving'
}

export function WellnessScore() {
  const [data, setData] = useState<WellnessData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ai/wellness-score')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="glass-refined rounded-2xl p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/70 animate-spin" />
      </div>
    )
  }

  if (!data || data.insufficient || data.score === null) {
    return null
  }

  const score = data.score
  const circumference = 2 * Math.PI * 40
  const progress = (score / 100) * circumference

  const factors = [
    { label: 'Mood', value: data.mood || 0, max: 25 },
    { label: 'Energy', value: data.energy || 0, max: 25 },
    { label: 'Activity', value: data.engagement || 0, max: 25 },
    { label: 'Trend', value: data.trend || 0, max: 25 },
  ]

  return (
    <div className="glass-refined rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-white/85" />
        <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">Wellness Score</h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Circular gauge */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
            <circle
              cx="48" cy="48" r="40"
              fill="none"
              stroke="currentColor"
              className="text-white/10"
              strokeWidth="6"
            />
            <circle
              cx="48" cy="48" r="40"
              fill="none"
              className={getScoreRingColor(score)}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
            <span className="text-[9px] text-white/70">{getScoreLabel(score)}</span>
          </div>
        </div>

        {/* Sub-factors */}
        <div className="flex-1 space-y-2">
          {factors.map(f => (
            <div key={f.label}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-white/75">{f.label}</span>
                <span className="text-white/60">{f.value}/{f.max}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    f.value / f.max > 0.6 ? 'bg-emerald-400/70' : f.value / f.max > 0.3 ? 'bg-yellow-400/70' : 'bg-red-400/70'
                  }`}
                  style={{ width: `${(f.value / f.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {data.daysTracked && (
            <p className="text-[9px] text-white/60 mt-1">{data.daysTracked} day avg</p>
          )}
        </div>
      </div>

      {/* Alert banner */}
      {data.alert && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300/90 leading-relaxed">{data.alert}</p>
        </div>
      )}
    </div>
  )
}
