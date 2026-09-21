'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Minus, Plus, Repeat2 } from 'lucide-react'
import { AddPracticeSheet } from './AddPracticeSheet'
import { daysLabel, minimumLine, type PracticesPayload, type PracticeWire } from '@/lib/practices/logic'
import { haptic } from '@/lib/haptics'
import { trackFeature } from '@/lib/analytics/track'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * Practices: the disciplines someone already keeps, and whether they kept
 * them today.
 *
 * Three answers per practice, and the middle one is the reason this exists:
 * Done, Just the minimum, and Not today. "Just the minimum" is a KEPT day —
 * doing the floor when you didn't want to is the behaviour the whole feature
 * is trying to produce, so it is never drawn as a half-failure.
 *
 * `canAdd` is false on home: nothing on the home screen should be a form.
 * Adding happens on /era, where someone has gone looking.
 */
export function PracticesSection({ canAdd = false }: { canAdd?: boolean }) {
  const [data, setData] = useState<PracticesPayload | null>(null)
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/practices')
      .then(r => (r.ok ? r.json() : null))
      .then(payload => { if (payload) setData(payload) })
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const log = async (practice: PracticeWire, done: boolean, minimumOnly = false) => {
    haptic(done ? 'medium' : 'light')
    setBusyId(practice.id)
    // Optimistic: the tap is the answer, and a slow network must not make
    // someone wonder whether it landed.
    setData(prev => prev && {
      ...prev,
      practices: prev.practices.map(p =>
        p.id === practice.id
          ? { ...p, state: done ? (minimumOnly ? 'minimum' : 'done') : 'missed' }
          : p,
      ),
    })
    try {
      await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log', practiceId: practice.id, done, minimumOnly }),
      })
      load()
    } catch {
      load()
    } finally {
      setBusyId(null)
    }
  }

  /** Retiring stops it being asked for. The logs stay — see server.ts. */
  const retire = async (practice: PracticeWire) => {
    haptic('light')
    setBusyId(practice.id)
    try {
      await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retire', practiceId: practice.id }),
      })
      load()
    } catch {
      load()
    } finally {
      setBusyId(null)
    }
  }

  if (!data) return null

  const practices = data.practices
  if (practices.length === 0 && !canAdd) return null

  return (
    <>
      <div className="card-surface-lg p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/50">
            <Repeat2 className="w-3.5 h-3.5" /> Your practices
          </div>
          {canAdd && data.remaining > 0 && (
            <button
              onClick={() => { trackFeature('era', 'open', 'practice_add'); setAdding(true) }}
              className="flex items-center gap-1 text-[11px] text-white/70 rounded-full border border-white/[0.14] px-2 py-1 press-scale"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>

        {practices.length === 0 ? (
          <>
            <p className="text-[17px] text-white leading-snug mt-2" style={{ ...SERIF, fontWeight: 500 }}>
              What do you already care about?
            </p>
            <p className="text-[13px] text-white/60 mt-1.5 leading-snug">
              A gym split, ten pages a day, two hours of deep work. Voxu won&rsquo;t replace those apps —
              it keeps you consistent with them. Up to {data.max}.
            </p>
          </>
        ) : (
          <div className="mt-3 space-y-3">
            {practices.map(p => (
              <PracticeRow
                key={p.id}
                practice={p}
                busy={busyId === p.id}
                onLog={(done, minimumOnly) => log(p, done, minimumOnly)}
                onRetire={canAdd ? () => retire(p) : undefined}
              />
            ))}
            {canAdd && data.remaining === 0 && (
              <p className="text-[11px] text-white/35">
                Three at a time. Retire one to swap it — its record is kept.
              </p>
            )}
          </div>
        )}
      </div>

      {adding && <AddPracticeSheet onClose={() => setAdding(false)} onAdded={load} />}
    </>
  )
}

function PracticeRow({
  practice,
  busy,
  onLog,
  onRetire,
}: {
  practice: PracticeWire
  busy: boolean
  onLog: (done: boolean, minimumOnly?: boolean) => void
  /** Only where practices are managed (/era), never on home. */
  onRetire?: () => void
}) {
  const [confirmRetire, setConfirmRetire] = useState(false)
  // "Change" reopens the three choices rather than flipping the answer:
  // a tap that silently turns a kept day into a missed one is a trap.
  const [editing, setEditing] = useState(false)
  const answered = !editing
    && (practice.state === 'done' || practice.state === 'minimum' || practice.state === 'missed')
  const choosing = editing || practice.state === 'due'

  const choose = (done: boolean, minimumOnly?: boolean) => {
    setEditing(false)
    onLog(done, minimumOnly)
  }

  return (
    <div className="rounded-xl border border-white/[0.12] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] text-white leading-snug truncate">{practice.label}</p>
          <p className="text-[11px] text-white/45 mt-0.5">
            {daysLabel(practice.days)} · minimum {practice.minimum}
          </p>
        </div>
        {/* Counts with their denominator in view — never a bare percentage. */}
        {practice.of > 0 && (
          <p className="text-[11px] text-white/45 tabular-nums shrink-0">
            {practice.done} of {practice.of}
          </p>
        )}
      </div>

      {practice.state === 'rest' && !answered && (
        <p className="text-[12px] text-white/40 mt-2">Not today. Rest is part of the schedule.</p>
      )}

      {choosing && (
        <>
          <p className="text-[13px] text-white/70 mt-2 leading-snug">{minimumLine(practice)}</p>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => choose(true)}
              disabled={busy}
              className="flex-1 py-2 rounded-lg bg-white text-black text-[13px] font-medium disabled:opacity-40"
            >
              Done
            </button>
            <button
              onClick={() => choose(true, true)}
              disabled={busy}
              className="flex-1 py-2 rounded-lg border border-white/20 text-[13px] text-white disabled:opacity-40"
            >
              Just the minimum
            </button>
            <button
              onClick={() => choose(false)}
              disabled={busy}
              aria-label="Not today"
              className="px-3 py-2 rounded-lg border border-white/15 text-white/60 disabled:opacity-40"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {answered && (
        <div className="flex items-center justify-between gap-2 mt-2">
          <p className="text-[13px] text-white/70 flex items-center gap-1.5">
            {practice.state === 'missed' ? (
              <>Not today. {practice.run > 0 ? `Your run of ${practice.run} stands until tomorrow.` : 'Tomorrow is a due day.'}</>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                {practice.state === 'minimum' ? 'Minimum done — that still counts.' : 'Done.'}
                {practice.run > 1 && ` ${practice.run} in a row.`}
              </>
            )}
          </p>
          <button
            onClick={() => setEditing(true)}
            disabled={busy}
            className="text-[11px] text-white/40 hover:text-white/70 shrink-0"
          >
            Change
          </button>
        </div>
      )}

      {onRetire && (
        confirmRetire ? (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
            <p className="text-[12px] text-white/70 flex-1">
              Stop asking for this? Everything it recorded is kept.
            </p>
            <button
              onClick={() => { setConfirmRetire(false); onRetire() }}
              disabled={busy}
              className="text-[12px] text-white rounded-lg border border-white/20 px-2.5 py-1 disabled:opacity-40"
            >
              Retire
            </button>
            <button
              onClick={() => setConfirmRetire(false)}
              className="text-[12px] text-white/50 px-1"
            >
              Keep
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRetire(true)}
            className="text-[11px] text-white/30 hover:text-white/60 mt-2.5"
          >
            Retire this practice
          </button>
        )
      )}
    </div>
  )
}
