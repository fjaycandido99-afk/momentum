import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import {
  addDays, BASELINE_DAYS, EXPERIMENT_BY_KEY, EXPERIMENT_DAYS, evaluateExperiment, experimentDay,
  type DayFact, type ExperimentResult,
} from './experiments'

interface PromiseRow { local_day: string; created_at: Date; kept: boolean | null; len: number | null }

function localHour(tz: string | null, at: Date): number {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz || 'UTC', hour: 'numeric', hourCycle: 'h23' }).format(at)) % 24
  } catch {
    return at.getUTCHours()
  }
}

/** Each day's facts between two days — times, lengths, outcomes. Never words. */
async function dayFacts(userId: string, tz: string | null, from: string, to: string): Promise<Map<string, DayFact>> {
  const [promises, guides] = await Promise.all([
    // length(text), never text — the same rule as lib/patterns/server.
    prisma.$queryRaw<PromiseRow[]>`
      SELECT local_day, created_at, kept, length(text) AS len
      FROM "EraPromise"
      WHERE user_id = ${userId} AND local_day >= ${from} AND local_day <= ${to}`,
    prisma.audioSession.findMany({
      where: { user_id: userId, kind: 'guide', completed: true, local_day: { gte: from, lte: to } },
      select: { local_day: true, created_at: true },
    }),
  ])
  const firstGuide = new Map<string, number>()
  for (const g of guides) {
    const t = g.created_at.getTime()
    if (!firstGuide.has(g.local_day) || t < firstGuide.get(g.local_day)!) firstGuide.set(g.local_day, t)
  }
  const facts = new Map<string, DayFact>()
  for (const p of promises) {
    facts.set(p.local_day, {
      day: p.local_day,
      promiseHour: localHour(tz, p.created_at),
      promiseLength: p.len ?? 0,
      kept: p.kept,
      promiseAt: p.created_at.getTime(),
      guideAt: firstGuide.get(p.local_day) ?? null,
    })
  }
  return facts
}

export interface ExperimentWire {
  id: string
  key: string
  title: string
  ask: string
  startDay: string
  endDay: string
  status: 'active' | 'done' | 'stopped'
  /** Active only: today's day number, and whether today followed it. */
  day: number | null
  followedToday: boolean | null
  /** Finished only: the verdict against their own previous four weeks. */
  result: ExperimentResult | null
}

async function tzOf(userId: string) {
  const prefs = await prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { timezone: true } })
  return prefs?.timezone ?? null
}

/** Their experiments: the active one (if any) and the finished ones. */
export async function loadExperiments(userId: string): Promise<{ active: ExperimentWire | null; finished: ExperimentWire[] }> {
  const tz = await tzOf(userId)
  const today = localDay(tz)

  // An experiment past its last day is finished — settled on read, no cron.
  await prisma.patternExperiment.updateMany({
    where: { user_id: userId, status: 'active', end_day: { lt: today } },
    data: { status: 'done' },
  })

  const rows = await prisma.patternExperiment.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 6,
  })

  const wires: ExperimentWire[] = []
  for (const r of rows) {
    const def = EXPERIMENT_BY_KEY.get(r.kind as never)
    if (!def) continue
    const base = { id: r.id, key: def.key, title: def.title, ask: def.ask, startDay: r.start_day, endDay: r.end_day, status: r.status as ExperimentWire['status'] }
    if (r.status === 'active') {
      const facts = await dayFacts(userId, tz, today, today)
      const f = facts.get(today)
      wires.push({ ...base, day: experimentDay(r.start_day, today), followedToday: f ? def.followed(f) : false, result: null })
    } else if (r.status === 'done') {
      wires.push({ ...base, day: null, followedToday: null, result: await judge(userId, tz, def, r.start_day, r.end_day) })
    } else {
      wires.push({ ...base, day: null, followedToday: null, result: null })
    }
  }
  return { active: wires.find(w => w.status === 'active') ?? null, finished: wires.filter(w => w.status !== 'active') }
}

async function judge(
  userId: string, tz: string | null,
  def: NonNullable<ReturnType<typeof EXPERIMENT_BY_KEY.get>>, start: string, end: string,
): Promise<ExperimentResult> {
  const facts = await dayFacts(userId, tz, addDays(start, -BASELINE_DAYS), end)
  const during = [...facts.values()].filter(f => f.day >= start && f.day <= end)
  const baseline = [...facts.values()].filter(f => f.day < start)
  return evaluateExperiment(def, during, baseline)
}

export interface FinishedExperiment {
  startDay: string
  endDay: string
  title: string
  result: ExperimentResult
}

/**
 * Every experiment that ran its 7 days and began between two days, with its
 * verdict — for the Era Records. Stopped ones carry no result and are left
 * out; one past its last day counts as finished even before a read settled it.
 */
export async function finishedExperimentsBetween(userId: string, from: string, to: string): Promise<FinishedExperiment[]> {
  const tz = await tzOf(userId)
  const today = localDay(tz)
  const rows = await prisma.patternExperiment.findMany({
    where: { user_id: userId, status: { in: ['active', 'done'] }, start_day: { gte: from, lte: to }, end_day: { lt: today } },
    orderBy: { start_day: 'asc' },
  })
  const out: FinishedExperiment[] = []
  for (const r of rows) {
    const def = EXPERIMENT_BY_KEY.get(r.kind as never)
    if (!def) continue
    out.push({ startDay: r.start_day, endDay: r.end_day, title: def.title, result: await judge(userId, tz, def, r.start_day, r.end_day) })
  }
  return out
}

/** Start one — only one runs at a time, so each result is about one change. */
export async function startExperiment(userId: string, key: unknown): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (typeof key !== 'string' || !EXPERIMENT_BY_KEY.has(key as never)) return { ok: false, reason: 'Unknown experiment' }
  const tz = await tzOf(userId)
  const today = localDay(tz)
  const running = await prisma.patternExperiment.findFirst({ where: { user_id: userId, status: 'active', end_day: { gte: today } } })
  if (running) return { ok: false, reason: 'One experiment at a time — finish or stop the current one first.' }
  await prisma.patternExperiment.create({
    data: { user_id: userId, kind: key, start_day: today, end_day: addDays(today, EXPERIMENT_DAYS - 1) },
  })
  return { ok: true }
}

export async function stopExperiment(userId: string): Promise<void> {
  await prisma.patternExperiment.updateMany({ where: { user_id: userId, status: 'active' }, data: { status: 'stopped' } })
}
