'use client'

import { useEffect, useState } from 'react'
import { Check, HeartPulse, Loader2, Trash2 } from 'lucide-react'
import {
  CONTEXT_TAGS,
  MAX_TAGS,
  SCALES,
  WELLNESS_NOTE,
  WELLNESS_PROMISES,
  type ScaleId,
} from '@/lib/wellness/scales'

/**
 * The daily check-in, and the consent that has to come first.
 *
 * Off until the person turns it on, and the card that turns it on says what
 * is collected, what it's for, and how to get rid of it — before they agree,
 * not in a policy page they'll never open. Everything is one tap, every
 * field is skippable, and it saves as they go so a half-answered day still
 * counts.
 */

interface Row {
  local_day: string
  mood: number | null
  energy: number | null
  stress: number | null
  rested: number | null
  tags: string[]
}

interface State {
  consent: { enabled: boolean; at: string | null }
  today: Row | null
  recent: Row[]
}

export function WellnessCheckIn() {
  const [state, setState] = useState<State | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/wellness', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: State) => { if (!cancelled) setState(d) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [])

  const setConsent = async (enabled: boolean) => {
    setBusy(true)
    try {
      const res = await fetch('/api/wellness', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) return
      const fresh = await fetch('/api/wellness', { cache: 'no-store' })
      if (fresh.ok) setState(await fresh.json())
    } finally {
      setBusy(false)
    }
  }

  const save = async (patch: Partial<Row>) => {
    if (!state) return
    const next: Row = {
      local_day: state.today?.local_day ?? '',
      mood: state.today?.mood ?? null,
      energy: state.today?.energy ?? null,
      stress: state.today?.stress ?? null,
      rested: state.today?.rested ?? null,
      tags: state.today?.tags ?? [],
      ...patch,
    }
    // Optimistic: the taps should feel instant, and a failed save just
    // leaves today unsaved rather than losing anything already stored.
    setState({ ...state, today: next })
    setBusy(true)
    try {
      const res = await fetch('/api/wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (res.ok) {
        const data = await res.json()
        setState(s => (s ? { ...s, today: data.today } : s))
      }
    } catch {
      /* leave the optimistic value; the next tap retries */
    } finally {
      setBusy(false)
    }
  }

  const eraseAll = async () => {
    setBusy(true)
    try {
      await fetch('/api/wellness', { method: 'DELETE' })
      setState(s => (s ? { ...s, today: null, recent: [] } : s))
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  if (failed) return null

  return (
    <div className="bg-white/5 rounded-2xl p-4">
      <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
        <HeartPulse className="w-4 h-4" /> Today&rsquo;s check-in
      </h2>

      {!state ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
      ) : !state.consent.enabled ? (
        // Consent first, in plain words, before a single row is written.
        <div className="mt-2">
          <p className="text-sm text-white/75 leading-relaxed">
            Four taps a day — how you feel, energy, stress, how rested — and Voxu can show you what actually moves
            your follow-through.
          </p>
          <ul className="mt-3 space-y-1.5">
            {WELLNESS_PROMISES.map(p => (
              <li key={p} className="flex gap-2 text-xs text-white/65 leading-relaxed">
                <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/40" /> {p}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-white/40 mt-3 leading-relaxed">{WELLNESS_NOTE}</p>
          <button
            onClick={() => setConsent(true)}
            disabled={busy}
            className="mt-3 w-full py-3 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-40 active:scale-[0.98] transition-all"
          >
            Turn on check-ins
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {SCALES.map(scale => {
            const value = state.today?.[scale.id] ?? null
            return (
              <div key={scale.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs text-white/70">{scale.question}</p>
                  <p className="text-[11px] text-white/45">
                    {value ? scale.labels[value - 1] : 'Skip if you like'}
                  </p>
                </div>
                <div className="flex gap-1.5 mt-1.5" role="group" aria-label={scale.question}>
                  {scale.labels.map((label, i) => {
                    const score = i + 1
                    const on = value === score
                    return (
                      <button
                        key={score}
                        aria-label={label}
                        aria-pressed={on}
                        disabled={busy}
                        onClick={() => save({ [scale.id]: on ? null : score } as Partial<Row>)}
                        className={`flex-1 py-2 rounded-lg text-[11px] border transition-all active:scale-[0.97] disabled:opacity-50 ${
                          on ? 'bg-white text-black border-white' : 'bg-white/[0.04] text-white/55 border-white/[0.12]'
                        }`}
                      >
                        {score}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div>
            <p className="text-xs text-white/70">What&rsquo;s going on? <span className="text-white/40">Up to {MAX_TAGS}</span></p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CONTEXT_TAGS.map(tag => {
                const tags = state.today?.tags ?? []
                const on = tags.includes(tag.key)
                return (
                  <button
                    key={tag.key}
                    aria-pressed={on}
                    disabled={busy || (!on && tags.length >= MAX_TAGS)}
                    onClick={() => save({ tags: on ? tags.filter(t => t !== tag.key) : [...tags, tag.key] })}
                    className={`rounded-full px-3 py-1.5 text-xs border transition-all active:scale-[0.97] disabled:opacity-30 ${
                      on ? 'bg-white text-black border-white' : 'bg-white/[0.04] text-white/75 border-white/[0.14]'
                    }`}
                  >
                    {tag.label}
                  </button>
                )
              })}
            </div>
          </div>

          <p className="text-[11px] text-white/40 leading-relaxed">{WELLNESS_NOTE}</p>

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
            <button onClick={() => setConsent(false)} disabled={busy} className="text-[11px] text-white/50 disabled:opacity-40">
              Turn off check-ins
            </button>
            {confirmDelete ? (
              <span className="flex items-center gap-2">
                <button onClick={eraseAll} disabled={busy} className="text-[11px] text-white disabled:opacity-40">
                  Delete them all
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-white/50">Cancel</button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={busy || state.recent.length === 0}
                className="text-[11px] text-white/50 flex items-center gap-1 disabled:opacity-30"
              >
                <Trash2 className="w-3 h-3" /> Delete my check-ins
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
