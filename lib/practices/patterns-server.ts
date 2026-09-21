import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { previousDay } from '@/lib/era/logic'
import {
  findPracticePatterns,
  patternsPending,
  type PatternInput,
  type PracticePattern,
} from './patterns'

/**
 * The window the patterns look at.
 *
 * Three months: long enough for a weekday to have four answered instances,
 * short enough that it describes who someone is now rather than who they
 * were in the spring.
 */
const WINDOW_DAYS = 90

export interface PatternsPayload {
  patterns: PracticePattern[]
  /** What it's waiting for, when there's nothing to show. */
  pending: string | null
}

export async function loadPracticePatterns(userId: string): Promise<PatternsPayload> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { user_id: userId },
    select: { timezone: true },
  })
  const today = localDay(prefs?.timezone ?? null)
  const from = windowStart(today)

  const [practices, logs, promises, exercises] = await Promise.all([
    // Retired practices included: their record still says something true
    // about the person, and dropping them would make the counts lie.
    prisma.practice.findMany({
      where: { user_id: userId },
      select: { id: true, preset_key: true, label: true, days: true, minimum: true },
    }),
    prisma.practiceLog.findMany({
      where: { user_id: userId, local_day: { gte: from, lte: today } },
      select: { practice_id: true, local_day: true, done: true, minimum_only: true },
    }),
    prisma.eraPromise.findMany({
      where: { user_id: userId, local_day: { gte: from, lte: today } },
      select: { local_day: true, kept: true },
    }),
    prisma.exerciseRun.findMany({
      where: { user_id: userId, local_day: { gte: from, lte: today } },
      select: { local_day: true, completed: true },
    }),
  ])

  const input: PatternInput = {
    today,
    practices: practices.map(p => ({
      id: p.id,
      presetKey: p.preset_key,
      label: p.label,
      days: p.days,
      minimum: p.minimum,
    })),
    logs: logs.map(l => ({
      practiceId: l.practice_id,
      day: l.local_day,
      done: l.done,
      minimumOnly: l.minimum_only,
    })),
    promises: promises.map(p => ({ day: p.local_day, kept: p.kept })),
    exercises: exercises.map(e => ({ day: e.local_day, completed: e.completed })),
  }

  const patterns = findPracticePatterns(input)
  return {
    patterns,
    pending: patterns.length === 0 ? patternsPending(input) : null,
  }
}

function windowStart(today: string): string {
  let day = today
  for (let i = 0; i < WINDOW_DAYS; i++) day = previousDay(day)
  return day
}
