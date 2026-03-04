'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, BarChart3, Users, Activity, TrendingUp } from 'lucide-react'

interface StatsData {
  period: string
  days: number
  totalEvents: number
  totalUsers: number
  featureRanking: { feature: string; count: number }[]
  actionBreakdown: { feature: string; action: string; count: number }[]
  userCounts: { feature: string; users: number }[]
  dailyTrend: { day: string; events: number; users: number }[]
}

const PERIODS = ['7d', '14d', '30d'] as const

function formatFeature(f: string) {
  return f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function DevAnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>}>
      <DevAnalyticsContent />
    </Suspense>
  )
}

function DevAnalyticsContent() {
  const searchParams = useSearchParams()
  const key = searchParams.get('key')
  const [period, setPeriod] = useState<string>('7d')
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async (p: string) => {
    if (!key) return
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/stats?key=${encodeURIComponent(key)}&period=${p}`)
      if (!res.ok) {
        setError(res.status === 401 ? 'Access denied' : 'Failed to load stats')
        setData(null)
        return
      }
      setData(await res.json())
      setError(null)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => {
    fetchStats(period)
  }, [period, fetchStats])

  if (!key) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p className="text-white/50">Access denied</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  const maxCount = data?.featureRanking[0]?.count || 1
  const maxDailyEvents = data?.dailyTrend.reduce((m, d) => Math.max(m, d.events), 0) || 1

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Feature Analytics
          </h1>
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-sm transition ${
                  period === p ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/70'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          </div>
        ) : data ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Activity className="w-3.5 h-3.5" /> Total Events
                </div>
                <p className="text-2xl font-bold">{data.totalEvents.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Users className="w-3.5 h-3.5" /> Unique Users
                </div>
                <p className="text-2xl font-bold">{data.totalUsers.toLocaleString()}</p>
              </div>
            </div>

            {/* Feature ranking */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Feature Ranking
              </h2>
              {data.featureRanking.map(r => (
                <div key={r.feature} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{formatFeature(r.feature)}</span>
                    <span className="text-white/50">{r.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500/60 rounded-full transition-all"
                      style={{ width: `${(r.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {data.featureRanking.length === 0 && (
                <p className="text-white/30 text-sm">No events yet</p>
              )}
            </div>

            {/* Daily trend */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white/70">Daily Trend</h2>
              <div className="flex items-end gap-1 h-32">
                {data.dailyTrend.map(d => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end h-24">
                      <div
                        className="w-full bg-blue-500/50 rounded-t"
                        style={{ height: `${(d.events / maxDailyEvents) * 100}%`, minHeight: d.events > 0 ? '2px' : '0' }}
                        title={`${d.day}: ${d.events} events, ${d.users} users`}
                      />
                    </div>
                    <span className="text-[9px] text-white/30 -rotate-45 origin-top-left whitespace-nowrap">
                      {d.day.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
              {data.dailyTrend.length === 0 && (
                <p className="text-white/30 text-sm">No data for this period</p>
              )}
            </div>

            {/* Users per feature */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <h2 className="text-sm font-semibold text-white/70">Users per Feature</h2>
              <div className="divide-y divide-white/5">
                {data.userCounts.map(r => (
                  <div key={r.feature} className="flex justify-between py-2 text-sm">
                    <span>{formatFeature(r.feature)}</span>
                    <span className="text-white/50">{r.users} users</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action breakdown */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <h2 className="text-sm font-semibold text-white/70">Action Breakdown</h2>
              <div className="divide-y divide-white/5">
                {data.actionBreakdown.map((r, i) => (
                  <div key={`${r.feature}-${r.action}-${i}`} className="flex justify-between py-2 text-sm">
                    <span>
                      {formatFeature(r.feature)} <span className="text-white/30">/ {r.action}</span>
                    </span>
                    <span className="text-white/50">{r.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
