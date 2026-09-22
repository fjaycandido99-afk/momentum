'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { MovementTechnique } from '@/lib/movements/library'
import {
  TECHNIQUE_LIMITS,
  calloutLines,
  pairLines,
  parseCalloutLines,
  parsePairLines,
} from '@/lib/movements/technique'

interface Row {
  id: string
  name: string
  pattern: string
  reviewedBy: string | null
}

/**
 * Writing reviewed technique, one movement at a time.
 *
 * Textareas and a line format rather than a drag-and-drop canvas: this is
 * an internal tool touched a handful of times per movement, and a canvas
 * would be a week of work to save somebody thirty seconds. Every rule is
 * checked on the server by the pure validator, so this form can be plain
 * and the guarantees still hold.
 */
export function TechniqueEditor({
  movements,
  existing,
}: {
  movements: Row[]
  existing: Record<string, MovementTechnique>
}) {
  const [movementId, setMovementId] = useState(movements[0]?.id ?? '')
  const current = existing[movementId]

  const [reviewedBy, setReviewedBy] = useState(current?.reviewedBy ?? '')
  const [reviewedOn, setReviewedOn] = useState(
    current?.reviewedOn ?? new Date().toISOString().slice(0, 10),
  )
  const [steps, setSteps] = useState((current?.steps ?? []).join('\n'))
  const [cues, setCues] = useState(pairLines(current?.cues))
  const [mistakes, setMistakes] = useState(pairLines(current?.mistakes))
  const [callouts, setCallouts] = useState(calloutLines(current?.callouts))

  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const done = useMemo(() => movements.filter(m => m.reviewedBy).length, [movements])

  /** Load whichever movement was picked, so switching doesn't lose work silently. */
  const pick = (id: string) => {
    setMovementId(id)
    const next = existing[id]
    setReviewedBy(next?.reviewedBy ?? reviewedBy)
    setReviewedOn(next?.reviewedOn ?? new Date().toISOString().slice(0, 10))
    setSteps((next?.steps ?? []).join('\n'))
    setCues(pairLines(next?.cues))
    setMistakes(pairLines(next?.mistakes))
    setCallouts(calloutLines(next?.callouts))
    setMessage(null)
    setError(null)
  }

  const save = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/movements/technique', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movementId,
          reviewedBy,
          reviewedOn,
          steps: steps.split('\n').map(s => s.trim()).filter(Boolean),
          cues: parsePairLines(cues),
          mistakes: parsePairLines(mistakes),
          callouts: parseCalloutLines(callouts),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? 'Could not save that.')
        return
      }
      setMessage('Saved. It is on the movement screen now.')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/movements/technique?id=${encodeURIComponent(movementId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        setError('Could not remove that.')
        return
      }
      setSteps('')
      setCues('')
      setMistakes('')
      setCallouts('')
      setMessage('Removed. That movement says Voxu doesn’t teach technique again.')
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/15 text-[14px] text-white'
  const label = 'block text-[11px] uppercase tracking-[0.18em] text-white/45 mt-5'

  return (
    <div className="mt-6">
      <label className={label} htmlFor="movement">
        Movement · {done} of {movements.length} reviewed
      </label>
      <select
        id="movement"
        value={movementId}
        onChange={e => pick(e.target.value)}
        className={`${field} mt-1.5`}
      >
        {movements.map(m => (
          <option key={m.id} value={m.id} className="bg-[#0b0b0b]">
            {m.reviewedBy ? '✓ ' : '· '}
            {m.name} — {m.pattern}
          </option>
        ))}
      </select>

      <label className={label} htmlFor="reviewed-by">
        Reviewed by — a person, shown on screen
      </label>
      <input
        id="reviewed-by"
        value={reviewedBy}
        onChange={e => setReviewedBy(e.target.value)}
        maxLength={TECHNIQUE_LIMITS.reviewedBy.maxLength}
        placeholder="Sam Okafor, CSCS"
        className={`${field} mt-1.5`}
      />

      <label className={label} htmlFor="reviewed-on">
        Reviewed on
      </label>
      <input
        id="reviewed-on"
        type="date"
        value={reviewedOn}
        onChange={e => setReviewedOn(e.target.value)}
        className={`${field} mt-1.5`}
      />

      <label className={label} htmlFor="steps">
        How to do it — one step per line, up to {TECHNIQUE_LIMITS.steps.max}
      </label>
      <textarea
        id="steps"
        value={steps}
        onChange={e => setSteps(e.target.value)}
        rows={6}
        className={`${field} mt-1.5 font-mono text-[13px]`}
      />

      <label className={label} htmlFor="cues">
        Key cues — {'label | detail'}, one per line
      </label>
      <textarea
        id="cues"
        value={cues}
        onChange={e => setCues(e.target.value)}
        rows={4}
        placeholder="Chest proud | Ribs down, eyes forward"
        className={`${field} mt-1.5 font-mono text-[13px]`}
      />

      <label className={label} htmlFor="mistakes">
        Common mistakes — {'label | detail'}, one per line
      </label>
      <textarea
        id="mistakes"
        value={mistakes}
        onChange={e => setMistakes(e.target.value)}
        rows={4}
        placeholder="Knees falling in | Let them track over your toes"
        className={`${field} mt-1.5 font-mono text-[13px]`}
      />

      <label className={label} htmlFor="callouts">
        Callouts on the picture — {'label | detail | x | y | left or right'}
      </label>
      <textarea
        id="callouts"
        value={callouts}
        onChange={e => setCallouts(e.target.value)}
        rows={4}
        placeholder="Chest proud | Ribs down | 30 | 25 | left"
        className={`${field} mt-1.5 font-mono text-[13px]`}
      />
      <p className="text-[11px] text-white/35 mt-1.5 leading-snug">
        x and y are percentages of the image — 0,0 is top left. These are the arrows on the hero, and
        they only appear once this movement has a reviewer.
      </p>

      {error && <p className="text-[13px] text-red-300 mt-4">{error}</p>}
      {message && <p className="text-[13px] text-white/70 mt-4">{message}</p>}

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2.5 rounded-xl bg-white text-black text-[14px] font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Publish to the app
        </button>
        {current && (
          <button onClick={remove} disabled={busy} className="text-[12px] text-white/45 hover:text-white/80">
            Withdraw
          </button>
        )}
      </div>
    </div>
  )
}
