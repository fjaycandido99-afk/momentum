'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { trackFeature } from '@/lib/analytics/track'

/**
 * "Did a friend invite you?" — a quiet link that opens a paste box. The App
 * Store loses an invite link between the tap and the install; this is how
 * the friend (or creator) still gets the credit. Never in the way: closed
 * until tapped, and nothing happens if it's ignored.
 */
export function InviteAsk({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const paste = async () => {
    try { const t = await navigator.clipboard.readText(); if (t) setLink(t.trim()) } catch { /* they can type it */ }
  }

  const send = async () => {
    if (!link.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/referral/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: link.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error ?? 'Couldn’t add that.'); return }
      trackFeature('invite', 'use', data?.kind ?? undefined)
      setDone(data?.kind === 'era' ? 'Thanks — your friend will know you joined.' : 'Thanks — added.')
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return <p className={`text-px-12 text-white/70 inline-flex items-center gap-1.5 ${className}`}><Check className="w-3.5 h-3.5" /> {done}</p>
  }
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={`tap-44 text-px-12 text-white/60 underline underline-offset-4 ${className}`}>
        Did a friend invite you?
      </button>
    )
  }
  return (
    <div className={`w-full max-w-xs mx-auto text-left ${className}`}>
      <label htmlFor="invite-link" className="block text-px-12 text-white/70">Paste their link, or a code</label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="invite-link"
          value={link}
          onChange={e => setLink(e.target.value)}
          onFocus={() => { if (!link) void paste() }}
          placeholder="voxu.app/join/…"
          autoCapitalize="none"
          autoCorrect="off"
          className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-white/[0.08] border border-white/[0.15] text-px-13 text-white placeholder:text-white/35"
        />
        <button onClick={send} disabled={busy || !link.trim()} className="tap-44 px-3.5 rounded-xl bg-white text-black text-px-13 font-medium disabled:opacity-50 inline-flex items-center">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
        </button>
      </div>
      {error && <p className="text-px-12 text-white/70 mt-1.5" role="status">{error}</p>}
    </div>
  )
}
