import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { daysBetween, missionForDay, nextDay } from '@/lib/era/logic'
import { ERA_MISSIONS } from '@/lib/era/missions'
import { eraName } from '@/lib/era/presets'
import { exerciseById } from '@/lib/exercises/library'
import { parseConfidence, reasonLabel } from '@/lib/era/reasons'
import { buildProofYear, type ProofYear } from './grid'
import { buildEraRecord, type EraRecord } from '@/lib/era/record'
import { lawsLearned, addDays as addDay, LOOKBACK_DAYS } from '@/lib/patterns/era-laws'
import { loadPatternInput } from '@/lib/patterns/server'
import { finishedExperimentsBetween } from '@/lib/patterns/experiments-server'
import { audioLine, countsAsProof } from '@/lib/audio-sessions'

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
  /** Null on a day that had no promise but did have a practice or exercise. */
  promise: string | null
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
  /** Practices answered that day, with their own labels and floors. */
  practices: { label: string; kept: boolean; minimumOnly: boolean; minimum: string }[]
  /** The guided exercise, if one was run that day. */
  exercise: { title: string; completed: boolean; minutes: number; helped: string | null } | null
  /**
   * Listening on the record: a finished guide ("Breathing · finished"), and
   * music or motivation sittings of 10+ minutes ("52 min of Lo-Fi") — the
   * last two as context only; they never make a day count (lib/audio-sessions).
   */
  audio: string[]
  state: { mood: number | null; energy: number | null; stress: number | null; rested: number | null; tags: string[] } | null
}

export interface ProofPayload {
  year: ProofYear
  /** Years with something in them, newest first. Never an empty grid. */
  years: number[]
  details: Record<string, ProofDetail>
  today: string
  /** Eras that are over and ended in this year, newest first — kept for good. */
  eras: EraRecord[]
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

