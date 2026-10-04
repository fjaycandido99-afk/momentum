import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { daysBetween } from '@/lib/era/logic'
import { eraName } from '@/lib/era/presets'
import { addDays } from '@/lib/patterns/era-laws'
import { buildEraRecord } from '@/lib/era/record'

/**
 * Every era they've run, oldest first — the one page where the whole story
 * reads in order (/eras). Counts from their own record only; the full
 * record of each (laws, experiments, reflection) stays on Proof.
 */
export interface TimelineEra {
  id: string
  title: string
  key: string
  startDay: string
  /** Its last day: planned end, the day it was stopped, or today if running. */
  endDay: string
  lengthDays: number
  status: 'running' | 'finished' | 'stopped'
  /** For a running era: today's day number. */
  day: number
  kept: number
  answered: number
  longestRun: number
  recoveries: number
  stayed: string[]
}

export async function loadEraTimeline(userId: string): Promise<TimelineEra[]> {
  const prefs = await prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { timezone: true } })
  const tz = prefs?.timezone ?? null
  const today = localDay(tz)
  const eras = await prisma.era.findMany({
    where: { user_id: userId },
    orderBy: { start_day: 'asc' },
    select: { id: true, title: true, era_key: true, start_day: true, length_days: true, status: true, ended_at: true, reflection: true },
  })
  if (!eras.length) return []
  const ids = eras.map(e => e.id)
  const [promises, stayed] = await Promise.all([
    prisma.eraPromise.findMany({ where: { user_id: userId, era_id: { in: ids } }, select: { era_id: true, local_day: true, kept: true } }),
    prisma.practice.findMany({ where: { user_id: userId, from_era_id: { in: ids } }, select: { label: true, from_era_id: true }, orderBy: { created_at: 'asc' } }),
  ])

  return eras.map(e => {
    const lastPlanned = addDays(e.start_day, e.length_days - 1)
    const endedDay = e.ended_at ? localDay(tz, e.ended_at) : null
    const running = e.status === 'active' && lastPlanned >= today
    const endDay = running ? today : endedDay && endedDay < lastPlanned ? endedDay : lastPlanned
    const record = buildEraRecord({
      id: e.id,
      title: eraName(e.title),
      startDay: e.start_day,
      endDay,
      lengthDays: e.length_days,
      daysRun: daysBetween(e.start_day, endDay) + 1,
      promises: promises.filter(p => p.era_id === e.id).map(p => ({ day: daysBetween(e.start_day, p.local_day) + 1, kept: p.kept })),
      stayed: stayed.filter(s => s.from_era_id === e.id).map(s => s.label),
      reflection: e.reflection,
    })
    return {
      id: e.id,
      title: record.title,
      key: e.era_key,
      startDay: e.start_day,
      endDay,
      lengthDays: e.length_days,
      status: running ? 'running' : record.completed ? 'finished' : 'stopped',
      day: Math.min(e.length_days, daysBetween(e.start_day, today) + 1),
      kept: record.kept,
      answered: record.answered,
      longestRun: record.longestRun,
      recoveries: record.recoveries,
      stayed: record.stayed,
    } satisfies TimelineEra
  })
}
