'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Pause, Play, X } from 'lucide-react'
import { DIFFICULTY_DOTS } from '@/lib/era/logic'
import { attributeLabel } from '@/lib/exercises/attributes'
import { exerciseSeconds, type Exercise } from '@/lib/exercises/library'
import { cueAt, HELPED_OPTIONS, type Helped } from '@/lib/exercises/select'
import { haptic } from '@/lib/haptics'
import { ScrollLock } from '@/components/ui/ScrollLock'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * Voxu running the exercise with you.
 *
 * Three screens, in order: what you're about to do, the clock with the cue
 * for where you are in it, and one question at the end. The cue is the whole
 * point — a line that arrives at 00:30 while you're sitting there is the
 * difference between being coached and being handed a checklist.
 *
 * The clock is wall-clock based (started-at plus elapsed), not a counter
 * ticked once a second: a phone that sleeps mid-exercise would otherwise
 * come back believing less time had passed than really had.
 */

type Phase = 'intro' | 'running' | 'paused' | 'done'

function mmss(total: number): string {
  const s = Math.max(0, Math.round(total))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function ExercisePlayer({
  exercise,
  trains,
  difficulty,
  alreadyDone,
  onRecord,
  onClose,
}: {
  exercise: Exercise
  trains: string[]
  difficulty: 'light' | 'moderate' | 'hard'
  /** Finished earlier today — the sheet opens on the end screen. */
  alreadyDone?: boolean
  /** Start (completed false) and end (completed true) both come through here. */
  onRecord: (args: { secondsDone: number; completed: boolean; helped?: Helped }) => void
  onClose: () => void
}) {
  const total = exerciseSeconds(exercise)
  const [phase, setPhase] = useState<Phase>(alreadyDone ? 'done' : 'intro')
  const [elapsed, setElapsed] = useState(alreadyDone ? total : 0)
  const [helped, setHelped] = useState<Helped | null>(null)

  // Wall-clock anchors: when this leg started, and how much ran before it.
  const startedAtRef = useRef<number | null>(null)
  const carriedRef = useRef(0)

  useEffect(() => {
    if (phase !== 'running') return
    let frame = 0
    const tick = () => {
      const started = startedAtRef.current
      if (started !== null) {
        const now = carriedRef.current + (Date.now() - started) / 1000
        setElapsed(Math.min(total, now))
        if (now >= total) {
          carriedRef.current = total
          startedAtRef.current = null
          haptic('medium')
          setPhase('done')
          onRecord({ secondsDone: total, completed: true })
          return
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase, total, onRecord])

  const start = useCallback(() => {
    haptic('light')
    carriedRef.current = elapsed
    startedAtRef.current = Date.now()
    setPhase('running')
    // A row on START, so the ones people walk out of are visible too.
    if (elapsed === 0) onRecord({ secondsDone: 0, completed: false })
  }, [elapsed, onRecord])

  const pause = useCallback(() => {
    haptic('light')
    const started = startedAtRef.current
    if (started !== null) carriedRef.current += (Date.now() - started) / 1000
    startedAtRef.current = null
    setPhase('paused')
    onRecord({ secondsDone: carriedRef.current, completed: false })
  }, [onRecord])

  /** Leaving part-way through records how far they got. Not a failure. */
  const leave = useCallback(() => {
    if (phase === 'running' || phase === 'paused') {
      const started = startedAtRef.current
      const done = carriedRef.current + (started !== null ? (Date.now() - started) / 1000 : 0)
      onRecord({ secondsDone: done, completed: false })
    }
    onClose()
  }, [phase, onRecord, onClose])

  const answer = (value: Helped) => {
    haptic('light')
    setHelped(value)
    onRecord({ secondsDone: total, completed: true, helped: value })
  }

  const remaining = total - elapsed
  const cue = cueAt(exercise, elapsed)
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0

  return (
    <div
      className="fixed inset-0 z-[80] bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={exercise.title}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <ScrollLock />
      <div className="flex items-center justify-between px-5 pt-4">
        <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">
          {/* Not "practice" any more: a practice is a discipline you keep
              for months, and /training renamed the pair so a reader doesn't
              have to work out the difference. This is the one exercise. */}
          {phase === 'done' ? 'Exercise done' : 'Today’s exercise'}
        </p>
        <button onClick={leave} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {phase === 'intro' && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-6 pb-8">
          <h2 className="text-[32px] text-white leading-tight" style={{ ...SERIF, fontWeight: 600 }}>
            {exercise.title}
          </h2>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {trains.slice(0, 2).map(a => (
              <span key={a} className="text-[11px] text-white/70 rounded-full border border-white/15 px-2 py-0.5">
                Trains {attributeLabel(a).toLowerCase()}
              </span>
            ))}
            <span className="text-[11px] text-white/50">{exercise.minutes} min</span>
            <span className="flex items-center gap-1" aria-label={`Difficulty: ${difficulty}`}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i < DIFFICULTY_DOTS[difficulty] ? 'bg-white/70' : 'bg-white/15'}`}
                />
              ))}
            </span>
          </div>

          <p className="text-[15px] text-white/70 leading-relaxed mt-5">{exercise.why}</p>

          <ol className="mt-6 space-y-3">
            {exercise.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 shrink-0 rounded-full border border-white/20 text-[11px] text-white/60 flex items-center justify-center tabular-nums">
                  {i + 1}
                </span>
                <span className="text-[15px] text-white leading-snug">{step}</span>
              </li>
            ))}
          </ol>

          <button
            onClick={start}
            className="w-full mt-8 py-3.5 rounded-xl bg-white text-black text-sm font-medium flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" fill="currentColor" /> Start — {exercise.minutes} min
          </button>
        </div>
      )}

      {(phase === 'running' || phase === 'paused') && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-[11px] tracking-[0.2em] uppercase text-white/40">{exercise.title}</p>
          <p className="text-[64px] leading-none text-white tabular-nums mt-3" style={{ ...SERIF, fontWeight: 600 }}>
            {mmss(remaining)}
          </p>

          {/* One line, replaced as the exercise moves. */}
          <p
            className="text-[20px] text-white/90 leading-snug mt-8 min-h-[3.5rem] max-w-[22rem]"
            style={SERIF}
            aria-live="polite"
          >
            {phase === 'paused' ? 'Paused.' : cue}
          </p>

          <div className="w-full max-w-[22rem] h-[3px] rounded-full bg-white/10 mt-6 overflow-hidden">
            <div className="h-full bg-white/70 transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
          </div>

          <button
            onClick={phase === 'running' ? pause : start}
            className="mt-10 w-14 h-14 rounded-full bg-white text-black flex items-center justify-center"
            aria-label={phase === 'running' ? 'Pause' : 'Resume'}
          >
            {phase === 'running' ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
          </button>

          {phase === 'paused' && (
            <button onClick={leave} className="mt-6 text-[13px] text-white/45 hover:text-white/70">
              Leave it here — {mmss(elapsed)} counts
            </button>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="flex-1 flex flex-col justify-center px-6">
          <div className="flex items-center gap-2 text-white">
            <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
              <Check className="w-4 h-4" />
            </span>
            <p className="text-[13px] text-white/60">
              {exercise.minutes} minutes of {attributeLabel(trains[0] ?? '').toLowerCase()}, practised.
            </p>
          </div>

          <h2 className="text-[28px] text-white leading-tight mt-6" style={{ ...SERIF, fontWeight: 600 }}>
            {exercise.after}
          </h2>
          {/* Not a mood rating: it asks about the exercise, so it needs no
              wellness consent and can't be read as a self-diagnosis. */}
          <div className="flex gap-2 mt-5">
            {HELPED_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => answer(opt.value)}
                className={`flex-1 py-3 rounded-xl border text-sm transition-colors ${
                  helped === opt.value
                    ? 'bg-white text-black border-white font-medium'
                    : 'border-white/20 text-white hover:bg-white/[0.06]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/35 mt-3 leading-relaxed">
            Voxu uses this to give you more of what works for you, and less of what doesn&rsquo;t.
          </p>

          <button
            onClick={onClose}
            className="w-full mt-8 py-3.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm"
          >
            {helped ? 'Done' : 'Skip'}
          </button>
        </div>
      )}
    </div>
  )
}