  const [promises, missions, eras, checkIns, practiceLogs, exerciseRuns] = await Promise.all([
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
      select: { id: true, title: true, era_key: true, start_day: true, length_days: true, ended_at: true, status: true, reflection: true },
    }),
    // Only when they turned it on. An off switch that still reads the rows
    // is not an off switch.
    prefs?.wellness_enabled
      ? prisma.wellnessCheckIn.findMany({
          where: { user_id: userId, local_day: { gte: from, lte: to } },
          select: { local_day: true, mood: true, energy: true, stress: true, rested: true, tags: true },
        })
      : Promise.resolve([]),
    // A practice kept is a day kept. Retired practices are included: the
    // record of two months of training does not stop being true because
    // the practice was turned off afterwards.
    prisma.practiceLog.findMany({
      where: { user_id: userId, local_day: { gte: from, lte: to } },
      select: {
        local_day: true, done: true, minimum_only: true,
        practice: { select: { label: true, minimum: true } },
      },
    }),
    prisma.exerciseRun.findMany({
      where: { user_id: userId, local_day: { gte: from, lte: to } },
      select: { local_day: true, exercise_id: true, completed: true, seconds_planned: true, helped: true },
    }),
  ])

  // Listening on the record — one more read, scoped to the user and range.
  const audioSessions = await prisma.audioSession.findMany({
    where: { user_id: userId, local_day: { gte: from, lte: to } },
    select: { local_day: true, kind: true, title: true, seconds: true, completed: true },
    orderBy: { created_at: 'asc' },
  })
  const audioByDay = new Map<string, typeof audioSessions>()
  for (const a of audioSessions) {
    const list = audioByDay.get(a.local_day) ?? []
    list.push(a)
    audioByDay.set(a.local_day, list)
  }
  // A finished guide counts like a finished exercise: something deliberately done.
  const guideProof = audioSessions.filter(countsAsProof).map(a => ({ day: a.local_day, completed: true }))

  const eraById = new Map(eras.map(e => [e.id, e]))
  const missionByDay = new Map(missions.map(m => [m.local_day, m]))
  const checkInByDay = new Map(checkIns.map(c => [c.local_day, c]))

  // An era covers its own length in days, or up to the day it was ended.
  const spans = eras.map(e => {
    const lastPlanned = addDays(e.start_day, e.length_days - 1)
    const endedDay = e.ended_at ? localDay(tz, e.ended_at) : null
    return { from: e.start_day, to: endedDay && endedDay < lastPlanned ? endedDay : lastPlanned }
  })

  const promiseByDay = new Map(promises.map(p => [p.local_day, p]))
  const practicesByDay = new Map<string, typeof practiceLogs>()
  for (const log of practiceLogs) {
    const list = practicesByDay.get(log.local_day) ?? []
    list.push(log)
    practicesByDay.set(log.local_day, list)
  }
  // One exercise a day in practice (the picker offers one); if there were
  // several, the finished one is the one worth showing.
  const exerciseByDay = new Map<string, (typeof exerciseRuns)[number]>()
  for (const run of exerciseRuns) {
    const existing = exerciseByDay.get(run.local_day)
    if (!existing || (run.completed && !existing.completed)) exerciseByDay.set(run.local_day, run)
  }

  // A day is worth opening if ANY of the three left something behind — the
  // sheet used to exist only for promise days, so a day of nothing but
  // training wasn't tappable.
  const detailDays = [...new Set([
    ...promises.map(p => p.local_day),
    ...practiceLogs.map(l => l.local_day),
    ...exerciseRuns.map(r => r.local_day),
    ...audioSessions.map(a => a.local_day),
  ])].filter(d => d >= `${year}-01-01` && d <= to)

  const details: Record<string, ProofDetail> = {}
  for (const day of detailDays) {
    const p = promiseByDay.get(day) ?? null
    const era = p?.era_id ? eraById.get(p.era_id) : eraForDay(eras, day, tz)
    const eraDay = era ? daysBetween(era.start_day, day) + 1 : null
    const mission = missionByDay.get(day)
    const key = era?.era_key ?? 'custom'
    const state = checkInByDay.get(day)
    const run = exerciseByDay.get(day)
    const exercise = run ? exerciseById(run.exercise_id) : null

    details[day] = {
      day,
      kept: p?.kept ?? null,
      promise: p?.text ?? null,
      coachReply: p?.coach_reply ?? null,
      confidence: parseConfidence(p?.confidence),
      reason: p?.kept === false && p.blocker ? reasonLabel(p.blocker)
        : p?.kept === true && p.helper ? reasonLabel(p.helper)
        : null,
      reasonKind: p?.kept === false && p.blocker ? 'blocker' : p?.kept === true && p.helper ? 'helper' : null,
      era: era ? eraName(era.title) : null,
      eraDay: eraDay && eraDay > 0 ? eraDay : null,
      mission: mission ? missionForDay(ERA_MISSIONS[key] ?? ERA_MISSIONS.custom, mission.day) : null,
      missionDone: !!mission,
      practices: (practicesByDay.get(day) ?? []).map(log => ({
        label: log.practice.label,
        kept: log.done,
        minimumOnly: log.minimum_only,
        minimum: log.practice.minimum,
      })),
      exercise: run
        ? {
            title: exercise?.title ?? 'A practice',
            completed: run.completed,
            minutes: Math.round(run.seconds_planned / 60),
            helped: run.helped,
          }
        : null,
      state: state
        ? { mood: state.mood, energy: state.energy, stress: state.stress, rested: state.rested, tags: state.tags }
        : null,
      audio: (audioByDay.get(day) ?? []).map(audioLine),
    }
  }

  // The earliest thing they have this year: a promise, a practice answer, an
  // exercise, or the day an era started. The grid opens at that month
  // instead of 1 January.
  const firstRecorded = [
    ...promises.map(p => p.local_day),
    ...practiceLogs.map(l => l.local_day),
    ...exerciseRuns.map(r => r.local_day),
    ...guideProof.map(g => g.day),
    ...eras.map(e => e.start_day),
  ].filter(d => d >= `${year}-01-01` && d <= to).sort()[0]

  const grid = buildProofYear({
    year,
    today,
    startFrom: firstRecorded,
    promises: promises.map(p => ({ day: p.local_day, kept: p.kept })),
    // The minimum counts as kept — that is the whole point of having a floor.
    practices: practiceLogs.map(l => ({ day: l.local_day, kept: l.done })),
    exercises: [...exerciseRuns.map(r => ({ day: r.local_day, completed: r.completed })), ...guideProof],
    missionDays: missions.map(m => m.local_day),
    checkInDays: checkIns.map(c => c.local_day),
    eraSpans: spans,
  })

  // Only offer a year that has something in it, plus the one we're living in.
  const withData = new Set<number>([thisYear])
  for (const p of promises) withData.add(Number(p.local_day.slice(0, 4)))
  for (const e of eras) withData.add(Number(e.start_day.slice(0, 4)))
  const years = [...withData].filter(y => y <= thisYear).sort((a, b) => b - a)

  // The Era Records: every era that is over — run to its last day, or
  // stopped — and ended in this year. Two more reads, scoped to those eras.
  const over = eras
    .map((e, i) => ({ e, span: spans[i] }))
    .filter(({ e, span }) => (e.status === 'ended' || span.to < today) && span.to >= `${year}-01-01` && span.to <= to)
  const overIds = over.map(o => o.e.id)
  // What each era taught: laws that turned solid inside it, and the
  // experiments run in it. One history read reaching back far enough to
  // rewind the record to the start of the earliest of them.
  const earliest = over.reduce((m, o) => (o.e.start_day < m ? o.e.start_day : m), today)
  const latest = over.reduce((m, o) => (o.span.to > m ? o.span.to : m), earliest)
  const [patternInput, experiments] = overIds.length
    ? await Promise.all([
        loadPatternInput(userId, new Date(`${addDay(earliest, -LOOKBACK_DAYS)}T00:00:00Z`)).catch(() => null),
        finishedExperimentsBetween(userId, earliest, latest).catch(() => []),
      ])
    : [null, []]
  const [eraPromises, stayed] = overIds.length
    ? await Promise.all([
        prisma.eraPromise.findMany({
          where: { user_id: userId, era_id: { in: overIds } },
          select: { era_id: true, local_day: true, kept: true },
        }),
        // Retired ones too: what was carried forward stays true.
        prisma.practice.findMany({
          where: { user_id: userId, from_era_id: { in: overIds } },
          select: { label: true, from_era_id: true },
          orderBy: { created_at: 'asc' },
        }),
      ])
    : [[], []]
  const eraRecords = over
    .map(({ e, span }) => buildEraRecord({
      id: e.id,
      title: eraName(e.title),
      startDay: e.start_day,
      endDay: span.to,
      lengthDays: e.length_days,
      daysRun: daysBetween(e.start_day, span.to) + 1,
      promises: eraPromises
        .filter(p => p.era_id === e.id)
        .map(p => ({ day: daysBetween(e.start_day, p.local_day) + 1, kept: p.kept })),
      stayed: stayed.filter(s => s.from_era_id === e.id).map(s => s.label),
      reflection: e.reflection,
      laws: patternInput ? lawsLearned(patternInput, e.start_day, span.to) : [],
      experiments: experiments
        .filter(x => x.startDay >= e.start_day && x.startDay <= span.to)
        .map(x => ({ title: x.title, verdict: x.result.verdict, line: x.result.line })),
    }))
    .sort((a, b) => (a.endDay < b.endDay ? 1 : -1))

  return { year: grid, years, details, today, eras: eraRecords }
}

