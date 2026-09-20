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
  eraStage,
  eraStep,
  missionForDay,
  previousDay,
  type EraStageKey,
  type EraStats,
  type EraStep,
} from './logic'
import { formatEraChatBlock, generatePromiseReply, generateRecap, isMemoryLockedToday } from './coach'
import { isPremiumUser } from '@/lib/subscription-check'
import { awardEraXPOnce, ERA_COMPLETE_MIN_PROMISES, type AwardedAchievement } from '@/lib/achievements-server'
import { programFor } from './programs'
import { alignmentLine, computeAlignment, type EraAlignment } from './alignment'
import type { AxisId } from '@/lib/assessment/axes'
import { ERA_MISSIONS } from './missions'
import { loadPatterns } from '@/lib/patterns/server'
import { coachPatternLine, weakDayLine } from '@/lib/patterns/rules'

function missionFor(eraKey: string, day: number): string | null {
  return missionForDay(ERA_MISSIONS[eraKey] ?? ERA_MISSIONS.custom, day)
}

/**
 * One line about their own record for the coach to quote (lib/patterns), or
 * null. Never worth failing a promise over: a reply without it is the normal
 * reply.
 *
 * On a weekday they usually slip, that comes FIRST: shrinking today's ask
 * before the miss is worth more than any other statistic we could say.
 */
export async function patternLineFor(userId: string, weekday?: number): Promise<string | null> {
  try {
    const report = await loadPatterns(userId)
    return (weekday === undefined ? null : weakDayLine(report, weekday))
      ?? coachPatternLine(report)
  } catch (err) {
    console.warn('[era] pattern line unavailable:', err)
    return null
  }
}

/** Weekday (0=Sun) of a YYYY-MM-DD, by date arithmetic, not by timezone. */
function weekdayOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return 0
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * Server-side Era operations. The rules live in logic.ts; this file only
 * loads rows, calls those rules, and writes.
 *
 * The loop itself — era, promise, mission, check-in, streak — is free on
 * every tier: a paywall in front of a habit means the habit never forms.
 * Premium is the depth: the coach quoting your day-1 words on every callback
 * day (free gets day 1 and day 7), spoken replies beyond the daily one, and
 * the Era Recap at the end.
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
  /** Where in the 30 days they are, and the card's line for it. */
  stage: { key: EraStageKey; label: string; line: string }
  /** Today's mission from the era's bank (lib/era/missions.ts). */
  mission: string | null
  /** App content this era leans on (lib/era/programs.ts). */
  links: { soundscapeId: string; guideId: string }
  /** Hero art, or null to render the hero text-only. */
  image: string | null
  /** Premium drives the memory taste, the voice taste and the recap. */
  isPremium: boolean
  /**
   * Today is a day the coach would have quoted their day-1 words back —
   * and doesn't, because they're on free. The card shows the upsell then.
   */
  memoryLockedToday: boolean
  /** The Era Recap, once written (premium, finished eras). */
  recap: string | null
  /**
   * Is the Daily Read moving toward who this era is about? Null for eras
   * without a read target (custom). See lib/era/alignment.
   */
  alignment: EraAlignment | null
  /** The wake-up call's settings (lib/era/wake.ts), for the home chip. */
  wakeCall: { enabled: boolean; time: string | null }
  /** Every day with a promise, oldest first — the page draws the 30-day grid from it. */
  days: EraDayWire[]
}

export async function loadEraToday(userId: string): Promise<EraTodayWire | null> {
  const era = await getActiveEra(userId)
  if (!era) return null

  const prefs = await prisma.userPreferences.findUnique({
    where: { user_id: userId },
    select: { timezone: true, wake_call_enabled: true, wake_call_time: true },
  })
  const tz = prefs?.timezone ?? null
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
  const premium = await isPremiumUser(userId).catch(() => false)
  const yesterdayOutcome = !yesterdayRow ? null : yesterdayRow.kept === null ? 'unanswered' : yesterdayRow.kept ? 'kept' : 'broken'
  const day = Math.min(eraDayNumber(era.start_day, today), era.length_days)
  const stage = eraStage(day, era.length_days)
  const program = programFor(era.era_key)
  const target = program.readTarget
  const alignment = target
    ? computeAlignment(
        target,
        (await prisma.assessmentAnswer.findMany({
          where: { user_id: userId, axis: target.axis },
          select: { axis: true, direction: true, score: true, local_day: true },
        })).map(a => ({ ...a, axis: a.axis as AxisId, direction: (a.direction >= 0 ? 1 : -1) as 1 | -1 })),
        era.start_day,
      )
    : null

  return {
    id: era.id,
    key: era.era_key,
    title: era.title,
    change: era.change,
    why: era.why,
    startDay: era.start_day,
    lengthDays: era.length_days,
    // Capped so a finished era reads "Day 30 / 30", never "Day 31 / 30".
    day,
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
    stage: { key: stage.key, label: stage.label, line: stage.line },
    mission: missionFor(era.era_key, day),
    links: { soundscapeId: program.soundscapeId, guideId: program.guideId },
    image: program.image ?? null,
    isPremium: premium,
    memoryLockedToday: isMemoryLockedToday(day, era.length_days, yesterdayOutcome, premium),
    recap: era.recap ?? null,
    alignment,
    wakeCall: { enabled: prefs?.wake_call_enabled ?? false, time: prefs?.wake_call_time ?? null },
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
      stageLabel: era.stage.label,
      mission: era.mission,
      coachFocus: programFor(era.key).coachFocus,
      fullMemory: era.isPremium,
      alignment: era.alignment && era.alignment.status !== 'early' ? alignmentLine(era.alignment) : null,
    })
  } catch (err) {
    console.warn('[era] chat context failed:', err)
    return ''
  }
}

