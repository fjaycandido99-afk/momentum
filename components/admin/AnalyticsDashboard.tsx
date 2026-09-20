'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, BarChart3, Users, Activity, TrendingUp } from 'lucide-react'

interface FunnelRow {
  key: string
  label: string
  value: number
  note?: string
  events?: boolean
  ofTop: number | null
  ofPrev: number | null
  anomaly: boolean
}

interface EraStats {
  steps: FunnelRow[]
  byEra: { key: string; starts: number; promises: number; kept: number; answered: number; keptPercent: number | null; promisesPerEra: number | null }[]
  promises: { made: number; answered: number; kept: number; keptPercent: number | null }
  stuck: { startedNeverPromised: number; aliveNow: number; erasStarted: number }
  missions: { done: number; top: { eraKey: string; day: number; text: string; count: number }[] }
}

interface MoneyStats {
  byStatus: { status: string; tier: string; people: number }[]
  trialsStarted: number
  trialsLive: number
  started: number
  cancelled: number
}

interface ThoughtStats {
  read: {
    answers: number
    people: number
    byAxis: { axis: string; answers: number; people: number; lean: number }[]
    signatures: { signature: string; people: number }[]
  }
  journal: {
    days: number
    people: number
    mood: { value: string; count: number }[]
    tags: { tag: string; count: number }[]
    prompts: { prompt: string; count: number }[]
  }
  guide: {
    moodMoved: { better: number; same: number; worse: number }
    energy: { value: string; count: number }[]
  }
  promises: {
    blockers: { key: string; count: number }[]
    helpers: { key: string; count: number }[]
    confidence: { bucket: 'sure' | 'unsure'; answered: number; kept: number; keptPercent: number | null }[]
  }
}

