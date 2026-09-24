'use client'

/**
 * Your routine, on a timeline.
 *
 * A timeline rather than a checklist, deliberately: a checklist is a list of
 * things you owe, and a day is a shape. The times down the left are what make
 * it read as yours rather than as homework.
 *
 * It shows what is there and opens the editor. It does NOT tick anything off —
 * a step pointing at a discipline is answered on that discipline, which keeps
 * one record instead of two. See docs/routines-scope.md.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, CalendarClock, Circle, Dumbbell, Headphones, Moon, PenLine, Plus, Sparkles, Target,
  type LucideIcon,
} from 'lucide-react'
import { daysLabel } from '@/lib/practices/logic'
import { haptic } from '@/lib/haptics'
import { STEP_KINDS, sortSteps, timeLabel, type RoutineStepKind } from '@/lib/routines/steps'
import { RoutineEditor, type RoutineDraft } from './RoutineEditor'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/** One glyph per kind. In the component, so lib/routines stays pure. */
const ICONS: Record<RoutineStepKind, LucideIcon> = {
  audio: Headphones,
  promise: Target,
  exercise: Sparkles,
  practice: Dumbbell,
  journal: PenLine,
  reset: Moon,
  own: Circle,
}

export interface RoutineWire {
  id: string
  label: string
  days: number[]
  enabled: boolean
  steps: {
    id: string
    kind: RoutineStepKind
    ref: string | null
    label: string | null
    minimum: string | null
    time: string
    position: number
  }[]
}

export interface PracticeLite {
  id: string
  label: string
  minimum: string
  days: number[]
}

export function RoutineSection() {
  const [routine, setRoutine] = useState<RoutineWire | null>(null)
  const [practices, setPractices] = useState<PracticeLite[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)

  const load = useCallback(() => {
    fetch('/api/routines')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return
        setRoutine(data.routine ?? null)
        setPractices(data.practices ?? [])
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => { load() }, [load])

  // Nothing while it is still arriving: a skeleton for a section most people
  // do not have yet is worse than the wait.
  if (!loaded) return null

  const steps = routine ? sortSteps(routine.steps) : []
  const byId = new Map(practices.map(p => [p.id, p]))

  /** A step's title and floor — a discipline step reads from the discipline. */
  const describe = (step: RoutineWire['steps'][number]) => {
    if (step.kind === 'practice') {
      const practice = step.ref ? byId.get(step.ref) : undefined
      return {
        title: step.label?.trim() || practice?.label || STEP_KINDS.practice.label,
        // The floor lives on the discipline, in one place, so it cannot
        // drift between the routine and the record.
        minimum: practice?.minimum || null,
        // A step whose discipline has been paused or deleted since. Said
        // plainly rather than rendered as a working step.
        missing: !practice,
      }
    }
    return {
      title: step.label?.trim() || STEP_KINDS[step.kind].label,
      minimum: step.minimum?.trim() || null,
      missing: false,
    }
  }

  return (
    <div className="mt-7 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Your routine</p>
          <p className="text-[12px] text-white/45 mt-0.5">
            {routine
              ? `${routine.label} · ${daysLabel(routine.days)}`
              : 'The shape of your day, and when.'}
          </p>
        </div>
        {routine && (
          <button
            onClick={() => { haptic('light'); setEditing(true) }}
            className="shrink-0 text-[11px] text-white/45 hover:text-white/80"
          >
            Edit
          </button>
        )}
      </div>

      {steps.length === 0 ? (
        <button
          onClick={() => { haptic('light'); setEditing(true) }}
          className="w-full rounded-xl border border-white/[0.12] bg-white/[0.03] p-4 text-left active:scale-[0.99]"
        >
          <div className="flex items-start gap-2.5">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-white/50" />
            <div>
              <p className="text-[15px] text-white leading-snug" style={{ ...SERIF, fontWeight: 500 }}>
                Build your routine
              </p>
              <p className="text-[12px] text-white/55 mt-1 leading-relaxed">
                Your audio, your promise, your disciplines — at the times you actually do them.
                Voxu reminds you at each one.
              </p>
              <span className="inline-flex items-center gap-1 text-[12px] text-white/70 mt-2">
                <Plus className="w-3 h-3" /> Start one
              </span>
            </div>
          </div>
        </button>
      ) : (
        <div className="rounded-xl border border-white/[0.12] overflow-hidden">
          {steps.map((step, i) => {
            const { title, minimum, missing } = describe(step)
            const Icon = ICONS[step.kind]
            const href = STEP_KINDS[step.kind].href
            const body = (
              <>
                {/* The time down the left is what makes this a day rather
                    than a list of things you owe. */}
                <span className="w-[62px] shrink-0 text-[11px] tabular-nums text-white/45 pt-0.5">
                  {timeLabel(step.time)}
                </span>
                <span className="shrink-0 pt-0.5">
                  <Icon className="w-3.5 h-3.5 text-white/35" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] text-white leading-snug truncate">{title}</span>
                  {missing ? (
                    <span className="block text-[11px] text-white/35 mt-0.5">
                      That discipline is paused — edit the routine to point it somewhere
                    </span>
                  ) : minimum ? (
                    <span className="block text-[11px] text-white/40 mt-0.5">Minimum: {minimum}</span>
                  ) : null}
                </span>
              </>
            )

            const className = `flex items-start gap-2.5 px-3 py-2.5 ${
              i > 0 ? 'border-t border-white/[0.07]' : ''
            }`

            // 'own' has nowhere to go — there is no screen for "phone out of
            // the room", and a tap that did nothing would read as broken.
            return href && !missing ? (
              <Link key={step.id} href={href} className={`${className} active:bg-white/[0.04]`}>
                {body}
              </Link>
            ) : (
              <div key={step.id} className={className}>{body}</div>
            )
          })}
        </div>
      )}

      {editing && (
        <RoutineEditor
          initial={
            routine
              ? ({
                  label: routine.label,
                  days: routine.days,
                  steps: steps.map(s => ({
                    kind: s.kind,
                    ref: s.ref,
                    label: s.label ?? '',
                    minimum: s.minimum ?? '',
                    time: s.time,
                  })),
                } satisfies RoutineDraft)
              : null
          }
          practices={practices}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load() }}
        />
      )}
    </div>
  )
}
