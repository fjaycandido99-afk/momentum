import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { detectCrisisLevel, detectRegion, crisisResourceForLevel } from '@/lib/ai/crisis-detect'
import {
  CUSTOM_ERA_KEY,
  DEFAULT_ERA_LENGTH_DAYS,
  ERA_LIMITS,
  ERA_PRESETS_BY_KEY,
} from './presets'
import {
  CHECK_IN_FROM_HOUR,
  computeStats,
  daysBetween,
  eraDayNumber,
  eraStep,
  previousDay,
  type EraStats,
  type EraStep,
} from './logic'
import { formatEraChatBlock, generatePromiseReply } from './coach'

/**
 * Server-side Era operations. The rules live in logic.ts; this file only
 * loads rows, calls those rules, and writes.
 *
 * Everything is free on every tier. The era and the promise are the habit
 * the rest of the app is sold on, and a paywall in front of a habit loop just
 * means the loop never forms. The coach's reply is one short Groq call.
 */

export type CrisisContent = NonNullable<ReturnType<typeof crisisResourceForLevel>>

async function userTimezone(userId: string): Promise<string | null> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { user_id: userId },
    select: { timezone: true },
  })
  return prefs?.timezone ?? null
}

/** The user's local hour, 0–23. Falls back to UTC for a missing or bad zone. */
export function localHour(timezone: string | null, date = new Date()): number {
  try {
    const h = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(date)
    return Number(h) % 24
  } catch {
    return date.getUTCHours()
  }
}

function clean(text: unknown, max: number): string {
  return typeof text === 'string' ? text.trim().replace(/\s+/g, ' ').slice(0, max) : ''
}

export async function getActiveEra(userId: string) {
  return prisma.era.findFirst({
    where: { user_id: userId, status: 'active' },
    orderBy: { created_at: 'desc' },
  })
}

// ─── Read ────────────────────────────────────────────────────────────────────

export interface EraDayWire {
  day: number
  localDay: string
  kept: boolean | null
}

export interface EraTodayWire {
  id: string
  key: string
  title: string
  change: string
  why: string | null
  startDay: string
  lengthDays: number
  day: number
  step: EraStep
  stats: EraStats
  /** True from CHECK_IN_FROM_HOUR local time — the card asks plainly then. */
  checkInOpen: boolean
  today: { text: string; coachReply: string | null; kept: boolean | null } | null
  yesterday: { text: string; kept: boolean | null } | null
  promiseHint: string
  /** Every day with a promise, oldest first — the page draws the 30-day grid from it. */
  days: EraDayWire[]
}

export async function loadEraToday(userId: string): Promise<EraTodayWire | null> {
  const era = await getActiveEra(userId)
  if (!era) return null

  const tz = await userTimezone(userId)
  const today = localDay(tz)
  const yesterday = previousDay(today)

  const promises = await prisma.eraPromise.findMany({
    where: { era_id: era.id },
    select: { local_day: true, text: true, coach_reply: true, kept: true },
    orderBy: { local_day: 'asc' },
  })

  const todayRow = promises.find(p => p.local_day === today) ?? null
  const yesterdayRow = promises.find(p => p.local_day === yesterday) ?? null
  const preset = ERA_PRESETS_BY_KEY.get(era.era_key)

  return {
    id: era.id,
    key: era.era_key,
    title: era.title,
    change: era.change,
    why: era.why,
    startDay: era.start_day,
    lengthDays: era.length_days,
    // Capped so a finished era reads "Day 30 / 30", never "Day 31 / 30".
    day: Math.min(eraDayNumber(era.start_day, today), era.length_days),
    step: eraStep({
      startDay: era.start_day,
      lengthDays: era.length_days,
      today,
      todayPromise: todayRow,
      yesterdayPromise: yesterdayRow,
    }),
    stats: computeStats(promises, today),
    checkInOpen: localHour(tz) >= CHECK_IN_FROM_HOUR,
    today: todayRow ? { text: todayRow.text, coachReply: todayRow.coach_reply, kept: todayRow.kept } : null,
    yesterday: yesterdayRow ? { text: yesterdayRow.text, kept: yesterdayRow.kept } : null,
    promiseHint: preset?.promiseHint ?? "I'll do the one thing I keep putting off.",
    days: promises
      .filter(p => daysBetween(era.start_day, p.local_day) >= 0)
      .map(p => ({ day: eraDayNumber(era.start_day, p.local_day), localDay: p.local_day, kept: p.kept })),
  }
}

/**
 * The era block for the coach chat's system prompt, or '' when there's no
 * era running (or it has finished). Never throws — a chat reply is worth more
 * than this context.
 */
export async function buildEraChatContext(userId: string): Promise<string> {
  try {
    const era = await loadEraToday(userId)
    if (!era || era.step === 'complete') return ''
    return formatEraChatBlock({
      eraTitle: era.title,
      day: era.day,
      lengthDays: era.lengthDays,
      change: era.change,
      why: era.why,
      stats: era.stats,
      todayPromise: era.today ? { text: era.today.text, kept: era.today.kept } : null,
    })
  } catch (err) {
    console.warn('[era] chat context failed:', err)
    return ''
  }
}

// ─── Start / end ─────────────────────────────────────────────────────────────

export type StartEraResult =
  | { ok: true; crisis: CrisisContent | null }
  | { ok: false; error: string }

