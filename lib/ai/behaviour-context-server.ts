import { prisma } from '@/lib/prisma'
import { adherence } from '@/lib/practices/logic'
import type { BehaviourFacts } from './behaviour-context'

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

  const [era, promises, practices, exerciseRuns] = await Promise.all([
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
  }
}
