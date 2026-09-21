'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Link2, Loader2, Plus } from 'lucide-react'
import { codeFromLabel, type ReferralStat } from '@/lib/referral/codes'

/**
 * The owner's referral links: make one, copy it, see what it brought in.
 *
 * Clicks and signups are shown as separate columns rather than folded into
 * one "referrals" number, because they answer different questions — how many
 * people tapped, and how many became accounts — and a bonus paid on the
 * wrong one of those is an argument later.
 */
export function ReferralLinks() {
  const [codes, setCodes] = useState<ReferralStat[] | null>(null)
  const [label, setLabel] = useState('')
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/referrals', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => setCodes(d.codes))
      .catch(() => setCodes([]))
  }, [])

  const create = async () => {
    if (!label.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, code: custom || undefined }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error || 'Could not create the link'); return }
      setCodes(data.codes)
      setLabel('')
      setCustom('')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (code: string, active: boolean) => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, active }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) setCodes(data.codes)
    } finally {
      setBusy(false)
    }
  }

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied(c => (c === url ? null : c)), 1800)
    } catch { /* clipboard blocked — the link is on screen to select */ }
  }

  const suggestion = custom || codeFromLabel(label) || ''

  return (
    <div className="bg-white/5 rounded-xl p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <Link2 className="w-4 h-4" /> Referral links
        </h2>
        <p className="text-[10px] text-white/35 mt-0.5">
          One link per person or channel. Clicks are anonymous; a signup counts once per person, ever.
        </p>
      </div>

      {/* New link */}
      <div className="bg-white/[0.03] rounded-lg p-3 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Who is it for? e.g. TikTok bio"
            maxLength={80}
            className="flex-1 rounded-lg bg-white/[0.06] border border-white/[0.14] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/40"
          />
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="code (optional)"
            maxLength={24}
            className="sm:w-40 rounded-lg bg-white/[0.06] border border-white/[0.14] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/40"
          />
          <button
            onClick={create}
            disabled={busy || !label.trim()}
            className="rounded-lg bg-white text-black text-sm font-medium px-4 py-2 flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
          </button>
        </div>
        {/* The exact link that will exist, before it exists. */}
        {suggestion && (
          <p className="text-[11px] text-white/45">
            Will be <span className="text-white/75">voxu.app/i/{suggestion}</span>
          </p>
        )}
        {error && <p className="text-[11px] text-white/80">{error}</p>}
      </div>

      {/* Existing links */}
      {codes === null ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
      ) : codes.length === 0 ? (
        <p className="text-xs text-white/35">No links yet. The first one takes about five seconds.</p>
      ) : (
        <div className="space-y-2">
          {codes.map(c => (
            <div key={c.code} className={`rounded-lg p-3 bg-white/[0.03] ${c.active ? '' : 'opacity-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{c.label}</p>
                  <button
                    onClick={() => copy(c.url)}
                    className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/55 hover:text-white/85"
                    aria-label={`Copy ${c.url}`}
                  >
                    {copied === c.url ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span className="truncate">{c.url.replace('https://', '')}</span>
                  </button>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-lg font-bold leading-none tabular-nums">{c.clicks}</p>
                    <p className="text-[10px] text-white/45 uppercase tracking-wider">clicks</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none tabular-nums">{c.signups}</p>
                    <p className="text-[10px] text-white/45 uppercase tracking-wider">signups</p>
                  </div>
                  <div>
                    {/* No clicks, no rate — an empty ratio is not a zero. */}
                    <p className="text-lg font-bold leading-none tabular-nums">
                      {c.conversion === null ? '—' : `${c.conversion}%`}
                    </p>
                    <p className="text-[10px] text-white/45 uppercase tracking-wider">of clicks</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggle(c.code, !c.active)}
                disabled={busy}
                className="mt-2 text-[11px] text-white/45 hover:text-white/75 disabled:opacity-40"
              >
                {c.active ? 'Retire this link' : 'Bring it back'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