// ─── Start / end ─────────────────────────────────────────────────────────────

export type StartEraResult =
  | {
      ok: true
      crisis: CrisisContent | null
      newAchievements: AwardedAchievement[]
      /**
       * Whose link this era started from, when it's a new credit. The route
       * tells them someone joined — done there, not here, so this file
       * doesn't have to import the push service that imports it.
       */
      referredBy: string | null
    }
  | { ok: false; error: string }

export async function startEra(
  userId: string,
  input: { key: unknown; title?: unknown; change: unknown; why?: unknown; ref?: unknown },
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
  const [, created] = await prisma.$transaction([
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
  const newAchievements = await awardEraXPOnce(userId, 'eraStart', created.id)
  const referredBy = await recordReferral(userId, created.id, created.era_key, input.ref)
  return { ok: true, crisis: crisisResourceForLevel(level, detectRegion(tz)), newAchievements, referredBy }
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
  | { ok: true; coachReply: string; crisis: CrisisContent | null; newAchievements: AwardedAchievement[] }
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
          coachFocus: programFor(era.era_key).coachFocus,
          stageNote: eraStage(day, era.length_days).coachNote,
          mission: missionFor(era.era_key, day),
          fullMemory: await isPremiumUser(userId).catch(() => false),
          patternLine: await patternLineFor(userId, weekdayOf(today)),
        },
        mindset,
        prefs?.guide_tone ?? null,
        userId,
      )

  // Re-promising the same day replaces the text and the reply but never a
  // check-in that has already been answered.
  const row = await prisma.eraPromise.upsert({
    where: { era_id_local_day: { era_id: era.id, local_day: today } },
    create: { era_id: era.id, user_id: userId, local_day: today, text, source, coach_reply: coachReply },
    update: { text, source, coach_reply: coachReply },
    select: { id: true },
  })

  // Paid once per promise: rewording today's promise doesn't pay again.
  const newAchievements = await awardEraXPOnce(userId, 'eraPromise', row.id)
  return { ok: true, coachReply, crisis, newAchievements }
}

export async function checkPromise(
  userId: string,
  input: { which: unknown; kept: unknown },
): Promise<{ ok: true; newAchievements: AwardedAchievement[] } | { ok: false; error: string; status: number }> {
  if (typeof input.kept !== 'boolean') return { ok: false, error: 'kept must be true or false', status: 400 }
  if (input.which !== 'today' && input.which !== 'yesterday') {
    return { ok: false, error: 'which must be today or yesterday', status: 400 }
  }

  const era = await getActiveEra(userId)
  if (!era) return { ok: false, error: 'No active era', status: 404 }

  const tz = await userTimezone(userId)
  const today = localDay(tz)
  const target = input.which === 'today' ? today : previousDay(today)

  const row = await prisma.eraPromise.findUnique({
    where: { era_id_local_day: { era_id: era.id, local_day: target } },
    select: { id: true },
  })
  if (!row) return { ok: false, error: 'No promise for that day', status: 404 }
  await prisma.eraPromise.update({
    where: { id: row.id },
    data: { kept: input.kept, checked_at: new Date() },
  })

  // Kept → paid once for that promise, so flipping the answer can't farm it.
  const newAchievements = input.kept ? await awardEraXPOnce(userId, 'eraKept', row.id) : []
  return { ok: true, newAchievements }
}

// ─── Era Recap ───────────────────────────────────────────────────────────────

export type RecapResult =
  | { ok: true; recap: string }
  | { ok: false; error: string; status: number; locked?: boolean }

/**
 * The Era Recap for the active, finished era — premium. Written by the model
 * the first time it's asked for and stored on the row, so it reads the same
 * every time and costs one call per era.
 */
