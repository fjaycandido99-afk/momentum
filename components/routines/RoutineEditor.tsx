'use client'

/**
 * Building the routine.
 *
 * Every step is a kind, and — for a step of their own — words and a floor. No
 * durations the app measures: a step takes as long as it takes.
 *
 * The mode decides what the order IS, and so what this screen shows. By the
 * clock, each step carries a time and the clock is the order, so there is
 * nothing to reorder — moving a 07:00 step below an 08:00 one would mean
 * nothing and the list would snap back. In order, the times are gone and the
 * sequence is theirs, so each row gets a pair of arrows.
 *
 * The draft lives here and saves once. PUT replaces the steps wholesale, so a
 * half-saved routine can never leave somebody being reminded at times they
 * had already changed.
 */

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Loader2, Plus, X } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { ScrollLock } from '@/components/ui/ScrollLock'
import {
  MAX_ROUTINE_STEPS,
  ROUTINE_LIMITS,
  ROUTINE_STEP_KINDS,
  STEP_KINDS,
  STEP_WEIGHTS,
  STEP_WEIGHT_META,
  moveStep,
  parseTime,
  sortSteps,
  validateSteps,
  type RoutineMode,
  type RoutineStepKind,
  type StepWeight,
} from '@/lib/routines/steps'
import type { PickerBook, StepOption } from '@/lib/routines/picker'
import { StepPicker } from './StepPicker'
import type { PracticeLite } from './RoutineSection'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export interface DraftStep {
  kind: RoutineStepKind
  ref: string | null
  label: string
  minimum: string
  /** Null in sequence mode, where a step has no clock time. */
  time: string | null
  /** Does it survive a bad day? */
  inMinimum: boolean
  /** How much it asks for. */
  weight: StepWeight
}

export interface RoutineDraft {
  label: string
  mode: RoutineMode
  startTime: string | null
  days: number[]
  steps: DraftStep[]
}

/** A sensible first step rather than an empty row nobody knows how to fill. */
const FIRST_STEP: DraftStep = {
  kind: 'promise', ref: null, label: '', minimum: '', time: '07:30', inMinimum: false,
  weight: 'required',
}

const MODES: { id: RoutineMode; label: string; line: string }[] = [
  { id: 'timed', label: 'By the clock', line: 'Each step has a time, and a reminder at it.' },
  { id: 'sequence', label: 'In order', line: 'You tap Start and Voxu walks you through it.' },
]

