'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { labelFromPromise, leastActive, showKeepCount, type PromiseOption } from '@/lib/era/keep'
import { PRACTICE_LIMITS } from '@/lib/practices/presets'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

interface PracticeRow {
  id: string
  label: string
  done: number
  of: number
}

/**
 * "What stays with you?" — the step between a finished era and a discipline
 * (docs/era-continuity-scope.md, Part 1).
 *
 * The person points at what they kept returning to, from their own promises;
 * nothing is inferred. The discipline is named after THAT behaviour, never
 * the era — the era is the container, the discipline is the thing.
 *
 * When their disciplines are already full, the trade-off is shown rather
 * than failing at the cap: the three they have, how often each was kept, and
 * which has been least active — but the choice stays theirs.
 */
export function KeepOneThingSheet({
  options,
  onChoose,
  onClose,
}: {
  options: PromiseOption[]
  /** The name for the new discipline ('' for "Something else"). */
  onChoose: (label: string) => void
  onClose: () => void
}) {
  useBodyScrollLock()
  const [practices, setPractices] = useState<PracticeRow[] | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/practices', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => {
        if (cancelled) return
        setPractices(d.practices ?? [])
        setRemaining(typeof d.remaining === 'number' ? d.remaining : null)
      })
      // Can't tell: let them go on, the add sheet reports the cap itself.
      .catch(() => { if (!cancelled) setRemaining(null) })
    return () => { cancelled = true }
  }, [])

  const choose = (label: string) => {
    haptic('light')
    if (remaining === 0) { setPicked(label); return }
    onChoose(label)
  }

  const remove = async (p: PracticeRow) => {
    if (confirmId !== p.id) { haptic('light'); setConfirmId(p.id); return }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retire', practiceId: p.id }),
      })
      if (!res.ok) { setError('Couldn’t remove that. Try again.'); return }
      haptic('medium')
      onChoose(picked ?? '')
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  const weakest = practices ? leastActive(practices) : null
  const full = picked !== null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="What stays with you?"
    >
      <button className="absolute inset-0 bg-black/90 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[85dvh] overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">
              {full ? 'Your disciplines are full' : 'Keep one thing'}
            </p>
            <h2 className="text-[26px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              {full ? 'Make room for it?' : 'What stays with you?'}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="tap-44 p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {!full && (
          <>
            <p className="text-sm text-white/60 leading-relaxed mt-2">
              An era ends. The useful part doesn&rsquo;t have to.
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 mt-5">What did you keep returning to?</p>
            <div className="mt-2 space-y-2">
              {options.map(o => (
                <button
                  key={o.text}
                  onClick={() => choose(labelFromPromise(o.text, PRACTICE_LIMITS.label))}
                  className="w-full text-left p-3.5 rounded-xl border border-white/15 hover:bg-white/[0.06] press-scale"
                >
                  <span className="block text-[15px] text-white leading-snug">{o.text}</span>
                  {showKeepCount(o.count) && (
                    <span className="block text-[11px] text-white/45 mt-0.5">Promised on {o.count} days</span>
                  )}
                </button>
              ))}
              <button
                onClick={() => choose('')}
                className="w-full text-left p-3.5 rounded-xl border border-white/15 hover:bg-white/[0.06] press-scale"
              >
                <span className="block text-[15px] text-white/80">Something else</span>
                <span className="block text-[11px] text-white/45 mt-0.5">Name it yourself</span>
              </button>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed mt-4">
              Not everything needs to come with you. The rest of the month stays in the era.
            </p>
          </>
        )}

        {full && practices && (
          <>
            <p className="text-sm text-white/60 leading-relaxed mt-2">
              You can hold three. To carry this forward, remove one — its record is kept.
            </p>
            {weakest && (
              <p className="text-[13px] text-white/75 leading-relaxed mt-3">
                {weakest.label} has been your least kept over the last four weeks.
              </p>
            )}
            <div className="mt-3 space-y-2">
              {practices.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-white/15">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-white truncate">{p.label}</p>
                    <p className="text-[11px] text-white/45 mt-0.5">
                      {p.of > 0 ? `Kept ${p.done} of ${p.of} days, last four weeks` : 'Nothing due yet'}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(p)}
                    disabled={busy}
                    className={`shrink-0 px-3 py-2 rounded-lg text-[12px] border disabled:opacity-40 ${
                      confirmId === p.id ? 'bg-white text-black border-white font-medium' : 'border-white/20 text-white/80'
                    }`}
                  >
                    {busy && confirmId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirmId === p.id ? 'Tap to remove' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
            {error && <p className="text-[12px] text-white/70 mt-3">{error}</p>}
            <button
              onClick={onClose}
              className="mt-4 w-full py-3 rounded-xl border border-white/15 text-sm text-white/85"
            >
              Keep my current disciplines
            </button>
          </>
        )}
      </div>
    </div>
  )
}
