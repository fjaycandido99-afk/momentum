import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { daysBetween, missionForDay, nextDay } from '@/lib/era/logic'
import { ERA_MISSIONS } from '@/lib/era/missions'
import { eraName } from '@/lib/era/presets'
import { parseConfidence, reasonLabel } from '@/lib/era/reasons'
import { buildProofYear, type ProofYear } from './grid'

/**
 * Loads one person's year in proof.
 *
 * Their own record, shown back to them, so unlike lib/patterns/server.ts
 * this one does read the promise text — that IS the proof. It never leaves
 * this user: every query is scoped by user_id, and the route behind it needs
 * their session.
 *
 * Free on every tier. It is a record of what they did; putting a price on
 * seeing it would be charging rent on their own past.
 */

/** Everything the sheet shows when a day is tapped. */
export interface ProofDetail {
  day: string
  kept: boolean | null
  promise: string
  coachReply: string | null
  /** 1–5, how sure they were before promising. */
  confidence: number | null
  /** What got in the way (a miss) or what helped (a keep), already labelled. */
  reason: string | null
  reasonKind: 'blocker' | 'helper' | null
  era: string | null
  /** 1-based day of that era. */
  eraDay: number | null
  mission: string | null
  missionDone: boolean
  state: { mood: number | null; energy: number | null; stress: number | null; rested: number | null; tags: string[] } | null
}

export interface ProofPayload {
  year: ProofYear
  /** Years with something in them, newest first. Never an empty grid. */
  years: number[]
  details: Record<string, ProofDetail>
  today: string
}

/** December of the previous year, so January can tell a comeback from a run. */
function windowStart(year: number): string {
  return `${year - 1}-12-01`
}

export async function loadProofYear(userId: string, requestedYear?: number): Promise<ProofPayload> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { user_id: userId },
    select: { timezone: true, wellness_enabled: true },
  })
  const tz = prefs?.timezone ?? null
  const today = localDay(tz)
  const thisYear = Number(today.slice(0, 4))
  const year = requestedYear && requestedYear >= 2024 && requestedYear <= thisYear ? requestedYear : thisYear

  const from = windowStart(year)
  const to = `${year}-12-31`

  const [promises, missions, eras, checkIns] = await Promise.all([
    prisma.eraPromise.findMany({
      where: { user_id: userId, local_day: { gte: from, lte: to } },
      select: {
        local_day: true, text: true, kept: true, coach_reply: true,
        confidence: true, blocker: true, helper: true, era_id: true,
      },
      orderBy: { local_day: 'asc' },
    }),
    prisma.eraMission.findMany({
      where: { user_id: userId, local_day: { gte: from, lte: to } },
      select: { local_day: true, day: true, era_id: true },
    }),
    prisma.era.findMany({
      where: { user_id: userId },
      select: { id: true, title: true, era_key: true, start_day: true, length_days: true, ended_at: true },
    }),
    // Only when they turned it on. An off switch that still reads the rows
    // is not an off switch.
    prefs?.wellness_enabled
      ? prisma.wellnessCheckIn.findMany({
          where: { user_id: userId, local_day: { gte: from, lte: to } },
          select: { local_day: true, mood: true, energy: true, stress: true, rested: true, tags: true },
        })
      : Promise.resolve([]),
  ])

  const eraById = new Map(eras.map(e => [e.id, e]))
  const missionByDay = new Map(missions.map(m => [m.local_day, m]))
  const checkInByDay = new Map(checkIns.map(c => [c.local_day, c]))

  // An era covers its own length in days, or up to the day it was ended.
  const spans = eras.map(e => {
    const lastPlanned = addDays(e.start_day, e.length_days - 1)
    const endedDay = e.ended_at ? localDay(tz, e.ended_at) : null
    return { from: e.start_day, to: endedDay && endedDay < lastPlanned ? endedDay : lastPlanned }
  })

  const details: Record<string, ProofDetail> = {}
  for (const p of promises) {
    if (p.local_day < `${year}-01-01`) continue // window padding, not this year
    const era = p.era_id ? eraById.get(p.era_id) : null
    const eraDay = era ? daysBetween(era.start_day, p.local_day) + 1 : null
    const mission = missionByDay.get(p.local_day)
    const key = era?.era_key ?? 'custom'
    const state = checkInByDay.get(p.local_day)
    details[p.local_day] = {
      day: p.local_day,
      kept: p.kept,
      promise: p.text,
      coachReply: p.coach_reply,
      confidence: parseConfidence(p.confidence),
      reason: p.kept === false && p.blocker ? reasonLabel(p.blocker)
        : p.kept === true && p.helper ? reasonLabel(p.helper)
        : null,
      reasonKind: p.kept === false && p.blocker ? 'blocker' : p.kept === true && p.helper ? 'helper' : null,
      era: era ? eraName(era.title) : null,
      eraDay: eraDay && eraDay > 0 ? eraDay : null,
      mission: mission ? missionForDay(ERA_MISSIONS[key] ?? ERA_MISSIONS.custom, mission.day) : null,
      missionDone: !!mission,
      state: state
        ? { mood: state.mood, energy: state.energy, stress: state.stress, rested: state.rested, tags: state.tags }
        : null,
    }
  }

  // The earliest thing they have this year: their first promise, or the day
  // an era started. The grid opens at that month instead of 1 January.
  const firstRecorded = [
    ...promises.map(p => p.local_day),
    ...eras.map(e => e.start_day),
  ].filter(d => d >= `${year}-01-01` && d <= to).sort()[0]

  const grid = buildProofYear({
    year,
    today,
    startFrom: firstRecorded,
    promises: promises.map(p => ({ day: p.local_day, kept: p.kept })),
    missionDays: missions.map(m => m.local_day),
    checkInDays: checkIns.map(c => c.local_day),
    eraSpans: spans,
  })

  // Only offer a year that has something in it, plus the one we're living in.
  const withData = new Set<number>([thisYear])
  for (const p of promises) withData.add(Number(p.local_day.slice(0, 4)))
  for (const e of eras) withData.add(Number(e.start_day.slice(0, 4)))
  const years = [...withData].filter(y => y <= thisYear).sort((a, b) => b - a)

  return { year: grid, years, details, today }
}

/** `day` plus n calendar days. */
function addDays(day: string, n: number): string {
  let out = day
  for (let i = 0; i < n; i++) out = nextDay(out)
  return out
}
