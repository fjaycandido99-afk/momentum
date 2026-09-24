'use client'

/**
 * Voxu walking you through your routine, one step at a time.
 *
 * "1 of 5 · Mindset Reset · Start" — Francis's spec, and the thing that makes
 * this a guided system rather than a calendar. The shape is borrowed from
 * ExercisePlayer, which already does intro → steps → done, rather than
 * inventing a second way to walk somebody through a list.
 *
 * It never asks whether you DID a step. A step pointing at a discipline is
 * answered on that discipline; this records only that the routine was run,
 * which is why both can exist without keeping two records of the same thing.
 *
 * "Next" is not a claim about having done it — it is where you are. The count
 * at the end says how far you got, with its denominator, and nothing else.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, SkipForward, X } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { STEP_KINDS, timeLabel, type RoutineStepKind, type StepWeight } from '@/lib/routines/steps'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

export interface RunStep {
  id: string
  kind: RoutineStepKind
  ref: string | null
  label: string | null
  minimum: string | null
  time: string | null
  /** How much it asks for — an optional step says so while it is on screen. */
  weight?: StepWeight
  /** Resolved for a discipline step by the caller, which has the practices. */
  practiceLabel?: string | null
  practiceMinimum?: string | null
}

export function RoutineRunner({
  routineLabel,
  steps,
  minimum,
  onClose,
}: {
  routineLabel: string
  steps: RunStep[]
  /** Running the shrunken version of the day. */
  minimum: boolean
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [skipped, setSkipped] = useState(0)
  const reported = useRef(false)

  const total = steps.length

  /**
   * Tell the server, and never let it interrupt.
   *
   * Fire and forget: somebody walking through their morning must not wait on
   * a write, and a failed one costs a row in Review rather than the routine
   * itself. The route answers 200 even on its own errors for the same reason.
   */
  const report = useCallback((done: number, complete: boolean) => {
    fetch('/api/routines/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minimum, stepsTotal: total, stepsDone: done, done: complete }),
    }).catch(() => {})
  }, [minimum, total])

  // The start is worth recording on its own: "started and did not finish" is
  // a real outcome, and a routine that only counted completions would tell
  // somebody they had done nothing on a day they did four steps of five.
  useEffect(() => {
    if (reported.current || total === 0) return
    reported.current = true
    report(0, false)
  }, [report, total])

  const step = steps[index]

  const advance = (didSkip: boolean) => {
    haptic(didSkip ? 'light' : 'medium')
    if (didSkip) setSkipped(s => s + 1)
    const next = index + 1
    if (next >= total) {
      setFinished(true)
      report(total - (didSkip ? skipped + 1 : skipped), true)
      return
    }
    setIndex(next)
    report(next - skipped, false)
  }

  const title = step
    ? step.label?.trim() || step.practiceLabel || STEP_KINDS[step.kind].label
    : ''
  const floor = step ? step.minimum?.trim() || step.practiceMinimum || null : null
  const href = step ? STEP_KINDS[step.kind].href : null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${routineLabel}, in progress`}
    >
      <ScrollLock />
      <div className="absolute inset-0 bg-black" />

      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-10 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative w-full max-w-sm text-center">
        {finished || !step ? (
          <>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.12] grid place-items-center mb-5">
              <Check className="w-7 h-7 text-white" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
              {minimum ? 'Minimum day' : routineLabel}
            </p>
            <h2 className="text-[28px] text-white mt-2 leading-tight" style={{ ...SERIF, fontWeight: 600 }}>
              That&rsquo;s the routine.
            </h2>
            {/* A count with its denominator. Never a percentage, never a
                score — the same rule the practice cards keep. */}
            <p className="text-sm text-white/60 mt-3 leading-relaxed">
              {skipped === 0
                ? `All ${total} of ${total}.`
                : `${total - skipped} of ${total}. The rest can wait.`}
            </p>
            {minimum && (
              <p className="text-[12px] text-white/40 mt-2 leading-relaxed">
                A minimum day still counts. The routine is alive.
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-7 w-full py-3 rounded-xl bg-white text-black text-sm font-medium active:scale-[0.99]"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
              {index + 1} of {total}
              {minimum && <span className="text-white/30"> · minimum day</span>}
              {/* Said here so skipping it costs nothing: they already
                  decided this one was for days that allow it. */}
              {!minimum && step.weight === 'optional' && (
                <span className="text-white/30"> · optional</span>
              )}
            </p>

            <h2 className="text-[30px] text-white mt-3 leading-[1.1]" style={{ ...SERIF, fontWeight: 600 }}>
              {title}
            </h2>

            {step.time && <p className="text-[12px] text-white/35 mt-2">{timeLabel(step.time)}</p>}

            {/* On a minimum day the floor IS the ask, so it is said plainly
                rather than tucked underneath as a fallback. */}
            {floor && (
              <p className="text-sm text-white/65 mt-3">
                {minimum ? floor : `Minimum: ${floor}`}
              </p>
            )}

            {/* A step of their own has nowhere to go — there is no screen for
                "phone out of the room", and a button that opened nothing
                would read as broken. */}
            {href && (
              <Link
                href={href}
                className="mt-7 w-full block py-3 rounded-xl bg-white text-black text-sm font-medium active:scale-[0.99]"
              >
                Open it
              </Link>
            )}

            <div className={`flex gap-2 ${href ? 'mt-2' : 'mt-7'}`}>
              <button
                onClick={() => advance(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-sm text-white/85 active:scale-[0.99] flex items-center justify-center gap-1.5"
              >
                {index + 1 >= total ? 'Finish' : 'Next'}
                {index + 1 < total && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => advance(true)}
                aria-label="Skip this step"
                className="px-4 py-3 rounded-xl border border-white/[0.08] text-sm text-white/45 active:scale-[0.99] flex items-center gap-1.5"
              >
                <SkipForward className="w-3.5 h-3.5" /> Skip
              </button>
            </div>

            {/* The progress row, borrowed from the day loop so the two read
                as the same app. */}
            <div className="flex items-center justify-center gap-1 mt-6" aria-hidden>
              {steps.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-[3px] w-5 rounded-full ${i <= index ? 'bg-white/70' : 'bg-white/15'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
