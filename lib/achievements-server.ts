import { prisma } from '@/lib/prisma'
import { XP_REWARDS, type XPEventType, getLevelFromXP } from '@/lib/gamification'
import { checkNewAchievements, type AchievementStats, type EraAchievementStats } from '@/lib/achievements'
import { localDay } from '@/lib/assessment/service'
import { eraDayNumber, previousDay } from '@/lib/era/logic'

/**
 * Server-side XP + achievements. Used by /api/gamification/xp (events the
 * client reports) and by the era routes (events the server itself decides
 * happened — a promise made, a promise kept — so they can't be farmed by
 * calling the XP endpoint in a loop).
 */

/** An era "finishes" only if it was actually lived: 20+ promises made. */
export const ERA_COMPLETE_MIN_PROMISES = 20

export async function gatherEraAchievementStats(userId: string): Promise<EraAchievementStats> {
  const [eras, prefs] = await Promise.all([
    prisma.era.findMany({
      where: { user_id: userId },
      select: {
        era_key: true, start_day: true, length_days: true, status: true, ended_at: true,
        promises: { select: { local_day: true, kept: true }, orderBy: { local_day: 'asc' } },
      },
    }),
    prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { timezone: true } }),
  ])
  const tz = prefs?.timezone ?? null
  const today = localDay(tz)

  const stats: EraAchievementStats = {
    promisesMade: 0, promisesKept: 0, longestPromiseStreak: 0, erasStarted: eras.length,
    erasCompleted: 0, perfectEras: 0, customEras: 0, comebacks: 0,
  }

  for (const era of eras) {
    if (era.era_key === 'custom') stats.customEras++
    const ps = era.promises
    stats.promisesMade += ps.length
    const kept = ps.filter(p => p.kept === true).length
    const answered = ps.filter(p => p.kept !== null).length
    stats.promisesKept += kept

    // Consecutive promise days and comebacks, in calendar order.
    const byDay = new Map(ps.map(p => [p.local_day, p.kept]))
    let run = 0
    let prev: string | null = null
    for (const p of ps) {
      run = prev !== null && previousDay(p.local_day) === prev ? run + 1 : 1
      stats.longestPromiseStreak = Math.max(stats.longestPromiseStreak, run)
      prev = p.local_day
      if (p.kept === true && byDay.get(previousDay(p.local_day)) === false) stats.comebacks++
    }

    // Finished: the era ran past its last day while still being the one in
    // play, and was lived (enough promises), not just left running.
    const endDay = era.status === 'active' ? today : era.ended_at ? localDay(tz, era.ended_at) : today
    const ranItsCourse = eraDayNumber(era.start_day, endDay) > era.length_days
    if (ranItsCourse && ps.length >= ERA_COMPLETE_MIN_PROMISES) {
      stats.erasCompleted++
      if (answered >= ERA_COMPLETE_MIN_PROMISES && kept === answered) stats.perfectEras++
    }
  }
  return stats
}

export interface AwardedAchievement { id: string; title: string; xpReward: number }

/**
 * The user's local hour. Time-of-day achievements (Early Bird, Night Owl,
 * Midnight Owl) used the SERVER's clock — UTC on Vercel — so they unlocked at
 * the wrong hours for nearly everyone. Falls back to UTC for a missing zone.
 */
function userLocalHour(timezone: string | null): number {
  try {
    const h = new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'UTC', hour: 'numeric', hourCycle: 'h23' }).format(new Date())
    return Number(h) % 24
  } catch {
    return new Date().getUTCHours()
  }
}

/**
 * Every stat the achievements read, for one user. Shared by the awarder
 * below and by /api/gamification/status, which shows progress on locked
 * achievements ("Seven Kept · 5/7").
 */
