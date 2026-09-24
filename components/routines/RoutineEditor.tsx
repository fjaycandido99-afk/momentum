'use client'

/**
 * Building the routine.
 *
 * Every step is a kind, a time, and — for a step of their own — words and a
 * floor. No durations the app measures, no ordering handle: the list is sorted
 * by time, because time IS the order. Dragging a 07:00 block below an 08:00
 * one would mean nothing.
 *
 * The draft lives here and saves once. PUT replaces the steps wholesale, so a
 * half-saved routine can never leave somebody being reminded at times they
 * had already changed.
 */

import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { ScrollLock } from '@/components/ui/ScrollLock'
import {
  MAX_ROUTINE_STEPS,
  ROUTINE_LIMITS,
  ROUTINE_STEP_KINDS,
  STEP_KINDS,
  sortSteps,
  validateSteps,
  type RoutineStepKind,
} from '@/lib/routines/steps'
import type { PracticeLite } from './RoutineSection'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export interface DraftStep {
  kind: RoutineStepKind
  ref: string | null
  label: string
  minimum: string
  time: string
}

export interface RoutineDraft {
  label: string
  days: number[]
  steps: DraftStep[]
}

/** A sensible first step rather than an empty row nobody knows how to fill. */
const FIRST_STEP: DraftStep = { kind: 'promise', ref: null, label: '', minimum: '', time: '07:30' }

