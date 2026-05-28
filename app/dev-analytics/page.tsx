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
  funnel: { active: number; mindsetSelected: number; journalCompleted: number; talkedToCoach: number }
  retention: { cohort: number; d1: number; d7: number }
  notifications: { total: number; byType: { type: string; count: number }[] }
  aiCost: {
    calls: number
    promptTokens: number
    completionTokens: number
    failures: number
    byEndpoint: { endpoint: string; calls: number; tokens: number }[]
  }
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

            {/* Activation Funnel — of users active in this period, how many hit each milestone */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white/70">Activation Funnel ({period})</h2>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Active', n: data.funnel.active },
                  { label: 'Mindset', n: data.funnel.mindsetSelected },
                  { label: 'Journaled', n: data.funnel.journalCompleted },
                  { label: 'Coach', n: data.funnel.talkedToCoach },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">{s.n}</div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">{s.label}</div>
                    {data.funnel.active > 0 && (
                      <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-white/40 rounded-full" style={{ width: `${(s.n / data.funnel.active) * 100}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Retention — D1/D7 for new users in the last 30 days */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <h2 className="text-sm font-semibold text-white/70">Retention (new users, last 30d)</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{data.retention.cohort}</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">Cohort</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{data.retention.cohort ? Math.round((data.retention.d1 / data.retention.cohort) * 100) : 0}%</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">D1</div>
                  <div className="text-[10px] text-white/30 mt-0.5">{data.retention.d1}/{data.retention.cohort}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{data.retention.cohort ? Math.round((data.retention.d7 / data.retention.cohort) * 100) : 0}%</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">D7</div>
                  <div className="text-[10px] text-white/30 mt-0.5">{data.retention.d7}/{data.retention.cohort}</div>
                </div>
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

            {/* Notifications — sends in period + by type */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <h2 className="text-sm font-semibold text-white/70">
                Notifications ({period}) — <span className="text-white">{data.notifications.total.toLocaleString()}</span> sent
              </h2>
              <div className="divide-y divide-white/5">
                {data.notifications.byType.map(r => (
                  <div key={r.type} className="flex justify-between py-2 text-sm">
                    <span>{formatFeature(r.type)}</span>
                    <span className="text-white/50">{r.count.toLocaleString()}</span>
                  </div>
                ))}
                {!data.notifications.byType.length && <p className="text-white/30 text-sm py-1">No sends yet</p>}
              </div>
            </div>

            {/* AI Cost — calls, tokens, failures, top endpoints */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white/70">AI Cost ({period})</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-white">{data.aiCost.calls.toLocaleString()}</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">Calls</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-white">{Math.round((data.aiCost.promptTokens + data.aiCost.completionTokens) / 1000).toLocaleString()}k</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">Tokens</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-white">{data.aiCost.calls ? Math.round((data.aiCost.failures / data.aiCost.calls) * 100) : 0}%</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">Failed</div>
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {data.aiCost.byEndpoint.map(r => (
                  <div key={r.endpoint} className="flex justify-between py-2 text-xs">
                    <span className="text-white/70">{r.endpoint}</span>
                    <span className="text-white/40">{r.calls.toLocaleString()} · {Math.round(r.tokens / 1000).toLocaleString()}k tok</span>
                  </div>
                ))}
                {!data.aiCost.byEndpoint.length && <p className="text-white/30 text-sm py-1">No AI calls yet</p>}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
