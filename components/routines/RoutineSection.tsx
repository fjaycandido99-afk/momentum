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
import {
  STEP_KINDS,
  canRunMinimum,
  minimumSteps,
  normalSteps,
  sortSteps,
  timeLabel,
  type RoutineMode,
  type RoutineStepKind,
  type StepWeight,
} from '@/lib/routines/steps'
import { seedTemplate, templateFor } from '@/lib/routines/templates'
import { planRoutine } from '@/lib/routines/schedule'
import { reviewLine, type RoutineReview } from '@/lib/routines/review'
import type { PickerBook } from '@/lib/routines/picker'
import { applyRoutineSchedule, askRoutinePermission } from '@/lib/routines/native'
import { DescribeDay } from './DescribeDay'
import { RoutineRunner } from './RoutineRunner'
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
  mode: RoutineMode
  start_time: string | null
  days: number[]
  enabled: boolean
  steps: {
    id: string
    kind: RoutineStepKind
    ref: string | null
    label: string | null
    minimum: string | null
    time: string | null
    position: number
    inMinimum: boolean
    weight: StepWeight
  }[]
}

export interface PracticeLite {
  id: string
  label: string
  minimum: string
  days: number[]
  /** Which preset it came from, so a template can match it by domain. */
  preset_key: string
}