export function RoutineEditor({
  initial,
  practices,
  book = null,
  notice = null,
  canDelete = false,
  onClose,
  onSaved,
}: {
  initial: RoutineDraft | null
  practices: PracticeLite[]
  /** The book they are on, for the step picker. */
  book?: PickerBook | null
  /**
   * One line about where this draft came from, when it did not come from
   * them — "4 steps from what you said… Change anything." Somebody who
   * described their day out loud should be told what was made of it, in
   * counts, before they are asked to approve it.
   */
  notice?: string | null
  /** There is a saved routine to delete — false for a seeded template. */
  canDelete?: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [label, setLabel] = useState(initial?.label ?? 'My routine')
  const [mode, setMode] = useState<RoutineMode>(initial?.mode ?? 'timed')
  const [startTime, setStartTime] = useState<string>(initial?.startTime ?? '07:00')
  const [days, setDays] = useState<number[]>(initial?.days ?? [])
  const [steps, setSteps] = useState<DraftStep[]>(initial?.steps?.length ? initial.steps : [FIRST_STEP])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  /** The step picker is open. */
  const [picking, setPicking] = useState(false)

  const setStep = (i: number, patch: Partial<DraftStep>) => {
    setSteps(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }

  /**
   * A step, from what they picked.
   *
   * The time is the only thing invented here: an hour after the last one, so
   * a new row lands somewhere plausible rather than on top of an existing
   * step. In sequence mode there is no time to invent.
   */
  const addPicked = (option: StepOption) => {
    setPicking(false)
    setSteps(prev => {
      if (prev.length >= MAX_ROUTINE_STEPS) return prev
      const step: DraftStep = {
        ...FIRST_STEP,
        kind: option.kind,
        ref: option.ref,
        label: option.text,
        time: null,
      }
      if (mode === 'sequence') return [...prev, step]
      const last = sortSteps(prev, 'timed').at(-1)
      const hour = last?.time ? Math.min(23, Number(last.time.slice(0, 2)) + 1) : 7
      return [...prev, { ...step, time: `${String(hour).padStart(2, '0')}:00` }]
    })
  }

  /**
   * Changing mode, without losing the day they already built.
   *
   * To sequence: the clock becomes the order — sorted by time first, then the
   * times dropped, so the list they were looking at is the list they get.
   * Back to timed: every step needs a time again, and inventing none would
   * leave a routine that cannot be saved. So they are spread half-hourly from
   * the start time, in the order they were in, as a starting point to edit.
   */
  const switchMode = (next: RoutineMode) => {
    haptic('light')
    if (next === mode) return
    setSteps(prev => {
      const ordered = sortSteps(prev, mode)
      if (next === 'sequence') return ordered.map(s => ({ ...s, time: null }))
      const from = parseTime(startTime)
      const base = from ? from.hour * 60 + from.minute : 7 * 60
      return ordered.map((s, i) => {
        const minutes = Math.min(23 * 60 + 59, base + i * 30)
        const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
        const mm = String(minutes % 60).padStart(2, '0')
        return { ...s, time: `${hh}:${mm}` }
      })
    })
    setMode(next)
  }

  /**
   * Only a SAVED routine can be deleted. Offering it on a seeded template
   * would mean a button that deletes nothing, or worse, deletes a routine
   * they were in the middle of replacing.
   */
  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/routines', { method: 'DELETE' })
      if (!res.ok) {
        setError('Could not remove that')
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

  const move = (from: number, to: number) => {
    haptic('light')
    setSteps(prev => moveStep(prev, from, to))
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
    const problem = validateSteps(steps, mode)
    if (problem === 'BAD_TIME') return setError('Every step needs a time')
    if (problem === 'MISSING_REF') return setError('Pick which discipline each discipline step is')
    if (problem === 'MISSING_LABEL') return setError('Name every step of your own')
    if (problem === 'TOO_MANY') return setError(`A routine holds ${MAX_ROUTINE_STEPS} steps`)

    setBusy(true)
    try {
      const res = await fetch('/api/routines', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), mode, startTime: mode === 'sequence' ? startTime : null, days, steps }),
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
          {mode === 'timed'
            ? 'Each step gets a time, and Voxu reminds you at it.'
            : 'The steps happen in order, and Voxu walks you through them when you start.'}{' '}
          It never asks whether you did them — your disciplines do that.
        </p>

        {/* Where this draft came from, when it did not come from them. */}
        {notice && (
          <p className="text-[12px] text-white/55 leading-relaxed mt-3 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1]">
            {notice}
          </p>
        )}

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

        {/*
          The mode, and it is the most consequential choice on this screen.
          By the clock: each step has a time and its own reminder, and the
          clock is the order. In order: they tap Start and are walked
          through it, so the order is theirs and the times are gone.
        */}
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">How it runs</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => switchMode(m.id)}
                aria-pressed={mode === m.id}
                className={`rounded-xl border p-3 text-left ${
                  mode === m.id ? 'bg-white/[0.08] border-white/40' : 'border-white/15 hover:bg-white/[0.04]'
                }`}
              >
                <span className="block text-[14px] text-white">{m.label}</span>
                <span className="block text-[11px] text-white/50 mt-1 leading-snug">{m.line}</span>
              </button>
            ))}
          </div>
        </div>

        {/* One nudge to begin, for a sequence routine. Optional: some people
            start their morning without being told to. */}
        {mode === 'sequence' && (
          <div className="mt-4">
            <label htmlFor="routine-start" className="block text-[11px] uppercase tracking-[0.2em] text-white/45">
              Nudge me to start at
            </label>
            <input
              id="routine-start"
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-[124px] mt-2 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-[15px] text-white"
            />
          </div>
        )}

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
                {/* Only by the clock. In sequence mode a step happens when
                    the one before it is done, so the position takes this
                    column and asking for a time would make people invent
                    ones for a routine that has none. */}
                {mode === 'timed' ? (
                  <input
                    type="time"
                    value={step.time ?? ''}
                    onChange={e => setStep(i, { time: e.target.value })}
                    aria-label={`Step ${i + 1} time`}
                    className="w-[104px] shrink-0 px-2.5 py-2 rounded-lg bg-white/[0.06] border border-white/15 text-[14px] text-white"
                  />
                ) : (
                  /*
                    In sequence mode the order is theirs, so it has to be
                    changeable. Buttons rather than drag: a touch drag needs
                    pointer handling that only a phone can prove, and a
                    reorder that half-works is worse than one that is two
                    taps. These also work with a keyboard and a screen
                    reader, which a drag handle does not.
                  */
                  <span className="w-[34px] shrink-0 flex flex-col items-center">
                    <button
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                      aria-label={`Move step ${i + 1} earlier`}
                      className="p-0.5 text-white/40 disabled:opacity-20 hover:text-white/80"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] tabular-nums text-white/35 leading-none">{i + 1}</span>
                    <button
                      onClick={() => move(i, i + 1)}
                      disabled={i === steps.length - 1}
                      aria-label={`Move step ${i + 1} later`}
                      className="p-0.5 text-white/40 disabled:opacity-20 hover:text-white/80"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
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

              {/*
                How much the step asks for, and every value does something:
                Required reminds you, Optional deliberately does not, and Bad
                days only takes the step OUT of a normal day and puts it in
                the minimum one. A priority that only changed a label would
                be asking somebody to sort their own day into tiers for
                nothing.
              */}
              <div className="flex gap-1 mt-2">
                {STEP_WEIGHTS.map(w => (
                  <button
                    key={w}
                    onClick={() => { haptic('light'); setStep(i, { weight: w }) }}
                    aria-pressed={step.weight === w}
                    title={STEP_WEIGHT_META[w].line}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] border ${
                      step.weight === w
                        ? 'bg-white/[0.1] border-white/35 text-white'
                        : 'border-white/[0.1] text-white/45'
                    }`}
                  >
                    {STEP_WEIGHT_META[w].label}
                  </button>
                ))}
              </div>
              <p className="text-[10.5px] text-white/30 mt-1 leading-relaxed">
                {STEP_WEIGHT_META[step.weight].line}
              </p>
            </div>
          ))}

          {steps.length < MAX_ROUTINE_STEPS && (
            <button
              onClick={() => { haptic('light'); setPicking(true) }}
              className="flex items-center gap-1 text-[12px] text-white/55 hover:text-white"
            >
              <Plus className="w-3 h-3" /> Add a step
            </button>
          )}
        </div>

        {/*
          "What happens on a bad day?" — Francis's framing, and better than
          anything I wrote. This is where the routine stops being a schedule
          and becomes the thing the app is actually for: never break the
          identity, shrink the routine.

          Nothing is ticked by default. A minimum day that asked for
          everything would be no minimum at all, so the subset is theirs to
          choose — and until they choose one, the Minimum Day button is not
          offered rather than running an empty day.
        */}
        {steps.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">When life gets messy</p>
            <p className="text-[12px] text-white/50 mt-1 leading-relaxed">
              Which of these survive a bad day? Voxu can run just those, at whatever the smallest
              version is.
            </p>
            <div className="mt-2.5 space-y-1.5">
              {steps.map((step, i) => {
                const name = step.label.trim() || STEP_KINDS[step.kind].label
                // A bad-days-only step IS the bad day. Asking somebody to
                // tick it as well would be the app not understanding its own
                // field, so it is shown as already in and cannot be turned
                // off from here.
                if (step.weight === 'minimum_only') {
                  return (
                    <div
                      key={i}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/[0.1] bg-white/[0.05]"
                    >
                      <span aria-hidden className="h-4 w-4 shrink-0 rounded grid place-items-center bg-white/70">
                        <Check className="w-3 h-3 text-black" />
                      </span>
                      <span className="min-w-0 flex-1 text-[13px] text-white/80 truncate">{name}</span>
                      <span className="shrink-0 text-[11px] text-white/40">this is the bad day</span>
                    </div>
                  )
                }
                return (
                  <button
                    key={i}
                    onClick={() => { haptic('light'); setStep(i, { inMinimum: !step.inMinimum }) }}
                    role="switch"
                    aria-checked={step.inMinimum}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/[0.1] bg-white/[0.03] text-left active:scale-[0.99]"
                  >
                    <span
                      aria-hidden
                      className={`h-4 w-4 shrink-0 rounded grid place-items-center border ${
                        step.inMinimum ? 'bg-white border-white' : 'border-white/25'
                      }`}
                    >
                      {step.inMinimum && <Check className="w-3 h-3 text-black" />}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] text-white/80 truncate">{name}</span>
                    {step.minimum.trim() && (
                      <span className="shrink-0 text-[11px] text-white/40">{step.minimum.trim()}</span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-white/30 mt-2 leading-relaxed">
              {steps.some(s => s.inMinimum || s.weight === 'minimum_only')
                ? 'A minimum day still counts as keeping the routine.'
                : 'Pick none and there is no minimum day to offer.'}
            </p>
          </div>
        )}

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

        {/*
          Deleting it, which somebody has to be able to do.

          Two taps rather than a browser confirm: a native alert blocks the
          web view and looks like the app broke. The second tap says what it
          will do, and Pause is offered in the same breath because wanting
          the 06:30 reminder to stop for a fortnight is not the same as
          wanting the day gone.
        */}
        {canDelete && (
          <div className="mt-4 pt-4 border-t border-white/[0.07] text-center">
            {confirmDelete ? (
              <>
                <p className="text-[12px] text-white/60 leading-relaxed">
                  Delete the routine and its steps? Pausing keeps the day and stops the reminders.
                </p>
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/15 text-[13px] text-white/70"
                  >
                    Keep it
                  </button>
                  <button
                    onClick={remove}
                    disabled={busy}
                    className="flex-1 py-2.5 rounded-xl border border-amber-300/30 text-[13px] text-amber-300/90 disabled:opacity-60"
                  >
                    Delete it
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => { haptic('light'); setConfirmDelete(true) }}
                className="text-[11px] text-white/35 hover:text-white/70"
              >
                Delete this routine
              </button>
            )}
          </div>
        )}
      </div>

      {picking && (
        <StepPicker
          practices={practices}
          book={book}
          onPick={addPicked}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}
