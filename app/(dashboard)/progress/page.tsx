'use client'

import { useState, useEffect } from 'react'
import { Loader2, Flame } from 'lucide-react'
import { StreakHeatmap } from '@/components/progress/StreakHeatmap'
import { ListeningStats } from '@/components/progress/ListeningStats'
import { ModulesCompleted } from '@/components/progress/ModulesCompleted'
import { MoodTrends } from '@/components/progress/MoodTrends'
import { XPProgress } from '@/components/progress/XPProgress'

interface ProgressData {
  streak: number
  activeDays: number
  listeningMinutes: number
  categoryMinutes: Record<string, number>
  modulesCompleted: number
  moodData: { date: string; before: number | null; after: number | null }[]
  heatmap: Record<string, number>
  daysLimit: number
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/progress')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen text-white pb-24">
      <div className="px-6 pt-12 pb-4 header-fade-bg">
        <h1 className="text-2xl font-semibold shimmer-text">Progress</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-white/50 text-sm">Unable to load progress data</div>
      ) : (
        <div className="px-6 space-y-4">
          {/* Streak */}
          <div className="glass-refined rounded-2xl p-4 flex items-center gap-3">
            <Flame className="w-6 h-6 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-amber-400">{data.streak}</p>
              <p className="text-xs text-white/50">day streak</p>
            </div>
          </div>

          {/* XP */}
          <XPProgress />

          {/* Heatmap */}
          <StreakHeatmap heatmap={data.heatmap} daysLimit={data.daysLimit} />

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <ModulesCompleted count={data.modulesCompleted} activeDays={data.activeDays} />
            <ListeningStats totalMinutes={data.listeningMinutes} categoryMinutes={data.categoryMinutes} />
          </div>

          {/* Mood */}
          <MoodTrends moodData={data.moodData} />
        </div>
      )}
    </div>
  )
}
