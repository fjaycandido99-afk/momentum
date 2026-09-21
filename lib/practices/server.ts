import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { previousDay } from '@/lib/era/logic'
import { isBlocker } from '@/lib/era/reasons'
import { MAX_PRACTICES, PRESETS_BY_KEY } from './presets'
import { rotationCue, sessionForDomain } from './cues'
import { cleanPlan, parsePlan, planFor, slotForToday } from './plan'
import { findRecovery, recoveryCopy } from './recovery'
import { exerciseById } from '@/lib/exercises/library'
import {
  adherence,
  cleanPractice,
  currentRun,
  nextDueDay,
  weakestWeekday,
  weekStrip,
  isCleanPractice,
  isDueOn,
  stateOn,
  type PracticeInput,
  type PracticesPayload,
  type PracticeWire,
} from './logic'

// Re-exported so callers have one import site for the loader and its shapes.
export type { PracticeWire, PracticesPayload }

/**
 * Practices, loaded and written.
 *
 * The rules live in lib/practices/logic.ts; this fetches the rows, works out
 * the user's local day, and enforces the cap. Free on every tier.
 */

/** How far back the adherence count looks. Four weeks reads as "lately". */
const WINDOW_DAYS = 28

export async function loadPractices(userId: string): Promise<PracticesPayload> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { user_id: userId },
    select: { timezone: true },
  })
  const today = localDay(prefs?.timezone ?? null)
  const from = windowStart(today)

  const rows = await prisma.practice.findMany({
    where: { user_id: userId, status: 'active' },
    orderBy: { created_at: 'asc' },
    select: {
      id: true, preset_key: true, label: true, days: true, minimum: true, blocker: true, plan: true,
      logs: {
        where: { local_day: { gte: from } },
        select: { local_day: true, done: true, minimum_only: true },
      },
    },
  })

  // Sessions kept over the practice's whole life, not just the window: the
  // rotation has to keep its place after a quiet month.
  const keptCounts = await prisma.practiceLog.groupBy({
    by: ['practice_id'],
    where: { user_id: userId, done: true, practice_id: { in: rows.map(r => r.id) } },
    _count: { _all: true },
  })
  const keptByPractice = new Map(keptCounts.map(k => [k.practice_id, k._count._all]))

  const practices = rows.map(row => {
    const lite = { id: row.id, label: row.label, days: row.days, minimum: row.minimum }
    const logs = row.logs.map(l => ({ day: l.local_day, done: l.done, minimumOnly: l.minimum_only }))
    const counts = adherence(lite, logs, from, today)
    const plan = parsePlan(row.plan)
    const kept = keptByPractice.get(row.id) ?? 0
    const slot = slotForToday({ presetKey: row.preset_key, days: row.days }, today, kept)
    const todaysPlan = planFor(plan, slot)
    // After a missed session: reschedule, not "do double tomorrow".
    const recovery = findRecovery({ ...lite, presetKey: row.preset_key }, logs, today, kept)
    const recoveryWire = recovery
      ? {
          ...recoveryCopy(recovery, { minimum: todaysPlan?.minimum || row.minimum }, isDueOn(lite, today)),
          slotKey: recovery.slotKey,
          slotLabel: recovery.slotLabel,
        }
      : null
    return {
      id: row.id,
      presetKey: row.preset_key,
      label: row.label,
      days: row.days,
      minimum: row.minimum,
      blocker: row.blocker,
      state: stateOn(lite, logs, today),
      done: counts.done,
      of: counts.of,
      run: currentRun(lite, logs, today),
      week: weekStrip(lite, logs, today),
      cue: rotationCue(row.preset_key, kept),
      session: sessionFor(row.preset_key),
      slot,
      todaysPlan,
      plan,
      todaysMinimum: todaysPlan?.minimum || row.minimum,
      recovery: recoveryWire,
      nextDue: nextDueDay(lite, today),
      weakDay: weakestWeekday(lite, logs, from, today),
    }
  })

  return {
    practices,
    today,
    remaining: Math.max(0, MAX_PRACTICES - practices.length),
    max: MAX_PRACTICES,
  }
}

function windowStart(today: string): string {
  let day = today
  for (let i = 0; i < WINDOW_DAYS; i++) day = previousDay(day)
  return day
}

/**
 * The Voxu session that fits a practice, resolved from its preset's domain.
 * Null wherever the app has nothing honest to offer — reading and training,
 * where a suggestion Voxu can't stand behind is worse than silence.
 */
function sessionFor(presetKey: string) {
  const domain = PRESETS_BY_KEY.get(presetKey)?.domain
  const id = domain ? sessionForDomain(domain) : null
  const exercise = id ? exerciseById(id) : null
  return exercise
    ? { exerciseId: exercise.id, title: exercise.title, minutes: exercise.minutes }
    : null
}

