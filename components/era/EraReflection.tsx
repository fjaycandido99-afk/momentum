'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { REFLECTION_MAX } from '@/lib/era/record'
import { useAchievementOptional } from '@/contexts/AchievementContext'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * One line to remember an era by — theirs, kept on its Era Record in Proof.
 * Optional, never generated, and never pulled out of their promises: the
 * app choosing which of their sentences the month meant would be the app
 * deciding what it meant.
 */
export function EraReflection({ eraId, initial }: { eraId: string; initial: string | null }) {
  const [saved, setSaved] = useState<string | null>(initial)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initial ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const achievements = useAchievementOptional()

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/era/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eraId, text: draft }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error ?? 'Couldn’t save that'); return }
      haptic('light')
      setSaved(data?.reflection ?? null)
      if (data?.newAchievements?.length) achievements?.triggerAchievements(data.newAchievements)
      setEditing(false)
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  if (saved && !editing) {
    return (
      <div className="mt-4">
        <p className="text-px-11 uppercase tracking-[0.2em] text-white/45">What you&rsquo;ll remember</p>
        <p className="text-px-18 text-white leading-snug mt-1.5" style={SERIF}>&ldquo;{saved}&rdquo;</p>
        <button onClick={() => { setDraft(saved); setEditing(true) }} className="text-px-12 text-white/50 mt-1">
          Edit
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <label htmlFor="era-reflection" className="block text-px-11 uppercase tracking-[0.2em] text-white/45">
        One line to remember it by <span className="text-white/30">Optional</span>
      </label>
      <input
        id="era-reflection"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        maxLength={REFLECTION_MAX}
        placeholder="What did this month teach you?"
        className="w-full mt-2 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-px-15 text-white placeholder:text-white/30"
      />
      <p className="text-px-11 text-white/40 mt-1.5">Kept on this era&rsquo;s record in Proof.</p>
      {error && <p className="text-px-12 text-white/70 mt-1.5" role="alert">{error}</p>}
      {(draft.trim() || saved) && (
        <button
          onClick={save}
          disabled={busy}
          className="mt-2 px-4 py-2 rounded-xl border border-white/20 text-px-13 text-white/85 disabled:opacity-40 inline-flex items-center gap-2"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save
        </button>
      )}
    </div>
  )
}
