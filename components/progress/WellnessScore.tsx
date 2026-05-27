'use client'

import { useState, useEffect } from 'react'
import { Activity, AlertTriangle } from 'lucide-react'
import { AuraRing } from '@/components/ui/Aura'

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
      <div className="glass-refined p-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-24 h-24 rounded-full border-4 border-white/[0.06] animate-pulse" />
        </div>
      </div>
    )
  }

  if (!data || data.insufficient || data.score === null) {
    return null
  }

  const score = data.score

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
        {/* Circular gauge — signature aura ring */}
        <div className="relative w-24 h-24 shrink-0 grid place-items-center">
          <AuraRing size={96} stroke={6} progress={score / 100} breathe={false}>
            <div className="flex flex-col items-center justify-center leading-tight">
              <span className="text-2xl font-bold text-white">{score}</span>
              <span className="text-[9px] text-white/70">{getScoreLabel(score)}</span>
            </div>
          </AuraRing>
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
                  className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${(f.value / f.max) * 100}%`, opacity: 0.35 + (f.value / f.max) * 0.55 }}
                />
              </div>
            </div>
          ))}
          {data.daysTracked && (
            <p className="text-[9px] text-white/60 mt-1">{data.daysTracked} day avg</p>
          )}
        </div>
      </div>

      {/* Alert banner — monochrome, signalled by the icon */}
      {data.alert && (
        <div className="mt-4 p-3 rounded-xl bg-white/[0.06] border border-white/15 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-white/70 shrink-0 mt-0.5" />
          <p className="text-xs text-white/80 leading-relaxed">{data.alert}</p>
        </div>
      )}
    </div>
  )
}