export function RoutineSection() {
  const [routine, setRoutine] = useState<RoutineWire | null>(null)
  const [practices, setPractices] = useState<PracticeLite[]>([])
  const [era, setEra] = useState<{ key: string; title: string } | null>(null)
  const [review, setReview] = useState<RoutineReview | null>(null)
  /** The book they are on, offered by the step picker. */
  const [book, setBook] = useState<PickerBook | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)
  /**
   * The draft the editor opens on, when it is not their saved routine.
   *
   * A seeded template rather than an empty row: somebody who has never had a
   * routine is the last person who should be asked to design one from
   * nothing. They open on a day and change it.
   */
  const [seed, setSeed] = useState<RoutineDraft | null>(null)
  /** The routine is saved but the phone will not deliver it. */
  const [remindersOff, setRemindersOff] = useState(false)
  /** They are describing their day for Voxu to draft. */
  const [describing, setDescribing] = useState(false)
  /** Which version is being walked through, if any. */
  const [running, setRunning] = useState<'full' | 'minimum' | null>(null)

  const load = useCallback(() => {
    fetch('/api/routines')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return
        setRoutine(data.routine ?? null)
        setPractices(data.practices ?? [])
        setEra(data.era ?? null)
        setReview(data.review ?? null)
        setBook(data.book ?? null)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => { load() }, [load])

  /**
   * Keep the phone in step with what is saved.
   *
   * On every open, not only on save: a notification lives on the device and
   * the row lives in Postgres, and the two drift the moment somebody edits
   * their routine on another phone, reinstalls, or has iOS drop a schedule.
   * Reapplying a plan that is already correct costs nothing.
   *
   * It never prompts here — see lib/routines/native. If permission has not
   * been given, `denied` comes back and the section says so instead of
   * drawing a timeline that quietly does nothing.
   */
  useEffect(() => {
    if (!loaded) return
    let stale = false
    applyRoutineSchedule(planRoutine(routine, era?.title ?? null)).then(result => {
      if (!stale) setRemindersOff(result.ok === false && result.reason === 'denied')
    })
    return () => { stale = true }
  }, [loaded, routine, era])

  // Nothing while it is still arriving: a skeleton for a section most people
  // do not have yet is worse than the wait.
  if (!loaded) return null

  // Already ordered by the server for this routine's mode; sorted again here
  // so the list is right the moment a save returns, without a refetch.
  const steps = routine ? sortSteps(routine.steps, routine.mode) : []
  const byId = new Map(practices.map(p => [p.id, p]))
  const minimumAvailable = canRunMinimum(steps)

  /** The steps a run walks through, with each discipline's own words filled in. */
  const runSteps = (useMinimum: boolean) =>
    (useMinimum ? minimumSteps(steps, routine?.mode) : normalSteps(steps, routine?.mode)).map(s => {
      const practice = s.ref ? byId.get(s.ref) : undefined
      return {
        ...s,
        practiceLabel: practice?.label ?? null,
        practiceMinimum: practice?.minimum ?? null,
      }
    })

  /**
   * Open the editor on the era's routine.
   *
   * Seeded here rather than saved silently: a routine that appeared without
   * being looked at would start sending notifications nobody chose. They see
   * the day, change what is wrong, and press Save.
   */
  const openTemplate = () => {
    haptic('medium')
    const template = templateFor(era?.key)
    setSeed({
      label: template.label,
      mode: template.mode,
      startTime: template.start,
      days: [],
      steps: seedTemplate(template, practices),
    })
    setEditing(true)
  }

  /**
   * Stop the reminders, keep the routine.
   *
   * Optimistic, so the label changes under the thumb — and the schedule
   * effect watches `routine`, so flipping this cancels every notification on
   * the device without a second code path that could disagree with it.
   */
  const togglePaused = async () => {
    if (!routine) return
    haptic('light')
    const next = !routine.enabled
    setRoutine({ ...routine, enabled: next })
    try {
      const res = await fetch('/api/routines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      if (!res.ok) throw new Error('refused')
    } catch {
      // Put it back rather than showing a paused routine that is still
      // sending notifications.
      setRoutine(current => (current ? { ...current, enabled: !next } : current))
    }
  }

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
          <div className="shrink-0 flex items-center gap-3">
            {/*
              Pause, not delete.

              Somebody working nights for a fortnight wants the 06:30
              notification to stop without losing the day they built, and
              deleting the routine as the only way to do that is how a good
              routine gets thrown away over a week that ended.
            */}
            <button
              onClick={togglePaused}
              className="text-[11px] text-white/45 hover:text-white/80"
            >
              {routine.enabled ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={() => { haptic('light'); setEditing(true) }}
              className="text-[11px] text-white/45 hover:text-white/80"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {steps.length === 0 ? (
        /*
          The first screen, and the one that decides whether anybody ever has
          a routine. It opens on a day that is already written — the era's, or
          a sensible one — because "here is a morning, change it" is a
          question people can answer and "design your day" is not.
        */
        <div className="rounded-xl border border-white/[0.12] bg-white/[0.03] p-4">
          <div className="flex items-start gap-2.5">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-white/50" />
            <div className="min-w-0">
              <p className="text-[15px] text-white leading-snug" style={{ ...SERIF, fontWeight: 500 }}>
                Build the day you want to repeat
              </p>
              <p className="text-[12px] text-white/55 mt-1 leading-relaxed">
                Your audio, your promise, your disciplines — in the order you do them, or at the
                times you do them. Voxu walks you through it.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => openTemplate()}
              className="flex-1 py-2.5 rounded-xl bg-white text-black text-[13px] font-medium active:scale-[0.99]"
            >
              {/* Named after their era when they have one, because "the Gym
                  Arc routine" is a thing somebody wants to see and "a
                  suggested routine" is not. */}
              {era ? `Start with my ${era.title} day` : 'Start with a routine'}
            </button>
            <button
              onClick={() => { haptic('light'); setSeed(null); setEditing(true) }}
              className="px-3.5 py-2.5 rounded-xl border border-white/15 text-[13px] text-white/70 active:scale-[0.99] inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Blank
            </button>
          </div>
          {/*
            The third way in, for everybody whose day is not one of eight
            eras. Underneath rather than beside: the era's routine is the
            fastest answer for most people, and this is the better one for
            anybody whose day has a shape of its own.
          */}
          <button
            onClick={() => { haptic('light'); setDescribing(true) }}
            className="mt-2 w-full py-2.5 rounded-xl border border-white/[0.1] text-[12.5px] text-white/60 active:scale-[0.99] inline-flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3 h-3" /> Tell Voxu about your day instead
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.12] overflow-hidden">
          {steps.map((step, i) => {
            const { title, minimum, missing } = describe(step)
            const Icon = ICONS[step.kind]
            const href = STEP_KINDS[step.kind].href
            const body = (
              <>
                {/* The time down the left is what makes this a day rather
                    than a list of things you owe. In sequence mode there are
                    no times — a step happens when the last one is done — so
                    the position takes that column instead, and the shape of
                    the list survives. */}
                <span className="w-[62px] shrink-0 text-[11px] tabular-nums text-white/45 pt-0.5">
                  {step.time ? timeLabel(step.time) : `${i + 1}.`}
                </span>
                <span className="shrink-0 pt-0.5">
                  <Icon className="w-3.5 h-3.5 text-white/35" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] text-white leading-snug truncate">
                    {title}
                    {/* Said on the row, because "why did that one not remind
                        me?" has to be answerable from the day itself. */}
                    {step.weight === 'optional' && (
                      <span className="text-[11px] text-white/35 font-normal"> · optional</span>
                    )}
                    {step.weight === 'minimum_only' && (
                      <span className="text-[11px] text-white/35 font-normal"> · bad days only</span>
                    )}
                  </span>
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

      {/*
        Review. Counts and their denominator, and nothing that looks like a
        score — see lib/routines/review for why there is no percentage here
        and never will be.

        Hidden until the routine has been run at all: "Started 0 of the last
        7 days" on the day somebody builds one is the app opening with a
        reproach for something it only just offered.
      */}
      {review && review.started > 0 && (
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1" aria-hidden>
            {review.marks.map(mark => (
              <span
                key={mark.day}
                className={`h-1.5 w-1.5 rounded-full ${
                  mark.state === 'none'
                    ? 'bg-white/15'
                    : mark.state === 'started'
                      ? 'bg-white/35'
                      : 'bg-white/75'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-white/45 leading-relaxed">{reviewLine(review)}</p>
        </div>
      )}

      {/* Paused is a state worth seeing: a timeline that looks live and
          reminds you of nothing is the thing to avoid. */}
      {routine && !routine.enabled && steps.length > 0 && (
        <p className="text-[11px] text-white/45 leading-relaxed">
          Paused. The day is still here — nothing will nudge you until you resume it.
        </p>
      )}

      {/* Said plainly, because a timeline that reminds you of nothing is
          worse than no timeline: they would think it was working. */}
      {remindersOff && routine?.enabled && steps.length > 0 && (
        <p className="text-[11px] text-white/45 leading-relaxed">
          Notifications are off for Voxu, so this routine will not nudge you. Turn them on in your
          phone&rsquo;s settings and it will start.
        </p>
      )}

      {/*
        Starting it.

        In SEQUENCE mode this is the whole point — the routine is a thing you
        begin and are walked through, so the button is primary. In TIMED mode
        the reminders do the walking, so running it manually is offered
        quietly underneath rather than competing with them.

        The minimum day sits beside it whenever they have marked steps that
        survive one. Not as a lesser option: "keep the routine alive" is the
        idea, and a bad day is when somebody most needs it to be one tap.
      */}
      {steps.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => { haptic('medium'); setRunning('full') }}
            className={`flex-1 py-3 rounded-xl text-sm font-medium active:scale-[0.99] ${
              routine?.mode === 'sequence'
                ? 'bg-white text-black'
                : 'border border-white/15 text-white/85'
            }`}
          >
            {routine?.mode === 'sequence' ? `Start ${routine.label}` : 'Walk me through it'}
          </button>
          {minimumAvailable && (
            <button
              onClick={() => { haptic('light'); setRunning('minimum') }}
              className="px-4 py-3 rounded-xl border border-white/15 text-sm text-white/70 active:scale-[0.99]"
            >
              Minimum day
            </button>
          )}
        </div>
      )}

      {running && routine && (
        <RoutineRunner
          routineLabel={routine.label}
          steps={runSteps(running === 'minimum')}
          minimum={running === 'minimum'}
          onClose={() => { setRunning(null); load() }}
        />
      )}

      {describing && (
        <DescribeDay
          onClose={() => setDescribing(false)}
          onDrafted={draft => {
            // Straight into the editor, unsaved. They see their own day
            // before anything starts reminding them about it.
            setDescribing(false)
            setSeed({
              label: draft.label,
              mode: draft.mode,
              startTime: draft.startTime,
              days: draft.days,
              steps: draft.steps,
            })
            setEditing(true)
          }}
        />
      )}

      {editing && (
        <RoutineEditor
          initial={
            routine
              ? ({
                  label: routine.label,
                  mode: routine.mode,
                  startTime: routine.start_time,
                  days: routine.days,
                  steps: steps.map(s => ({
                    kind: s.kind,
                    ref: s.ref,
                    label: s.label ?? '',
                    minimum: s.minimum ?? '',
                    time: s.time,
                    inMinimum: s.inMinimum,
                    weight: s.weight,
                  })),
                } satisfies RoutineDraft)
              : seed
          }
          practices={practices}
          book={book}
          canDelete={!!routine}
          onClose={() => { setEditing(false); setSeed(null) }}
          onSaved={async () => {
            setEditing(false)
            setSeed(null)
            // The one moment a routine may prompt: they have just asked to be
            // reminded at 07:00, so "allow notifications?" answers a question
            // they already have. No-op on web and when already granted.
            await askRoutinePermission()
            load()
          }}
        />
      )}
    </div>
  )
}
