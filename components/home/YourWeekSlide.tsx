'use client'

import { useState, useEffect } from 'react'
import { BarChart3, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface DayData {
  date: string
  modules: number
  total: number
}

interface WeekStats {
  activeDays: number
  totalModules: number
  completionRate: number
  days: DayData[]
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function YourWeekSlide() {
  const [stats, setStats] = useState<WeekStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/progress/weekly-stats')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Link href="/progress" className="block w-full text-left group">
      <div className="relative p-6 rounded-2xl border border-white/[0.15] press-scale bg-black min-h-[10rem] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.12]">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-medium text-white">Your Week</h2>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white/75 transition-colors" />
        </div>

        {loading ? (
          <div className="space-y-3 mt-4">
            <div className="h-4 bg-white/5 rounded animate-pulse w-2/3" />
            <div className="flex gap-1.5">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="flex-1 h-8 bg-white/5 rounded-sm animate-pulse" />
              ))}
            </div>
          </div>
        ) : stats ? (
          <>
            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-white/80 mt-3">
              <span>{stats.activeDays}/7 days</span>
              <span>{stats.totalModules} modules</span>
              <span>{stats.completionRate}%</span>
            </div>

            {/* Day bars */}
            <div className="flex items-end gap-1.5 mt-3 h-10">
              {stats.days.map((day, i) => {
                const ratio = day.total > 0 ? day.modules / day.total : 0
                const isPast = new Date(day.date) <= new Date()
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-sm relative" style={{ height: '32px' }}>
                      <div className="absolute inset-0 rounded-sm bg-white/[0.08]" />
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-sm bg-white transition-all duration-500"
                        style={{ height: `${Math.max(ratio * 100, ratio > 0 ? 12 : 0)}%` }}
                      />
                    </div>
                    <span className={`text-[8px] ${isPast && ratio === 0 ? 'text-white/20' : 'text-white/60'}`}>
                      {DAY_LABELS[i]}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p className="text-xs text-white/60 mt-4">Start your first module to track progress</p>
        )}
      </div>
    </Link>
  )
}