interface StatsData {
  period: string
  days: number
  era: EraStats
  thoughts: ThoughtStats
  wake: { callsSet: number; callsSent: number; callsOpened: number }
  money: MoneyStats
  wellness: {
    optedIn: number
    days: number
    people: number
    scales: { scale: string; mean: number; answers: number }[]
    tags: { tag: string; count: number }[]
    keptByState: { scale: string; end: string; answered: number; kept: number; keptPercent: number | null }[]
  }
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

/**
 * The owner's dashboard. Rendered two ways, one implementation:
 *   /admin          signed in as an admin account — nothing in the URL
 *   /dev-analytics  with ?key=CRON_SECRET, for scripts and for a browser
 *                   that isn't signed in
 *
 * Pass `apiKey` for the second; leave it out and the request goes with the
 * session cookie instead, which /api/analytics/stats accepts from an admin.
 */
export function AnalyticsDashboard({ apiKey = null }: { apiKey?: string | null }) {
  const [period, setPeriod] = useState<string>('7d')
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async (p: string) => {
    setLoading(true)
    try {
      const url = apiKey
        ? `/api/analytics/stats?key=${encodeURIComponent(apiKey)}&period=${p}`
        : `/api/analytics/stats?period=${p}`
      const res = await fetch(url, { cache: 'no-store' })
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
  }, [apiKey])

  useEffect(() => {
    fetchStats(period)
  }, [period, fetchStats])

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

            {/* The era loop, counted from rows (Era / EraPromise / EraReferral)
                where rows exist, so it's right for eras that started before
                any tracking. Steps marked "counts visits" come from events. */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white/70">Era funnel ({period})</h2>
              <div className="space-y-2">
                {data.era.steps.map(s => {
                  const top = data.era.steps[0]?.value || 0
                  const width = top > 0 ? Math.min(100, (s.value / top) * 100) : 0
                  return (
                    <div key={s.key} className="space-y-1">
                      <div className="flex justify-between items-baseline text-sm gap-3">
                        <span className="truncate">
                          {s.label}
                          {s.note && <span className="text-white/35 text-xs"> · {s.note}</span>}
                        </span>
                        <span className="text-white/50 shrink-0 tabular-nums">
                          {s.value.toLocaleString()}
                          {s.ofPrev !== null && (
                            <span className={`ml-2 text-xs ${s.anomaly ? 'text-amber-400/80' : 'text-white/30'}`}>
                              {s.anomaly ? '↑' : ''}{s.ofPrev}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.events ? 'bg-white/25' : 'bg-emerald-500/60'}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: 'Promises kept', n: data.era.promises.keptPercent === null ? '—' : `${data.era.promises.keptPercent}%`, sub: `${data.era.promises.kept}/${data.era.promises.answered} answered` },
                  { label: 'Alive now', n: data.era.stuck.aliveNow, sub: 'promised in 2 days' },
                  { label: 'Started, never promised', n: data.era.stuck.startedNeverPromised, sub: `of ${data.era.stuck.erasStarted} eras` },
                ].map(c => (
                  <div key={c.label} className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{c.n}</div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1 leading-tight">{c.label}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">{c.sub}</div>
                  </div>
                ))}
              </div>
              {data.era.byEra.length > 0 && (
                <div className="pt-2 space-y-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Which era, and whether they keep it</p>
                  {data.era.byEra.map(e => (
                    <div key={e.key} className="flex justify-between text-xs text-white/70">
                      <span>{formatFeature(e.key)}</span>
                      <span className="text-white/45 tabular-nums">
                        {e.starts} started · {e.promisesPerEra ?? '—'}/era · {e.keptPercent === null ? 'no answers' : `${e.keptPercent}% kept`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-xs text-white/45 pt-2 border-t border-white/5">
                <span>Wake-up calls</span>
                <span className="tabular-nums">{data.wake.callsSet} set · {data.wake.callsSent} sent · {data.wake.callsOpened} opened</span>
              </div>
              <div className="flex justify-between text-xs text-white/45">
                <span>Missions done</span>
                <span className="tabular-nums">{data.era.missions.done}</span>
              </div>
              {data.era.missions.top.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Missions people actually do</p>
                  {data.era.missions.top.map(m => (
                    <div key={`${m.eraKey}-${m.day}`} className="flex justify-between gap-3 text-xs text-white/70">
                      <span className="truncate">{m.text}</span>
                      <span className="text-white/45 shrink-0 tabular-nums">{formatFeature(m.eraKey)} d{m.day} · {m.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Wellness check-ins — only from people who turned them on.
                Self-reported numbers, never a clinical measure of anyone. */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-white/70">Wellness check-ins ({period})</h2>
                <p className="text-[10px] text-white/35 mt-0.5">
                  {data.wellness.optedIn} opted in · {data.wellness.days} days from {data.wellness.people} · self-reported, not clinical
                </p>
              </div>

              {data.wellness.scales.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {data.wellness.scales.map(s => (
                    <div key={s.scale} className="bg-white/[0.03] rounded-lg p-3 text-center">
                      <div className="text-xl font-bold">{s.mean}</div>
                      <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">{s.scale}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{s.answers} answers</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/30">Nobody has checked in yet.</p>
              )}

              {data.wellness.keptByState.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Promises kept, by the state they were in</p>
                  {data.wellness.keptByState.map(r => (
                    <div key={`${r.scale}-${r.end}`} className="flex justify-between text-xs text-white/70">
                      <span>{formatFeature(r.scale)} · {r.end === 'high' ? '4–5' : '1–2'}</span>
                      <span className="text-white/45 tabular-nums">
                        {r.keptPercent === null ? '—' : `${r.keptPercent}% kept`} · {r.kept}/{r.answered}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {data.wellness.tags.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">What was going on</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.wellness.tags.map(t => (
                      <span key={t.tag} className="text-xs bg-white/[0.06] rounded-full px-2.5 py-1">
                        {formatFeature(t.tag)} <span className="text-white/45">{t.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Money, counted from the Subscription rows Stripe and
                RevenueCat already write — no webhook events to double-count. */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <h2 className="text-sm font-semibold text-white/70">Subscriptions ({period})</h2>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Trials started', n: data.money.trialsStarted },
                  { label: 'Trials live', n: data.money.trialsLive },
                  { label: 'Premium started', n: data.money.started },
                  { label: 'Cancelled', n: data.money.cancelled },
                ].map(c => (
                  <div key={c.label} className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{c.n}</div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1 leading-tight">{c.label}</div>
                  </div>
                ))}
              </div>
              {data.money.byStatus.length > 0 && (
                <div className="pt-1 space-y-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Everyone, right now</p>
                  {data.money.byStatus.map(s => (
                    <div key={`${s.tier}-${s.status}`} className="flex justify-between text-xs text-white/70">
                      <span>{formatFeature(s.tier)} · {formatFeature(s.status)}</span>
                      <span className="text-white/45 tabular-nums">{s.people}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* What people tapped — Daily Read answers, moods and their own
                tags. Nothing here is text anyone wrote: the privacy policy
                says the journal is read only to write one reply. */}
            <div className="bg-white/5 rounded-xl p-4 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white/70">What people think ({period})</h2>
                <p className="text-[10px] text-white/35 mt-0.5">From what they tapped — answers, moods, tags. Never what they wrote.</p>
              </div>

              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">
                  Daily Read · {data.thoughts.read.answers} answers from {data.thoughts.read.people}
                </p>
                <div className="mt-2 space-y-2">
                  {data.thoughts.read.byAxis.map(a => (
                    <div key={a.axis} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{formatFeature(a.axis)}</span>
                        <span className="text-white/45 tabular-nums">{a.lean > 0 ? '+' : ''}{a.lean} · {a.answers} answers</span>
                      </div>
                      {/* −2…+2 around a centre line: which way the group leans. */}
                      <div className="relative h-2 bg-white/5 rounded-full">
                        <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
                        <div
                          className={`absolute inset-y-0 rounded-full ${a.lean >= 0 ? 'bg-emerald-500/60' : 'bg-amber-500/60'}`}
                          style={
                            a.lean >= 0
                              ? { left: '50%', width: `${Math.min(50, (a.lean / 2) * 50)}%` }
                              : { right: '50%', width: `${Math.min(50, (Math.abs(a.lean) / 2) * 50)}%` }
                          }
                        />
                      </div>
                    </div>
                  ))}
                  {data.thoughts.read.byAxis.length === 0 && <p className="text-xs text-white/30">No answers yet.</p>}
                </div>
                {data.thoughts.read.signatures.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Signatures (5+ answers behind them)</p>
                    {data.thoughts.read.signatures.map(s => (
                      <div key={s.signature} className="flex justify-between text-xs text-white/70">
                        <span className="truncate">{s.signature}</span>
                        <span className="text-white/45">{s.people}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">
                  Journal mood · {data.thoughts.journal.days} days from {data.thoughts.journal.people}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {data.thoughts.journal.mood.map(m => (
                    <span key={m.value} className="text-xs bg-white/[0.06] rounded-full px-2.5 py-1">
                      {m.value} <span className="text-white/45">{m.count}</span>
                    </span>
                  ))}
                  {data.thoughts.journal.mood.length === 0 && <span className="text-xs text-white/30">No moods yet.</span>}
                </div>
                <p className="text-xs text-white/45 mt-2">
                  Guide days where mood moved: <span className="text-emerald-400/80">{data.thoughts.guide.moodMoved.better} better</span>
                  {' · '}{data.thoughts.guide.moodMoved.same} same
                  {' · '}<span className="text-amber-400/80">{data.thoughts.guide.moodMoved.worse} worse</span>
                </p>
              </div>

              {/* The check-in's one-tap answers: what stops people, what
                  helps, and whether their own certainty predicts anything. */}
              {(data.thoughts.promises.blockers.length > 0
                || data.thoughts.promises.helpers.length > 0
                || data.thoughts.promises.confidence.length > 0) && (
                <div className="space-y-3">
                  {data.thoughts.promises.confidence.length > 0 && (
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Did their own certainty predict it?</p>
                      <div className="mt-1.5 space-y-1">
                        {data.thoughts.promises.confidence.map(c => (
                          <div key={c.bucket} className="flex justify-between text-xs text-white/70">
                            <span>{c.bucket === 'sure' ? 'Felt sure (4–5)' : "Wasn't sure (1–3)"}</span>
                            <span className="text-white/45 tabular-nums">
                              {c.keptPercent === null ? 'no answers' : `${c.keptPercent}% kept`} · {c.kept}/{c.answered}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {([['blockers', 'What stopped them'], ['helpers', 'What helped']] as const).map(([field, title]) =>
                    data.thoughts.promises[field].length > 0 ? (
                      <div key={field}>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">{title}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {data.thoughts.promises[field].map(r => (
                            <span key={r.key} className="text-xs bg-white/[0.06] rounded-full px-2.5 py-1">
                              {formatFeature(r.key)} <span className="text-white/45">{r.count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
              )}

              {(data.thoughts.journal.tags.length > 0 || data.thoughts.journal.prompts.length > 0) && (
                <div className="grid grid-cols-1 gap-3">
                  {data.thoughts.journal.tags.length > 0 && (
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Tags they chose</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {data.thoughts.journal.tags.map(t => (
                          <span key={t.tag} className="text-xs bg-white/[0.06] rounded-full px-2.5 py-1">
                            {t.tag} <span className="text-white/45">{t.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.thoughts.journal.prompts.length > 0 && (
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Prompts they answered</p>
                      <div className="mt-1.5 space-y-1">
                        {data.thoughts.journal.prompts.map(p => (
                          <div key={p.prompt} className="flex justify-between gap-3 text-xs text-white/70">
                            <span className="truncate">{p.prompt}</span>
                            <span className="text-white/45 shrink-0">{p.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
