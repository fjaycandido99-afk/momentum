/**
 * The routine, in one line, for home.
 *
 * The routine is the shape of the day, so home should know it exists — but
 * home is also the quiet screen (see docs and lib/ui/dismiss), and a section
 * that appears every morning to tell somebody about a thing they already know
 * they have is the kind of clutter that got the old carousel deleted.
 *
 * So this is one line and it disappears when it has nothing to say: paused,
 * not a day this routine runs, nothing left on the clock. It never nags and
 * it never scores.
 *
 * What it is careful NOT to say: that anything was done. A timed routine
 * records nothing about its steps by design — the disciplines do that — so
 * every phrase here is about the SCHEDULE. "Nothing left on the clock today"
 * is true whatever happened; "done for today" would be the app telling
 * somebody they trained when it has no idea.
 *
 * Sequence routines are the exception, and only because RoutineRun is a real
 * record of a real tap: "3 of 5" and "you ran it today" are facts.
 *
 * Pure. The clock comes in as minutes past local midnight.
 */

import {
  STEP_KINDS,
  normalSteps,
  timeLabel,
  type RoutineMode,
  type RoutineStepKind,
  type StepWeight,
} from './steps'

export interface GlanceStep {
  kind: RoutineStepKind
  ref: string | null
  label: string | null
  time: string | null
  position: number
  /** How much it asks for. Absent means 'required'. */
  weight?: StepWeight
}

export interface GlanceRoutine {
  label: string
  mode: RoutineMode
  start_time: string | null
  days: number[]
  enabled: boolean
  steps: GlanceStep[]
}

/** Today's run, if the routine has been started at all today. */
export interface GlanceRun {
  steps_total: number
  steps_done: number
  completed: boolean
}

export interface GlanceInput {
  routine: GlanceRoutine | null
  /** Minutes past local midnight. */
  now: number
  /** Local weekday, 0 = Sunday, matching Routine.days. */
  weekday: number
  run: GlanceRun | null
  /** Discipline labels by id, so a discipline step reads as itself. */
  practiceLabels?: Record<string, string>
}

export interface RoutineGlance {
  /** The routine's name: "Training day". */
  label: string
  /** The one phrase after it. */
  line: string
  href: string
}

/** Where home sends them. */
export const GLANCE_HREF = '/training'

/** Does the routine run on this weekday? Empty days means every day. */
export function runsOn(days: number[], weekday: number): boolean {
  return days.length === 0 || days.includes(weekday)
}

/**
 * One line, or nothing.
 *
 * Null is the common answer and the right one: most of the day, for most
 * people, there is nothing about the routine that home needs to say.
 */
export function routineGlance(input: GlanceInput): RoutineGlance | null {
  const { routine, now, weekday, run } = input
  if (!routine || routine.steps.length === 0) return null

  // Paused is their decision, made on purpose. Home does not argue with it.
  if (!routine.enabled) return null

  // Not a day it runs. Saying "not today" every Sunday is a notification
  // nobody asked for, in a place they cannot turn off.
  if (!runsOn(routine.days, weekday)) return null

  const base = { label: routine.label, href: GLANCE_HREF }

  if (routine.mode === 'sequence') {
    // These are facts: somebody tapped Start and the runner reported it.
    if (run?.completed) return { ...base, line: 'you ran it today' }
    if (run && run.steps_total > 0) {
      return { ...base, line: `${run.steps_done} of ${run.steps_total} so far` }
    }

    const at = routine.start_time ? timeLabel(routine.start_time) : null
    return { ...base, line: at ? `starts at ${at}` : 'ready when you are' }
  }

  // Bad-days-only steps are not part of an ordinary day, so they are never
  // what is "next up" on one. Optional steps are: they have no reminder, but
  // they are still something the person put in their day.
  const steps = normalSteps(routine.steps, 'timed')
  const next = steps.find(s => {
    if (!s.time) return false
    const [h, m] = s.time.split(':')
    return Number(h) * 60 + Number(m) > now
  })

  if (!next) {
    // Deliberately about the clock, not about them. See the note above.
    return { ...base, line: 'nothing left on the clock today' }
  }

  const title = next.label?.trim()
    || (next.ref ? input.practiceLabels?.[next.ref] : undefined)
    || STEP_KINDS[next.kind].label

  return { ...base, line: `next up ${title} at ${timeLabel(next.time!)}` }
}

/** "Training day · next up Today's promise at 7:00 am" */
export function glanceLine(glance: RoutineGlance): string {
  return `${glance.label} · ${glance.line}`
}