export async function startEra(
  userId: string,
  input: { key: unknown; title?: unknown; change: unknown; why?: unknown },
): Promise<StartEraResult> {
  const key = typeof input.key === 'string' ? input.key : ''
  const preset = ERA_PRESETS_BY_KEY.get(key)
  if (!preset && key !== CUSTOM_ERA_KEY) return { ok: false, error: 'Unknown era' }

  const title = preset ? preset.title : clean(input.title, ERA_LIMITS.title)
  if (!title) return { ok: false, error: 'Give your era a name' }

  const change = clean(input.change, ERA_LIMITS.change)
  if (!change) return { ok: false, error: 'Tell your coach what you want to change' }
  const why = clean(input.why, ERA_LIMITS.why) || null

  const tz = await userTimezone(userId)

  // One active era at a time. Ending the old one and creating the new one in
  // a single transaction means a double-tap can't leave two running.
  await prisma.$transaction([
    prisma.era.updateMany({
      where: { user_id: userId, status: 'active' },
      data: { status: 'ended', ended_at: new Date() },
    }),
    prisma.era.create({
      data: {
        user_id: userId,
        era_key: preset ? preset.key : CUSTOM_ERA_KEY,
        title,
        change,
        why,
        length_days: DEFAULT_ERA_LENGTH_DAYS,
        start_day: localDay(tz),
      },
    }),
  ])

  // "Heartbreak" and "comeback" goals can carry real distress. Nothing about
  // starting the era changes, but the resources are shown if the words call
  // for them.
  const level = detectCrisisLevel(`${change} ${why ?? ''}`)
  return { ok: true, crisis: crisisResourceForLevel(level, detectRegion(tz)) }
}

/** Ends the active era early. The row and its promises are kept, never deleted. */
export async function endEra(userId: string): Promise<boolean> {
  const { count } = await prisma.era.updateMany({
    where: { user_id: userId, status: 'active' },
    data: { status: 'ended', ended_at: new Date() },
  })
  return count > 0
}

// ─── Promise + check-in ──────────────────────────────────────────────────────

export type PromiseResult =
  | { ok: true; coachReply: string; crisis: CrisisContent | null }
  | { ok: false; error: string; status: number }

export async function makePromise(
  userId: string,
  input: { text: unknown; source?: unknown },
): Promise<PromiseResult> {
  const text = clean(input.text, ERA_LIMITS.promise)
  if (!text) return { ok: false, error: 'Say what you promise yourself today', status: 400 }
  const source = input.source === 'spoken' ? 'spoken' : 'typed'

  const era = await getActiveEra(userId)
  if (!era) return { ok: false, error: 'No active era', status: 404 }

  const tz = await userTimezone(userId)
  const today = localDay(tz)
  const day = eraDayNumber(era.start_day, today)
  if (day > era.length_days) return { ok: false, error: 'This era is complete', status: 409 }

  const promises = await prisma.eraPromise.findMany({
    where: { era_id: era.id },
    select: { local_day: true, kept: true },
  })
  // Stats as of before today's promise: the coach answers what they have
  // done, not the promise they are making right now.
  const stats = computeStats(promises.filter(p => p.local_day !== today), today)
  const y = promises.find(p => p.local_day === previousDay(today))
  const yesterday = !y ? null : y.kept === null ? 'unanswered' : y.kept ? 'kept' : 'broken'

  const level = detectCrisisLevel(text)
  const crisis = crisisResourceForLevel(level, detectRegion(tz))

  // On crisis language, skip the model entirely. A motivational one-liner
  // is the wrong answer to it, and the resources carry the reply.
  const [mindset, prefs] = await Promise.all([
    getUserMindset(userId),
    prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { guide_tone: true } }),
  ])
  const coachReply = crisis
    ? "Thank you for telling me. Today, the only promise that matters is looking after yourself — and you don't have to do that alone."
    : await generatePromiseReply(
        {
          eraTitle: era.title,
          day,
          lengthDays: era.length_days,
          change: era.change,
          why: era.why,
          promise: text,
          stats,
          yesterday,
        },
        mindset,
        prefs?.guide_tone ?? null,
        userId,
      )

  // Re-promising the same day replaces the text and the reply but never a
  // check-in that has already been answered.
  await prisma.eraPromise.upsert({
    where: { era_id_local_day: { era_id: era.id, local_day: today } },
    create: { era_id: era.id, user_id: userId, local_day: today, text, source, coach_reply: coachReply },
    update: { text, source, coach_reply: coachReply },
  })

  return { ok: true, coachReply, crisis }
}

export async function checkPromise(
  userId: string,
  input: { which: unknown; kept: unknown },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (typeof input.kept !== 'boolean') return { ok: false, error: 'kept must be true or false', status: 400 }
  if (input.which !== 'today' && input.which !== 'yesterday') {
    return { ok: false, error: 'which must be today or yesterday', status: 400 }
  }

  const era = await getActiveEra(userId)
  if (!era) return { ok: false, error: 'No active era', status: 404 }

  const tz = await userTimezone(userId)
  const today = localDay(tz)
  const target = input.which === 'today' ? today : previousDay(today)

  const { count } = await prisma.eraPromise.updateMany({
    where: { era_id: era.id, local_day: target },
    data: { kept: input.kept, checked_at: new Date() },
  })
  if (count === 0) return { ok: false, error: 'No promise for that day', status: 404 }
  return { ok: true }
}
