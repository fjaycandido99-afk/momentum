import { prisma } from '@/lib/prisma'
import { adherence, daysLabel } from '@/lib/practices/logic'
import {
  STEP_KINDS,
  isRoutineMode,
  isRoutineStepKind,
  normalSteps,
  stepWeight,
  timeLabel,
  type RoutineStepKind,
} from '@/lib/routines/steps'
import type { BehaviourFacts, RoutineFacts } from './behaviour-context'

/**
 * Loads the shape of someone's last N days for the coach.
 *
 * Called from buildUserContext, which has already checked consent — so if
 * this runs, the person has said the chat may remember them. It is behind
 * the same cache, so the cost is one build per conversation rather than one
 * per turn.
 *
 * Counts, not rows. The practice numbers come from `adherence`, the same
 * function the training page uses, so the coach and the screen can never
 * quote different figures at the same person.
 */

/** YYYY-MM-DD, n days before the given day. */
function dayBefore(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

export async function loadBehaviourFacts(
  userId: string,
  today: string,
  days: number,
): Promise<BehaviourFacts> {
  const from = dayBefore(today, days)

  const [era, promises, practices, exerciseRuns, routine] = await Promise.all([
    prisma.era.findFirst({
      where: { user_id: userId, status: 'active' },
      select: { title: true, start_day: true, length_days: true },
      orderBy: { created_at: 'desc' },
    }),
    prisma.eraPromise.findMany({
      where: { user_id: userId, local_day: { gte: from, lte: today }, kept: { not: null } },
      select: { kept: true },
    }),
    prisma.practice.findMany({
      // status, not retired_at: there is an index on [user_id, status].
      where: { user_id: userId, status: 'active' },
      select: {
        id: true,
        label: true,
        days: true,
        minimum: true,
        logs: {
          where: { local_day: { gte: from, lte: today } },
          select: { local_day: true, done: true, minimum_only: true },
        },
      },
      // A handful is plenty of context; twenty would crowd out the journal.
      take: 6,
    }),
    prisma.exerciseRun.count({
      where: { user_id: userId, local_day: { gte: from, lte: today }, completed: true },
    }),
    // The shape of their day. One routine per person, so one row and its
    // steps — and the runs inside the same window as everything else, so the
    // coach is never quoting two different weeks at once.
    prisma.routine.findUnique({
      where: { user_id: userId },
      select: {
        label: true,
        mode: true,
        days: true,
        enabled: true,
        steps: {
          select: { kind: true, ref: true, label: true, time: true, position: true, weight: true },
        },
        runs: {
          where: { local_day: { gte: from, lte: today } },
          select: { local_day: true },
        },
      },
    }),
  ])

  /** Day 1 is the start day itself, so a brand-new era reads "day 1". */
  const eraDay = era
    ? Math.max(
        1,
        Math.round(
          (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${era.start_day}T00:00:00Z`)) /
            86_400_000,
        ) + 1,
      )
    : 0

  return {
    era: era ? { title: era.title, day: eraDay, lengthDays: era.length_days } : null,
    promises: {
      kept: promises.filter(p => p.kept).length,
      answered: promises.length,
    },
    practices: practices.map(p => {
      const { done, of } = adherence(
        { id: p.id, label: p.label, days: p.days, minimum: p.minimum },
        // minimum_only is a KEPT day, not a half-failure — adherence already
        // treats it that way, so it just has to be carried through.
        p.logs.map(l => ({ day: l.local_day, done: l.done, minimumOnly: l.minimum_only })),
        from,
        today,
      )
      return { label: p.label, kept: done, due: of }
    }),
    exercises: { run: exerciseRuns, days },
    routine: routine ? routineFacts(routine, practices, days) : null,
  }
}

/**
 * The routine, as the coach is allowed to see it.
 *
 * Titles resolve the same way every other surface resolves them — their own
 * words, then the discipline's name, then the kind's label — so the coach
 * cannot end up calling their gym session "A discipline". Times are read
 * back in 12-hour, because "18:00" is not how anybody says it out loud.
 *
 * Bad-days-only steps are left out: they are not part of an ordinary day,
 * and including them would have the coach describing a day the person does
 * not normally have.
 */
function routineFacts(
  routine: {
    label: string
    mode: string
    days: number[]
    enabled: boolean
    steps: { kind: string; ref: string | null; label: string | null; time: string | null; position: number; weight: string }[]
    runs: { local_day: string }[]
  },
  practices: { id: string; label: string }[],
  days: number,
): RoutineFacts {
  const mode = isRoutineMode(routine.mode) ? routine.mode : 'timed'
  const byId = new Map(practices.map(p => [p.id, p.label]))

  const steps = normalSteps(
    routine.steps.filter(s => isRoutineStepKind(s.kind)).map(s => ({
      ...s,
      kind: s.kind as RoutineStepKind,
      weight: stepWeight(s.weight),
    })),
    mode,
  ).map(step => ({
    title:
      step.label?.trim()
      || (step.ref ? byId.get(step.ref) : undefined)
      || STEP_KINDS[step.kind].label,
    time: step.time ? timeLabel(step.time) : null,
  }))

  return {
    label: routine.label,
    timed: mode === 'timed',
    steps,
    days: routine.days.length > 0 ? daysLabel(routine.days) : null,
    // Only a sequence routine records being begun. A timed one has nothing
    // to count, and a count of zero would read as a failure rather than as
    // a feature that does not work that way.
    started: mode === 'sequence' ? { days: new Set(routine.runs.map(r => r.local_day)).size, of: days } : null,
    paused: !routine.enabled,
  }
}
