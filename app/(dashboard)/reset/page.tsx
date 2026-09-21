'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ExercisePlayer } from '@/components/exercise/ExercisePlayer'
import {
  RESET_STATES,
  deltaLine,
  exerciseForState,
  resetState,
  type ResetStateId,
} from '@/lib/reset/states'
import { haptic } from '@/lib/haptics'
import { trackFeature } from '@/lib/analytics/track'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

type Phase = 'pick' | 'before' | 'run' | 'after'

/**
 * /reset — Nervous-System mode.
 *
 * The one screen in Voxu that stops asking for more. Everything else is
 * built to get someone to do the harder thing; this is for the evening when
 * that is the wrong instruction, and an app that only knows how to push is
 * one people delete on their worst week.
 *
 * Four states, said the way a person would say them, each routing to a few
 * minutes of regulation from Voxu's own library. No diagnosis, no treatment
 * claim, and no scoring: the before/after is two numbers they gave, reported
 * back as the two numbers they gave.
 */
export default function ResetPage() {
  const [phase, setPhase] = useState<Phase>('pick')
  const [stateId, setStateId] = useState<ResetStateId | null>(null)
  const [before, setBefore] = useState<number | null>(null)
  const [after, setAfter] = useState<number | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const state = resetState(stateId)
  const exercise = stateId ? exerciseForState(stateId) : null

  const choose = (id: ResetStateId) => {
    haptic('light')
    trackFeature('era', 'open', `reset:${id}`)
    setStateId(id)
    setBefore(null)
    setAfter(null)
    setPhase('before')
  }

  /** Starting records the visit; the level only lands with wellness on. */
  const start = useCallback(async (level: number | null) => {
    haptic('light')
    setBefore(level)
    setPhase('run')
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', state: stateId, before: level }),
      })
      const data = await res.json().catch(() => null)
      if (data?.id) setSessionId(data.id)
    } catch {
      // The session runs regardless. A failed write is not worth a message
      // to someone who came here to come down.
    }
  }, [stateId])

  const finish = useCallback(async (level: number | null, completed: boolean) => {
    setAfter(level)
    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finish', id: sessionId, after: level, completed }),
      })
    } catch {
      // As above.
    }
  }, [sessionId])

  return (
    <div className="min-h-screen bg-black text-white">
      <div
        className="max-w-md mx-auto px-5 pb-24"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <Link href="/" aria-label="Back" className="inline-flex p-2 -ml-2 rounded-full hover:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </Link>

        {phase === 'pick' && (
          <div className="mt-3">
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Right now</p>
            <h1 className="text-[34px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              What&rsquo;s going on?
            </h1>
            <p className="text-[13px] text-white/55 mt-2 leading-relaxed">
              No promise, no streak, nothing to keep. A few minutes to come down, and your era
              waits — today doesn&rsquo;t count against you for being here.
            </p>

            <div className="mt-6 space-y-2">
              {RESET_STATES.map(s => (
                <button
                  key={s.id}
                  onClick={() => choose(s.id)}
                  className="w-full text-left p-4 rounded-2xl border border-white/[0.14] hover:bg-white/[0.05] press-scale"
                >
                  <p className="text-[19px] text-white leading-snug" style={{ ...SERIF, fontWeight: 500 }}>
                    {s.label}
                  </p>
                  <p className="text-[12px] text-white/50 mt-1 leading-snug">{s.recognise}</p>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-white/35 mt-6 leading-relaxed">
              This is a few minutes of breathing and attention, not treatment. If things are worse
              than that, please talk to someone who can help — a doctor, a crisis line, or someone
              who loves you.
            </p>
          </div>
        )}

        {phase === 'before' && state && (
          <div className="mt-3">
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">{state.label}</p>
            <h1 className="text-[28px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              {state.scale.question}
            </h1>
            <p className="text-[13px] text-white/50 mt-2">
              Optional — it just lets you see the difference afterwards.
            </p>

            <div className="mt-5 space-y-2">
              {state.scale.labels.map((label, i) => (
                <button
                  key={label}
                  onClick={() => start(i + 1)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-white/[0.14] text-[15px] text-white hover:bg-white/[0.06]"
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => start(null)}
              className="block mx-auto mt-5 text-[13px] text-white/45 hover:text-white/75"
            >
              Skip — just start
            </button>
          </div>
        )}

        {phase === 'after' && state && (
          <div className="mt-3">
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">{state.label}</p>
            {after === null && before !== null ? (
              <>
                <h1 className="text-[28px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
                  And now?
                </h1>
                <div className="mt-5 space-y-2">
                  {state.scale.labels.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => finish(i + 1, true)}
                      className="w-full text-left px-4 py-3 rounded-xl border border-white/[0.14] text-[15px] text-white hover:bg-white/[0.06]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h1 className="text-[30px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
                  {deltaLine(state, before, after)}
                </h1>
                <p className="text-[13px] text-white/55 mt-3 leading-relaxed">
                  Nothing is owed for the rest of tonight. Your era is where you left it.
                </p>
                <div className="mt-6 space-y-2">
                  <button
                    onClick={() => { setPhase('pick'); setStateId(null); setSessionId(null) }}
                    className="w-full py-3 rounded-xl border border-white/20 text-sm text-white"
                  >
                    Something else
                  </button>
                  <Link href="/" className="block text-center py-3 rounded-xl bg-white text-black text-sm font-medium">
                    Done
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {phase === 'run' && exercise && (
        <ExercisePlayer
          exercise={exercise}
          trains={exercise.trains}
          difficulty={exercise.difficulty}
          onRecord={({ completed }) => {
            // The player records exercise runs of its own; here it only tells
            // us when the session ended, so the "and now?" can be asked.
            if (completed) finish(null, true)
          }}
          onClose={() => setPhase(before !== null ? 'after' : 'pick')}
        />
      )}
    </div>
  )
}
