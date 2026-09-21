import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { daysBetween, previousDay } from '@/lib/era/logic'
import { DEFAULT_ERA_LENGTH_DAYS } from '@/lib/era/presets'
import { exerciseById, exerciseSeconds } from './library'
import { isHelped, pickExercise, pickFromId, type TodaysPractice } from './select'

// Re-exported so the loader stays the one import site for callers.
export type { TodaysPractice }

/**
 * Today's practice, and the record of it.
 *
 * The selection itself is pure (lib/exercises/select.ts); this only fetches
 * the era, works out which day it is in the user's timezone, and remembers
 * what was practised recently so today isn't the same thing again.
 *
 * Free on every tier. An exercise is the app doing its actual job.
 */

/** How many days back counts as "just did this". */
const RECENT_DAYS = 4

export async function loadTodaysPractice(userId: string): Promise<TodaysPractice | null> {
  const [prefs, era] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { timezone: true } }),
    prisma.era.findFirst({
      where: { user_id: userId, status: 'active' },
      select: { id: true, era_key: true, title: true, start_day: true, length_days: true },
      orderBy: { created_at: 'desc' },
    }),
  ])
  const today = localDay(prefs?.timezone ?? null)

  // No era, no practice: the exercise is the practice step OF an era, and a
  // guided exercise with nothing behind it is just content.
  if (!era) return null

  const day = Math.max(1, daysBetween(era.start_day, today) + 1)
  const lengthDays = era.length_days || DEFAULT_ERA_LENGTH_DAYS

  const since = recentCutoff(today)
  const recent = await prisma.exerciseRun.findMany({
    where: { user_id: userId, local_day: { gte: since, lt: today } },
    select: { exercise_id: true },
  })

  // A run already exists for today? Then today's practice is that one,
  // whatever the selection would say now — the page must not change under
  // someone who is halfway through it.
  const todaysRun = await prisma.exerciseRun.findFirst({
    where: { user_id: userId, local_day: today },
    orderBy: { created_at: 'desc' },
    select: { exercise_id: true, completed: true, seconds_done: true, helped: true },
  })

  const pick = todaysRun
    ? pickFromId(todaysRun.exercise_id, era.era_key, day, lengthDays)
      ?? pickExercise({ eraKey: era.era_key, day, lengthDays, recentIds: recent.map(r => r.exercise_id) })
    : pickExercise({
        eraKey: era.era_key,
        day,
        lengthDays,
        recentIds: recent.map(r => r.exercise_id),
      })

  if (!pick) return null

  return {
    exercise: pick.exercise,
    trains: pick.trains,
    difficulty: pick.difficulty,
    repeat: pick.repeat,
    run: todaysRun && exerciseById(todaysRun.exercise_id)?.id === pick.exercise.id
      ? { completed: todaysRun.completed, secondsDone: todaysRun.seconds_done, helped: todaysRun.helped }
      : null,
    eraTitle: era.title,
    eraDay: day,
    localDay: today,
  }
}

/** The earliest day that still counts as recent. */
function recentCutoff(today: string): string {
  let day = today
  for (let i = 0; i < RECENT_DAYS; i++) day = previousDay(day)
  return day
}

export interface RecordArgs {
  userId: string
  exerciseId: string
  /** How far they got. Clamped to the exercise's own length. */
  secondsDone?: number
  completed?: boolean
  helped?: unknown
}

/**
 * Write a run. Called on start and again at the end, so an exercise someone
 * walked away from still leaves a row — otherwise the only thing this table
 * could ever say is that everything works.
 */
export async function recordRun(args: RecordArgs): Promise<{ ok: true } | { ok: false; reason: string }> {
  const exercise = exerciseById(args.exerciseId)
  if (!exercise) return { ok: false, reason: 'No such exercise' }

  const [prefs, era] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { user_id: args.userId }, select: { timezone: true } }),
    prisma.era.findFirst({
      where: { user_id: args.userId, status: 'active' },
      select: { id: true },
      orderBy: { created_at: 'desc' },
    }),
  ])
  const today = localDay(prefs?.timezone ?? null)
  const planned = exerciseSeconds(exercise)
  const done = Math.max(0, Math.min(planned, Math.round(args.secondsDone ?? 0)))
  const helped = isHelped(args.helped) ? args.helped : null

  const key = {
    user_id: args.userId,
    local_day: today,
    exercise_id: exercise.id,
  }
  // Furthest point reached, not the last number sent: a sheet reopened at
  // 00:00 must not erase that they got to 19 minutes this morning.
  const existing = await prisma.exerciseRun.findUnique({
    where: { user_id_local_day_exercise_id: key },
    select: { seconds_done: true, completed: true },
  })
  const furthest = Math.max(done, existing?.seconds_done ?? 0)

  await prisma.exerciseRun.upsert({
    where: { user_id_local_day_exercise_id: key },
    create: {
      user_id: args.userId,
      era_id: era?.id ?? null,
      exercise_id: exercise.id,
      local_day: today,
      seconds_planned: planned,
      seconds_done: done,
      completed: !!args.completed,
      helped,
    },
    update: {
      // Never walk a finished run backwards: a second visit must not turn a
      // completed practice into an abandoned one.
      seconds_done: furthest,
      completed: args.completed || existing?.completed ? true : undefined,
      helped: helped ?? undefined,
      era_id: era?.id ?? undefined,
    },
  })

  return { ok: true }
}