/**
 * Which era a day fell inside, for a day with no promise to point at one.
 * Practices and exercises carry no era, so this is how a training-only day
 * still says "Locked In · Day 4".
 */
function eraForDay(
  eras: { id: string; title: string; era_key: string; start_day: string; length_days: number; ended_at: Date | null }[],
  day: string,
  tz: string | null,
) {
  return eras.find(e => {
    const lastPlanned = addDays(e.start_day, e.length_days - 1)
    const endedDay = e.ended_at ? localDay(tz, e.ended_at) : null
    const to = endedDay && endedDay < lastPlanned ? endedDay : lastPlanned
    return day >= e.start_day && day <= to
  }) ?? null
}

/** `day` plus n calendar days. */
function addDays(day: string, n: number): string {
  let out = day
  for (let i = 0; i < n; i++) out = nextDay(out)
  return out
}

/**
 * The days in [from, to] with anything kept on them — the same rule as a
 * filled dot on /proof (keptCount > 0): a kept promise, a practice done (its
 * minimum counts), or a finished exercise. Three narrow reads of local_day
 * only; the share card needs the count, not the year.
 */
export async function loadProofDaysBetween(userId: string, from: string, to: string): Promise<Set<string>> {
  const window = { user_id: userId, local_day: { gte: from, lte: to } }
  const [promises, practices, exercises] = await Promise.all([
    prisma.eraPromise.findMany({ where: { ...window, kept: true }, select: { local_day: true } }),
    prisma.practiceLog.findMany({ where: { ...window, done: true }, select: { local_day: true } }),
    prisma.exerciseRun.findMany({ where: { ...window, completed: true }, select: { local_day: true } }),
  ])
  return new Set([...promises, ...practices, ...exercises].map(r => r.local_day))
}
