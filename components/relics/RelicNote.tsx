'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { NOTE_MAX } from '@/lib/relic-notes'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * Their one line on a coin they hold (lib/relic-notes). Closed by default —
 * a quiet "Add a memory" — so the popup stays about the coin. Private: it
 * is never shown to anyone else or put on a share card.
 */
export function RelicNote({
  id,
  initial,
  onSaved,
}: {
  id: string
  initial: string | null
  onSaved?: (note: string | null) => void
}) {
  const [saved, setSaved] = useState<string | null>(initial)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initial ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/relics/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, text: draft }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error ?? 'Couldn’t save that'); return }
      haptic('light')
      const note = data?.note ?? null
      setSaved(note)
      onSaved?.(note)
      setEditing(false)
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return saved ? (
      <div className="mb-5">
        <p className="text-px-10 uppercase tracking-[0.24em] text-white/55">Your memory</p>
        <p className="text-px-18 text-white leading-snug mt-1.5" style={SERIF}>&ldquo;{saved}&rdquo;</p>
        <button onClick={() => { setDraft(saved); setEditing(true) }} className="tap-44 text-px-12 text-white/60 mt-1">
          Edit
        </button>
      </div>
    ) : (
      <button onClick={() => setEditing(true)} className="tap-44 mb-5 text-px-13 text-white/75 underline underline-offset-4">
        Add a memory to this relic
      </button>
    )
  }

  return (
    <div className="mb-5 text-left">
      <label htmlFor={`relic-note-${id}`} className="block text-px-10 uppercase tracking-[0.24em] text-white/60">
        One line to remember it by
      </label>
      <input
        id={`relic-note-${id}`}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !busy) save() }}
        maxLength={NOTE_MAX}
        autoFocus
        placeholder="What was happening when you earned it?"
        className="w-full mt-2 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-px-15 text-white placeholder:text-white/35"
      />
      <p className="text-px-11 text-white/50 mt-1.5">Only you see this.</p>
      {error && <p className="text-px-12 text-white/75 mt-1.5" role="alert">{error}</p>}
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={save}
          disabled={busy || (!draft.trim() && !saved)}
          className="tap-44 px-4 py-2 rounded-xl bg-white text-black text-px-13 font-medium disabled:opacity-40 inline-flex items-center gap-2"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saved && !draft.trim() ? 'Remove' : 'Save'}
        </button>
        <button onClick={() => { setDraft(saved ?? ''); setEditing(false); setError(null) }} className="tap-44 px-4 py-2 rounded-xl border border-white/20 text-px-13 text-white/80">
          Cancel
        </button>
      </div>
    </div>
  )
}