export async function gatherAchievementStats(
  userId: string,
  opts: { totalXP: number; streak: number },
): Promise<AchievementStats> {
  const { current } = getLevelFromXP(opts.totalXP)

  // Count various stats for achievements
  const [journalCount, breathingCount, moduleCount, moodLogCount, routineCount, genreCount, guides, completedGoals, soundscapeEvents, era, tzPrefs] = await Promise.all([
    prisma.dailyGuide.count({
      where: { user_id: userId, OR: [{ journal_freetext: { not: null } }, { journal_win: { not: null } }, { journal_gratitude: { not: null } }] },
    }),
    prisma.xPEvent.count({ where: { user_id: userId, event_type: 'breathingSession' } }),
    prisma.xPEvent.count({ where: { user_id: userId, event_type: 'moduleComplete' } }),
    prisma.dailyGuide.count({
      where: { user_id: userId, OR: [{ mood_before: { not: null } }, { mood_after: { not: null } }] },
    }),
    prisma.routine.count({ where: { user_id: userId } }),
    prisma.dailyGuide.findMany({
      where: { user_id: userId, music_genre_used: { not: null } },
      select: { music_genre_used: true },
      distinct: ['music_genre_used'],
    }),
    prisma.dailyGuide.findMany({
      where: { user_id: userId },
      select: {
        morning_prime_done: true, midday_reset_done: true, wind_down_done: true,
        bedtime_story_done: true, date: true,
      },
      orderBy: { date: 'desc' },
      take: 30,
    }),
    prisma.goal.count({ where: { user_id: userId, status: 'completed' } }),
    prisma.xPEvent.count({ where: { user_id: userId, event_type: 'focusSession' } }),
    gatherEraAchievementStats(userId),
    prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { timezone: true } }),
  ])

  // Full day completions and unique module types
  let fullDayCount = 0
  const moduleTypesSeen = new Set<string>()
  let consecutiveFullDays = 0
  let countingConsecutive = true

  for (const g of guides) {
    const allDone = g.morning_prime_done && g.midday_reset_done && g.wind_down_done && g.bedtime_story_done
    if (allDone) {
      fullDayCount++
      if (countingConsecutive) consecutiveFullDays++
    } else {
      countingConsecutive = false
    }
    if (g.morning_prime_done) moduleTypesSeen.add('morning_prime')
    if (g.midday_reset_done) moduleTypesSeen.add('midday_reset')
    if (g.wind_down_done) moduleTypesSeen.add('wind_down')
    if (g.bedtime_story_done) moduleTypesSeen.add('bedtime_story')
  }

  // Weekend active count
  const weekendActiveCount = guides.filter(g => {
    const day = g.date.getDay()
    return (day === 0 || day === 6) && (g.morning_prime_done || g.midday_reset_done || g.wind_down_done || g.bedtime_story_done)
  }).length

  return {
    streak: opts.streak,
    totalXP: opts.totalXP,
    level: current.level,
    journalCount,
    moodLogCount,
    breathingCount,
    moduleCount,
    fullDayCount,
    weekendActiveCount,
    uniqueGenres: genreCount.length,
    uniqueModuleTypes: moduleTypesSeen.size,
    hasFirstJournal: journalCount > 0,
    hasFirstSoundscape: soundscapeEvents > 0,
    hasFirstRoutine: routineCount > 0,
    hasCompletedGoal: completedGoals > 0,
    hasFirstPathComplete: false,
    pathCompleteCount: 0,
    consecutivePathDays: 0,
    consecutiveVirtueDays: 0,
    currentHour: userLocalHour(tzPrefs?.timezone ?? null),
    consecutiveFullDays,
    era,
  }
}

/** Check every achievement against current stats; insert and pay out new ones. */
export async function evaluateAndAwardAchievements(
  userId: string,
  opts: { totalXP: number; streak: number },
): Promise<{ bonusXP: number; achievements: AwardedAchievement[] }> {
  const existingAchievements = await prisma.userAchievement.findMany({
    where: { user_id: userId },
    select: { achievement_id: true },
  })
  const unlockedIds = new Set(existingAchievements.map(a => a.achievement_id))
  const newAchievements = checkNewAchievements(await gatherAchievementStats(userId, opts), unlockedIds)

  if (newAchievements.length === 0) return { bonusXP: 0, achievements: [] }

  await prisma.$transaction(
    newAchievements.map(a =>
      prisma.userAchievement.create({ data: { user_id: userId, achievement_id: a.id } }),
    ),
  )

  const bonusXP = newAchievements.reduce((sum, a) => sum + a.xpReward, 0)
  if (bonusXP > 0) {
    await prisma.$transaction([
      prisma.xPEvent.create({
        data: {
          user_id: userId,
          event_type: 'achievementBonus',
          xp_amount: bonusXP,
          source: newAchievements.map(a => a.id).join(','),
        },
      }),
      prisma.userPreferences.update({
        where: { user_id: userId },
        data: { total_xp: { increment: bonusXP } },
      }),
    ])
  }

  return {
    bonusXP,
    achievements: newAchievements.map(a => ({ id: a.id, title: a.title, xpReward: a.xpReward })),
  }
}

export interface XPAwardResult {
  xp: number
  totalXP: number
  bonusXP: number
  achievements: AwardedAchievement[]
}

/** Log one XP event, then evaluate achievements. */
export async function awardXP(userId: string, eventType: XPEventType, source?: string | null): Promise<XPAwardResult> {
  const xpAmount = XP_REWARDS[eventType]
  const [, prefs] = await prisma.$transaction([
    prisma.xPEvent.create({
      data: { user_id: userId, event_type: eventType, xp_amount: xpAmount, source: source || null },
    }),
    prisma.userPreferences.upsert({
      where: { user_id: userId },
      update: { total_xp: { increment: xpAmount } },
      create: { user_id: userId, total_xp: xpAmount },
    }),
  ])
  const { bonusXP, achievements } = await evaluateAndAwardAchievements(userId, {
    totalXP: prefs.total_xp,
    streak: prefs.current_streak || 0,
  })
  return { xp: xpAmount, totalXP: prefs.total_xp + bonusXP, bonusXP, achievements }
}

/**
 * The era's server-decided events, each paid at most once per thing it's
 * about (`source` = the era or promise id). Kept → not kept → kept can't be
 * farmed, and a double tap can't double-pay. Never throws: XP is a bonus on
 * top of the action, not a reason for the action to fail.
 */
export async function awardEraXPOnce(
  userId: string,
  eventType: 'eraStart' | 'eraPromise' | 'eraKept' | 'eraComplete',
  source: string,
): Promise<AwardedAchievement[]> {
  try {
    const already = await prisma.xPEvent.findFirst({
      where: { user_id: userId, event_type: eventType, source },
      select: { id: true },
    })
    if (already) return []
    const result = await awardXP(userId, eventType, source)
    return result.achievements
  } catch (err) {
    console.warn(`[era] XP award ${eventType} failed:`, err)
    return []
  }
}