export async function createPractice(
  userId: string,
  input: PracticeInput,
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const clean = cleanPractice(input)
  if (!isCleanPractice(clean)) return { ok: false, reason: clean.error }

  const active = await prisma.practice.count({ where: { user_id: userId, status: 'active' } })
  if (active >= MAX_PRACTICES) {
    return { ok: false, reason: `Three at a time. Retire one first.` }
  }

  const created = await prisma.practice.create({
    data: {
      user_id: userId,
      preset_key: clean.presetKey,
      label: clean.label,
      days: clean.days,
      minimum: clean.minimum,
      blocker: isBlocker(input.blocker) ? input.blocker : null,
    },
    select: { id: true },
  })
  return { ok: true, id: created.id }
}

/**
 * Answer for today. `done: false` is a real answer and gets a row — a missed
 * day that leaves no record is a day the app cannot learn anything from.
 */
export async function logPractice(args: {
  userId: string
  practiceId: string
  done: boolean
  minimumOnly?: boolean
  day?: string
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { user_id: args.userId },
    select: { timezone: true },
  })
  const today = localDay(prefs?.timezone ?? null)
  // Yesterday is allowed, for the night that got away. Nothing older: a
  // record edited a week later is not a record.
  const day = args.day === previousDay(today) ? args.day : today

  const practice = await prisma.practice.findFirst({
    where: { id: args.practiceId, user_id: args.userId },
    select: { id: true },
  })
  if (!practice) return { ok: false, reason: 'No such practice' }

  await prisma.practiceLog.upsert({
    where: { practice_id_local_day: { practice_id: practice.id, local_day: day } },
    create: {
      practice_id: practice.id,
      user_id: args.userId,
      local_day: day,
      done: args.done,
      minimum_only: args.done ? !!args.minimumOnly : false,
    },
    update: {
      done: args.done,
      minimum_only: args.done ? !!args.minimumOnly : false,
    },
  })
  return { ok: true }
}

/**
 * Save the plan — what they do on each day of this practice.
 *
 * Their own lines, cleaned (unknown slots dropped, blanks removed, capped in
 * length and number) and stored as-is. Voxu never parses them: "Lat pulldown
 * 4×8" is a note to themselves, and reading it as data is how this would
 * turn into a workout tracker.
 */
export async function savePlan(
  userId: string,
  practiceId: string,
  rawPlan: unknown,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const practice = await prisma.practice.findFirst({
    where: { id: practiceId, user_id: userId },
    select: { id: true, preset_key: true, days: true },
  })
  if (!practice) return { ok: false, reason: 'No such practice' }

  const plan = cleanPlan(rawPlan, { presetKey: practice.preset_key, days: practice.days })
  await prisma.practice.update({
    where: { id: practice.id },
    // An empty plan clears the column rather than storing {}, so "has a
    // plan" stays a simple null check. Prisma needs DbNull for a nullable
    // Json column — a bare null would mean "the JSON value null".
    data: {
      plan: Object.keys(plan).length > 0
        ? (plan as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
    },
  })
  return { ok: true }
}

/**
 * Retiring keeps the logs. The history of a practice someone did for two
 * months is theirs, and deleting it to tidy a list would be data loss.
 */
export async function retirePractice(userId: string, practiceId: string): Promise<{ ok: boolean }> {
  const result = await prisma.practice.updateMany({
    where: { id: practiceId, user_id: userId, status: 'active' },
    data: { status: 'retired', retired_at: new Date() },
  })
  return { ok: result.count > 0 }
}

/**
 * Today's practices for a coach prompt: name, floor, what they planned for
 * today, and whether it's done.
 *
 * The plan is included because it is the most specific true thing the coach
 * can hold someone to — "you wrote squats for today" beats any sentence it
 * could invent. The prompt (lib/era/coach.ts) is told it may use these and
 * must never add to them.
 */
export async function practiceLinesForCoach(userId: string): Promise<string[]> {
  const { practices, today } = await loadPractices(userId)
  return practices
    .filter(p => isDueOn({ id: p.id, label: p.label, days: p.days, minimum: p.minimum }, today))
    .map(p => {
      const items = p.todaysPlan?.items ?? []
      const plan = items.length > 0
        ? `, their own plan for today: ${items.map(i => (i.detail ? `${i.name} (${i.detail})` : i.name)).join(', ')}`
        : ''
      const done = p.state === 'done' || p.state === 'minimum' ? ' (done today)' : ''
      return `${p.label} — minimum ${p.minimum}${plan}${done}`
    })
}
