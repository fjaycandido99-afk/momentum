import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { PRESETS_BY_KEY } from '@/lib/practices/presets'
import {
  disciplineSurvival, disciplineTypes, eraInsights, featureBeforeRetention, guidedDays,
  notificationOpens, promiseTiming, retention,
  type DisciplineRow, type EarlyUser, type EraRow, type PromiseFact, type UserDays,
} from './growth'
import { experimentUse, lessonUse, openerFunnel, voiceGuideUse, widgetUse } from './new-features'

/**
 * Loads the founder's Growth & patterns view. EVERY select below names its
 * columns, and none is a text field someone wrote: ids, days, booleans,
 * timestamps, categories (era key, preset key, notification type). Promise
 * and journal words never leave the database (lib/patterns has the same
 * rule; the privacy policy depends on it).
 *
 * On demand only — an admin opening the page. Never polled.
 */

/** Features counted in someone's first three days. */
export const EARLY_FEATURES = ['era', 'promise kept', 'discipline', 'guided session', 'exercise', 'journal', 'Right now'] as const

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function localHour(tz: string | null, at: Date): number {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz || 'UTC', hour: 'numeric', hourCycle: 'h23' }).format(at)) % 24
  } catch {
    return at.getUTCHours()
  }
}

export async function loadGrowth() {
  const patternsSince = new Date(Date.now() - 90 * 86400000)
  const [users, prefs, eras, promises, practices, logs, exercises, audio, resets, journals, sends, opens, taps] = await Promise.all([
    prisma.user.findMany({ select: { id: true, created_at: true } }),
    prisma.userPreferences.findMany({ select: { user_id: true, timezone: true } }),
    prisma.era.findMany({ select: { id: true, user_id: true, start_day: true, length_days: true, status: true, ended_at: true } }),
    prisma.eraPromise.findMany({ select: { user_id: true, era_id: true, local_day: true, kept: true, created_at: true } }),
    prisma.practice.findMany({ select: { id: true, user_id: true, preset_key: true, created_at: true } }),
    prisma.practiceLog.findMany({ select: { user_id: true, practice_id: true, local_day: true, done: true } }),
    prisma.exerciseRun.findMany({ where: { completed: true }, select: { user_id: true, local_day: true } }),
    prisma.audioSession.findMany({ select: { user_id: true, kind: true, completed: true, local_day: true } }),
    prisma.resetSession.findMany({ where: { completed: true }, select: { user_id: true, local_day: true } }),
    // Presence only: WHETHER a journal entry exists that day — never its words.
    prisma.dailyGuide.findMany({
      where: { OR: [{ journal_freetext: { not: null } }, { journal_win: { not: null } }, { journal_gratitude: { not: null } }] },
      select: { user_id: true, date: true },
    }),
    prisma.notificationSendLog.findMany({ where: { sent_at: { gte: patternsSince } }, select: { user_id: true, type: true, sent_at: true } }),
    prisma.featureEvent.findMany({
      where: { feature: 'notification', action: 'open', created_at: { gte: patternsSince } },
      select: { user_id: true, metadata: true },
    }),
    // Any tracked tap: opening the app and using it counts as coming back,
    // even on a day that left no record (listening, browsing). Time only.
    prisma.featureEvent.findMany({ select: { user_id: true, created_at: true } }),
  ])

  const tzOf = new Map(prefs.map(p => [p.user_id, p.timezone]))
  const today = localDay(null)
  const joinedOf = new Map(users.map(u => [u.id, localDay(tzOf.get(u.id) ?? null, u.created_at)]))

  // Every day each person did something on the record.
  const active = new Map<string, Set<string>>()
  const mark = (u: string, d: string) => {
    if (!active.has(u)) active.set(u, new Set())
    active.get(u)!.add(d)
  }
  for (const r of promises) mark(r.user_id, r.local_day)
  for (const r of logs) mark(r.user_id, r.local_day)
  for (const r of exercises) mark(r.user_id, r.local_day)
  for (const r of audio) mark(r.user_id, r.local_day)
  for (const r of resets) mark(r.user_id, r.local_day)
  for (const r of journals) mark(r.user_id, r.date.toISOString().slice(0, 10))
  for (const t of taps) mark(t.user_id, localDay(tzOf.get(t.user_id) ?? null, t.created_at))

  const userDays: UserDays[] = users.map(u => ({ id: u.id, joined: joinedOf.get(u.id)!, active: active.get(u.id) ?? new Set() }))

  // Eras.
  const promiseDaysByEra = new Map<string, number[]>()
  const eraById = new Map(eras.map(e => [e.id, e]))
  for (const p of promises) {
    const e = p.era_id ? eraById.get(p.era_id) : null
    if (!e) continue
    const n = Math.round((Date.parse(`${p.local_day}T00:00:00Z`) - Date.parse(`${e.start_day}T00:00:00Z`)) / 86400000) + 1
    if (!promiseDaysByEra.has(e.id)) promiseDaysByEra.set(e.id, [])
    promiseDaysByEra.get(e.id)!.push(n)
  }
  const eraRows: EraRow[] = eras.map(e => {
    const plannedEnd = addDays(e.start_day, e.length_days - 1)
    const endedDay = e.ended_at ? localDay(tzOf.get(e.user_id) ?? null, e.ended_at) : null
    const endDay = endedDay && endedDay < plannedEnd ? endedDay : plannedEnd
    return {
      userId: e.user_id, startDay: e.start_day, lengthDays: e.length_days, endDay,
      over: e.status === 'ended' || plannedEnd < today,
      promiseDays: promiseDaysByEra.get(e.id) ?? [],
    }
  })

  // Disciplines.
  const keptByPractice = new Map<string, string[]>()
  for (const l of logs) if (l.done) {
    if (!keptByPractice.has(l.practice_id)) keptByPractice.set(l.practice_id, [])
    keptByPractice.get(l.practice_id)!.push(l.local_day)
  }
  const disciplineRows: DisciplineRow[] = practices.map(p => ({
    userId: p.user_id,
    createdDay: localDay(tzOf.get(p.user_id) ?? null, p.created_at),
    keptDays: keptByPractice.get(p.id) ?? [],
  }))

  // First three days: what each person used, and whether they stayed (day 7+).
  const early = new Map<string, Set<string>>()
  const use = (u: string, d: string, f: string) => {
    const j = joinedOf.get(u)
    if (!j || d < j || d > addDays(j, 2)) return
    if (!early.has(u)) early.set(u, new Set())
    early.get(u)!.add(f)
  }
  for (const e of eras) use(e.user_id, e.start_day, 'era')
  for (const p of promises) if (p.kept) use(p.user_id, p.local_day, 'promise kept')
  for (const l of logs) use(l.user_id, l.local_day, 'discipline')
  for (const a of audio) if (a.kind === 'guide' && a.completed) use(a.user_id, a.local_day, 'guided session')
  for (const x of exercises) use(x.user_id, x.local_day, 'exercise')
  for (const j of journals) use(j.user_id, j.date.toISOString().slice(0, 10), 'journal')
  for (const r of resets) use(r.user_id, r.local_day, 'Right now')
  const earlyUsers: EarlyUser[] = userDays
    .filter(u => addDays(u.joined, 7) <= today)
    .map(u => ({ id: u.id, early: early.get(u.id) ?? new Set(), stayed: [...u.active].some(d => d >= addDays(u.joined, 7)) }))

  // Patterns across everyone (last 90 days).
  const sinceDay = patternsSince.toISOString().slice(0, 10)
  const facts: PromiseFact[] = promises
    .filter(p => p.kept !== null && p.local_day >= sinceDay)
    .map(p => ({ userId: p.user_id, day: p.local_day, hour: localHour(tzOf.get(p.user_id) ?? null, p.created_at), kept: p.kept === true }))
  const guided = new Set(audio.filter(a => a.kind === 'guide' && a.completed).map(a => `${a.user_id}|${a.local_day}`))
  const domainOf = new Map(practices.map(p => [p.id, PRESETS_BY_KEY.get(p.preset_key)?.domain ?? 'custom']))
  const typeLogs = logs
    .filter(l => l.local_day >= sinceDay)
    .map(l => ({ userId: l.user_id, domain: domainOf.get(l.practice_id) ?? 'custom', kept: l.done }))

  // What shipped recently: the opener, Voxu Guide, lessons, experiments,
  // relic notes. Categories and ids only — a relic note's WORDS are never
  // selected, only that one exists.
  const [recentEvents, experimentRows, noteRows] = await Promise.all([
    prisma.featureEvent.findMany({
      where: { feature: { in: ['first_launch', 'voice_guide', 'psychology', 'widget'] } },
      select: { user_id: true, feature: true, action: true, metadata: true },
    }),
    prisma.patternExperiment.findMany({ select: { user_id: true, kind: true, status: true } }),
    prisma.userAchievement.findMany({ where: { note: { not: null } }, select: { user_id: true } }),
  ])
  const ev = recentEvents.map(e => ({ userId: e.user_id, feature: e.feature, action: e.action, metadata: e.metadata }))

  return {
    generatedFor: today,
    newFeatures: {
      opener: openerFunnel(ev),
      voice: voiceGuideUse(ev),
      widget: widgetUse(ev),
      lessons: lessonUse(ev),
      experiments: experimentUse(experimentRows.map(x => ({ userId: x.user_id, kind: x.kind, status: x.status }))),
      relicNotes: { people: new Set(noteRows.map(n => n.user_id)).size, notes: noteRows.length },
    },
    people: users.length,
    retention: retention(userDays, today),
    eras: eraInsights(eraRows),
    disciplines: disciplineSurvival(disciplineRows, today),
    beforeStaying: featureBeforeRetention(earlyUsers, EARLY_FEATURES),
    notifications: notificationOpens(
      sends.map(s => ({ userId: s.user_id, type: s.type, hour: localHour(tzOf.get(s.user_id) ?? null, s.sent_at) })),
      opens.map(o => ({ userId: o.user_id, type: o.metadata ?? 'unknown' })),
    ),
    patterns: {
      timing: promiseTiming(facts),
      guided: guidedDays(facts, guided),
      disciplineTypes: disciplineTypes(typeLogs),
    },
  }
}

export type GrowthData = Awaited<ReturnType<typeof loadGrowth>>