export async function getEraRecap(userId: string): Promise<RecapResult> {
  const era = await getActiveEra(userId)
  if (!era) return { ok: false, error: 'No era', status: 404 }

  const tz = await userTimezone(userId)
  const today = localDay(tz)
  if (eraDayNumber(era.start_day, today) <= era.length_days) {
    return { ok: false, error: 'The recap unlocks when the era is finished', status: 409 }
  }
  if (era.recap) return { ok: true, recap: era.recap }

  if (!(await isPremiumUser(userId).catch(() => false))) {
    return { ok: false, error: 'The Era Recap is a Premium feature', status: 403, locked: true }
  }

  const promises = await prisma.eraPromise.findMany({
    where: { era_id: era.id },
    select: { local_day: true, text: true, kept: true },
    orderBy: { local_day: 'asc' },
  })
  const [mindset, prefs] = await Promise.all([
    getUserMindset(userId),
    prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { guide_tone: true } }),
  ])
  const recap = await generateRecap(
    {
      eraTitle: era.title,
      lengthDays: era.length_days,
      change: era.change,
      why: era.why,
      stats: computeStats(promises, today),
      promises: promises
        .filter(p => daysBetween(era.start_day, p.local_day) >= 0)
        .map(p => ({ day: eraDayNumber(era.start_day, p.local_day), text: p.text, kept: p.kept })),
      // "You started this era answering like someone who follows the day…"
      // — only when the Daily Read had enough to say.
      alignment: await loadEraToday(userId)
        .then(e => (e?.alignment && e.alignment.status !== 'early' ? alignmentLine(e.alignment) : null))
        .catch(() => null),
    },
    mindset,
    prefs?.guide_tone ?? null,
    userId,
  )
  if (!recap) return { ok: false, error: "Your coach couldn't write it right now. Try again in a minute.", status: 503 }

  // Only the first writer wins, so a double tap can't produce two letters.
  await prisma.era.updateMany({ where: { id: era.id, recap: null }, data: { recap, recap_at: new Date() } })
  const saved = await prisma.era.findUnique({ where: { id: era.id }, select: { recap: true } })
  return { ok: true, recap: saved?.recap ?? recap }
}

/**
 * Pay out a finished era once — when home first sees it complete. Only an era
 * that was lived counts (ERA_COMPLETE_MIN_PROMISES), matching the achievement.
 */
export async function awardEraCompletionIfDue(userId: string, era: EraTodayWire | null): Promise<AwardedAchievement[]> {
  if (!era || era.step !== 'complete' || era.stats.made < ERA_COMPLETE_MIN_PROMISES) return []
  return awardEraXPOnce(userId, 'eraComplete', era.id)
}

/**
 * The Daily Read axis to lean on while this user's era runs, or null. The
 * Daily Read routes pass it to nextItemFor so an era gathers enough answers
 * on its own axis to say something (lib/era/alignment).
 */
export async function eraReadFocus(userId: string): Promise<AxisId | null> {
  try {
    const era = await getActiveEra(userId)
    return era ? programFor(era.era_key).readTarget?.axis ?? null : null
  } catch {
    return null
  }
}

/**
 * Credit a "Join this era" link. `ref` is the sharer's era id from the link
 * (?from=). Only counted when it's a real era belonging to someone ELSE —
 * sharing your own link to yourself credits nothing — and at most once per
 * invitee per shared era. Never throws: a bad ref must not stop anyone
 * starting their era.
 *
 * Returns the inviter's user id the FIRST time a link is credited, so they
 * can be told someone joined — and null on a repeat, so they're told once.
 */
async function recordReferral(userId: string, inviteeEraId: string, eraKey: string, ref: unknown): Promise<string | null> {
  if (typeof ref !== 'string' || !ref || ref.length > 64) return null
  try {
    const inviter = await prisma.era.findUnique({ where: { id: ref }, select: { id: true, user_id: true } })
    if (!inviter || inviter.user_id === userId) return null
    const already = await prisma.eraReferral.findUnique({
      where: { invitee_user_id_inviter_era_id: { invitee_user_id: userId, inviter_era_id: inviter.id } },
      select: { id: true },
    })
    await prisma.eraReferral.upsert({
      where: { invitee_user_id_inviter_era_id: { invitee_user_id: userId, inviter_era_id: inviter.id } },
      create: {
        inviter_era_id: inviter.id,
        inviter_user_id: inviter.user_id,
        invitee_user_id: userId,
        invitee_era_id: inviteeEraId,
        era_key: eraKey,
      },
      update: {},
    })
    return already ? null : inviter.user_id
  } catch (err) {
    console.warn('[era] referral not recorded:', err)
    return null
  }
}