export function RoutineEditor({
  initial,
  practices,
  onClose,
  onSaved,
}: {
  initial: RoutineDraft | null
  practices: PracticeLite[]
  onClose: () => void
  onSaved: () => void
}) {
  const [label, setLabel] = useState(initial?.label ?? 'My routine')
  const [days, setDays] = useState<number[]>(initial?.days ?? [])
  const [steps, setSteps] = useState<DraftStep[]>(initial?.steps?.length ? initial.steps : [FIRST_STEP])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setStep = (i: number, patch: Partial<DraftStep>) => {
    setSteps(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }

  const addStep = () => {
    haptic('light')
    setSteps(prev => {
      if (prev.length >= MAX_ROUTINE_STEPS) return prev
      // An hour after the last one, so a new row already has a plausible
      // time instead of landing on top of an existing step.
      const last = sortSteps(prev).at(-1)
      const hour = last ? Math.min(23, Number(last.time.slice(0, 2)) + 1) : 7
      return [...prev, { ...FIRST_STEP, kind: 'own', time: `${String(hour).padStart(2, '0')}:00` }]
    })
  }

  const removeStep = (i: number) => {
    haptic('light')
    setSteps(prev => prev.filter((_, idx) => idx !== i))
  }

  const toggleDay = (d: number) => {
    haptic('light')
    setDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()))
  }

  const save = async () => {
    setError(null)
    if (!label.trim()) return setError('Give the routine a name')

    // Checked here with the same function the server uses, so the message
    // arrives before a round trip.
    const problem = validateSteps(steps)
    if (problem === 'BAD_TIME') return setError('Every step needs a time')
    if (problem === 'MISSING_REF') return setError('Pick which discipline each discipline step is')
    if (problem === 'MISSING_LABEL') return setError('Name every step of your own')
    if (problem === 'TOO_MANY') return setError(`A routine holds ${MAX_ROUTINE_STEPS} steps`)

    setBusy(true)
    try {
      const res = await fetch('/api/routines', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), days, steps }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? 'Could not save that')
        return
      }
      haptic('medium')
      onSaved()
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Build your routine"
    >
      <ScrollLock />
      <button className="absolute inset-0 bg-black/90 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[85dvh] overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Your routine</p>
            <h2 className="text-[24px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              What does your day look like?
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <p className="text-sm text-white/60 leading-relaxed mt-2">
          Each step gets a time, and Voxu reminds you at it. It never asks whether you did them —
          your disciplines do that.
        </p>

        <div className="mt-4">
          <label htmlFor="routine-label" className="block text-[11px] uppercase tracking-[0.2em] text-white/45">
            Call it
          </label>
          <input
            id="routine-label"
            value={label}
            onChange={e => setLabel(e.target.value)}
            maxLength={ROUTINE_LIMITS.label}
            placeholder="My mornings"
            className="w-full mt-2 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-[15px] text-white placeholder:text-white/30"
          />
        </div>

        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Which days</p>
          <div className="flex gap-1.5 mt-2">
            {DAY_NAMES.map((name, d) => {
              const on = days.length === 0 || days.includes(d)
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  aria-pressed={on}
                  className={`flex-1 py-2.5 rounded-xl border text-[13px] ${
                    on ? 'bg-white text-black border-white font-medium' : 'border-white/15 text-white/60'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-white/35 mt-1.5">None picked means every day.</p>
        </div>

        <div className="mt-5 space-y-2.5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">The day</p>
          {steps.map((step, i) => (
            <div key={i} className="rounded-xl border border-white/[0.12] bg-white/[0.03] p-3">
              <div className="flex gap-2">
                <input
                  type="time"
                  value={step.time}
                  onChange={e => setStep(i, { time: e.target.value })}
                  aria-label={`Step ${i + 1} time`}
                  className="w-[104px] shrink-0 px-2.5 py-2 rounded-lg bg-white/[0.06] border border-white/15 text-[14px] text-white"
                />
                <select
                  value={step.kind}
                  onChange={e => setStep(i, { kind: e.target.value as RoutineStepKind, ref: null })}
                  aria-label={`Step ${i + 1} kind`}
                  className="min-w-0 flex-1 px-2.5 py-2 rounded-lg bg-white/[0.06] border border-white/15 text-[14px] text-white"
                >
                  {ROUTINE_STEP_KINDS.map(kind => (
                    <option key={kind} value={kind} className="bg-[#0b0b0b]">
                      {STEP_KINDS[kind].label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeStep(i)}
                  aria-label={`Remove step ${i + 1}`}
                  className="shrink-0 px-1.5 rounded-lg text-white/30 hover:text-white/70"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Which discipline. Only the active ones — pointing a step at
                  a paused discipline would remind them about something they
                  had deliberately stopped. */}
              {step.kind === 'practice' && (
                practices.length > 0 ? (
                  <select
                    value={step.ref ?? ''}
                    onChange={e => setStep(i, { ref: e.target.value || null })}
                    aria-label={`Step ${i + 1} discipline`}
                    className="w-full mt-2 px-2.5 py-2 rounded-lg bg-white/[0.06] border border-white/15 text-[14px] text-white"
                  >
                    <option value="" className="bg-[#0b0b0b]">Which one?</option>
                    {practices.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#0b0b0b]">{p.label}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-white/40 mt-2 leading-relaxed">
                    You have no disciplines yet. Add one below and it can go in here.
                  </p>
                )
              )}

              {/* Their own words, and their own floor. A step pointing at a
                  discipline takes the floor from the discipline, so it is
                  written in one place and cannot drift. */}
              {step.kind === 'own' && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={step.label}
                    onChange={e => setStep(i, { label: e.target.value })}
                    maxLength={ROUTINE_LIMITS.stepLabel}
                    placeholder="Phone out of the room"
                    aria-label={`Step ${i + 1} name`}
                    className="min-w-0 flex-1 px-2.5 py-2 rounded-lg bg-white/[0.06] border border-white/15 text-[14px] text-white placeholder:text-white/25"
                  />
                  <input
                    value={step.minimum}
                    onChange={e => setStep(i, { minimum: e.target.value })}
                    maxLength={ROUTINE_LIMITS.stepLabel}
                    placeholder="5 pages"
                    aria-label={`Step ${i + 1} minimum`}
                    className="w-24 shrink-0 px-2.5 py-2 rounded-lg bg-white/[0.06] border border-white/15 text-[14px] text-white placeholder:text-white/25 text-center"
                  />
                </div>
              )}
            </div>
          ))}

          {steps.length < MAX_ROUTINE_STEPS && (
            <button onClick={addStep} className="flex items-center gap-1 text-[12px] text-white/55 hover:text-white">
              <Plus className="w-3 h-3" /> Add a step
            </button>
          )}
        </div>

        {error && <p className="text-[12px] text-amber-300/90 mt-3">{error}</p>}

        <button
          onClick={save}
          disabled={busy}
          className="w-full mt-5 py-3 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-60 active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save the routine'}
        </button>
        <p className="text-[11px] text-white/35 text-center mt-2 leading-relaxed">
          Reminders arrive in the app. On the web the routine still shows — the notifications need
          the app.
        </p>
      </div>
    </div>
  )
}
