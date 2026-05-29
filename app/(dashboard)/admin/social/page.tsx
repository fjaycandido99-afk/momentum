'use client'

/* ============================================================================
   /admin/social — moderation queue.
   Lists pending reports (auto-crisis first), shows the target content
   inline, lets the admin Hide / Dismiss / Clear-Crisis with a one-tap
   action + optional resolution notes.
   ============================================================================ */

import { useEffect, useState, useCallback } from 'react'
import { Loader2, AlertTriangle, Flag, EyeOff, Check } from 'lucide-react'

interface Report {
  id: string
  target_type: 'post' | 'comment'
  target_id: string
  reporter_id: string | null
  reason: string
  notes: string | null
  status: string
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target: any | null
}

const REASON_LABEL: Record<string, string> = {
  abuse:             'Abuse / harassment',
  spam:              'Spam',
  off_topic:         'Off-topic',
  self_harm_concern: 'Self-harm concern',
  auto_crisis:       'AUTO: crisis detected',
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  return `${Math.floor(hr / 24)}d`
}

export default function AdminSocialPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/social/reports')
      if (res.status === 403) { setForbidden(true); return }
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      setReports(data.reports || [])
    } catch (err) {
      console.error('[admin/social] load failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const resolve = async (reportId: string, action: 'hide' | 'dismiss' | 'clear_crisis') => {
    setBusyId(reportId)
    try {
      const res = await fetch('/api/admin/social/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, action }),
      })
      if (res.ok) setReports(rs => rs.filter(r => r.id !== reportId))
    } finally {
      setBusyId(null)
    }
  }

  if (forbidden) {
    return (
      <div className="min-h-screen p-8 text-white">
        <h1 className="text-xl font-bold">Forbidden</h1>
        <p className="mt-2 text-sm text-white/60">
          Your user_id isn&apos;t in <code>ADMIN_USER_IDS</code>. Add it in Vercel env.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white pb-24 lg:max-w-3xl lg:mx-auto">
      <div className="px-6 pt-12 pb-3">
        <h1 className="text-2xl font-bold">Moderation queue</h1>
        <p className="text-xs text-white/55 mt-1">
          Auto-crisis reports surface first. Hide removes from feed; Clear-Crisis unlocks comments on a post that&apos;s OK.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/60 animate-spin" /></div>
      )}

      {!isLoading && reports.length === 0 && (
        <p className="text-sm text-white/55 text-center py-12">Queue is clear. ✨</p>
      )}

      <div className="px-6 space-y-3">
        {reports.map(r => {
          const isCrisis = r.reason === 'auto_crisis' || r.reason === 'self_harm_concern'
          return (
            <div key={r.id} className={`p-4 rounded-2xl border ${isCrisis ? 'bg-amber-500/[0.06] border-amber-400/25' : 'bg-white/[0.04] border-white/[0.10]'}`}>
              <div className="flex items-center gap-2 mb-2">
                {isCrisis ? <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> : <Flag className="w-3.5 h-3.5 text-white/55" />}
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/75">{REASON_LABEL[r.reason] || r.reason}</span>
                <span className="text-[11px] text-white/45">· {r.target_type}</span>
                <span className="ml-auto text-[11px] text-white/45">{relTime(r.created_at)} ago</span>
              </div>
              {r.notes && <p className="text-xs text-white/70 mb-2 italic">&ldquo;{r.notes}&rdquo;</p>}

              {r.target ? (
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                  <p className="text-[13.5px] text-white/90 leading-relaxed whitespace-pre-wrap line-clamp-6">
                    {r.target.body || '(no body)'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-white/50 italic">(target was deleted)</p>
              )}

              <div className="mt-3 flex gap-2 justify-end">
                {r.target_type === 'post' && r.target?.crisis_level && (
                  <button
                    onClick={() => void resolve(r.id, 'clear_crisis')}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white"
                  >
                    <Check className="w-3 h-3" /> Clear crisis
                  </button>
                )}
                <button
                  onClick={() => void resolve(r.id, 'dismiss')}
                  disabled={busyId === r.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white/85"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => void resolve(r.id, 'hide')}
                  disabled={busyId === r.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 hover:bg-red-500/25 border border-red-400/30 text-xs text-red-200"
                >
                  <EyeOff className="w-3 h-3" /> Hide
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
