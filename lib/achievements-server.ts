import { prisma } from '@/lib/prisma'
import { XP_REWARDS, type XPEventType, getLevelFromXP } from '@/lib/gamification'
import {
  checkNewAchievements,
  type AchievementStats,
  type EraAchievementStats,
  type PracticeAchievementStats,
  type RecordAchievementStats,
} from '@/lib/achievements'
import { practiceHistory } from '@/lib/practices/logic'
import { localDay } from '@/lib/assessment/service'
import { daysBetween, eraDayNumber, previousDay } from '@/lib/era/logic'

/** Days with no era between two eras before starting again counts as a return. */
export const ERA_RETURN_GAP_DAYS = 7

/**
 * Server-side XP + achievements. Used by /api/gamification/xp (events the
 * client reports) and by the era routes (events the server itself decides
 * happened — a promise made, a promise kept — so they can't be farmed by
 * calling the XP endpoint in a loop).
 */

/** An era "finishes" only if it was actually lived: 20+ promises made. */
export const ERA_COMPLETE_MIN_PROMISES = 20

export async function gatherEraAchievementStats(userId: string): Promise<EraAchievementStats> {
  const [eras, prefs, carried] = await Promise.all([
    prisma.era.findMany({
      where: { user_id: userId },
      orderBy: { start_day: 'asc' },
      select: {
        era_key: true, start_day: true, length_days: true, status: true, ended_at: true,
        reflection: true,
        promises: { select: { local_day: true, kept: true }, orderBy: { local_day: 'asc' } },
      },
    }),
    prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { timezone: true } }),
    // Retired ones too: having carried something forward stays true.
    prisma.practice.findMany({
      where: { user_id: userId, from_era_id: { not: null } },
      select: { from_era_id: true },
      distinct: ['from_era_id'],
    }),
  ])
  const tz = prefs?.timezone ?? null
  const today = localDay(tz)

  const stats: EraAchievementStats = {
    promisesMade: 0, promisesKept: 0, longestPromiseStreak: 0, erasStarted: eras.length,
    erasCompleted: 0, perfectEras: 0, customEras: 0, comebacks: 0,
    carriedForward: carried.length,
    erasReflected: eras.filter(e => e.reflection?.trim()).length,
    eraReturns: 0,
    completedKeys: [],
  }

  // A return: an era begun a week or more after the one before it ended. A
  // rest between eras is healthy, and coming back after one is worth naming.
  for (let i = 1; i < eras.length; i++) {
    const prev = eras[i - 1]
    const plannedEnd = addDaysTo(prev.start_day, prev.length_days - 1)
    const endedDay = prev.ended_at ? localDay(tz, prev.ended_at) : plannedEnd
    const prevEnd = endedDay < plannedEnd ? endedDay : plannedEnd
    if (daysBetween(prevEnd, eras[i].start_day) > ERA_RETURN_GAP_DAYS) stats.eraReturns++
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
      stats.completedKeys.push(era.era_key)
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
  const [journalCount, breathingCount, moduleCount, moodLogCount, genreCount, guides, completedGoals, soundscapeEvents, era, practice, tzPrefs] = await Promise.all([
    prisma.dailyGuide.count({
      where: { user_id: userId, OR: [{ journal_freetext: { not: null } }, { journal_win: { not: null } }, { journal_gratitude: { not: null } }] },
    }),
    prisma.xPEvent.count({ where: { user_id: userId, event_type: 'breathingSession' } }),
    prisma.xPEvent.count({ where: { user_id: userId, event_type: 'moduleComplete' } }),
    prisma.dailyGuide.count({
      where: { user_id: userId, OR: [{ mood_before: { not: null } }, { mood_after: { not: null } }] },
    }),
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
    gatherPracticeAchievementStats(userId),
    prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { timezone: true } }),
  ])
  const record = await gatherRecordAchievementStats(userId)

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
    // Routines are deleted: no screen could create one, so nothing counts
    // the table any more. The retired 'first_routine' badge still shows for
    // the one account that holds it — see lib/achievements.ts.
    hasFirstRoutine: false,
    hasCompletedGoal: completedGoals > 0,
    hasFirstPathComplete: false,
    pathCompleteCount: 0,
    consecutivePathDays: 0,
    consecutiveVirtueDays: 0,
    currentHour: userLocalHour(tzPrefs?.timezone ?? null),
    consecutiveFullDays,
    era,
    practice,
    record,
  }
}

/**
 * Days of proof and Right now sessions, from rows. A proof day is any day
 * with something KEPT: a promise kept, a discipline done, an exercise
 * finished — the same unit as the grid on /proof.
 */
export async function gatherRecordAchievementStats(userId: string): Promise<RecordAchievementStats> {
  const [promiseDays, practiceDays, exerciseDays, resets] = await Promise.all([
    prisma.eraPromise.findMany({
      where: { user_id: userId, kept: true },
      select: { local_day: true },
      distinct: ['local_day'],
    }),
    prisma.practiceLog.findMany({
      where: { user_id: userId, done: true },
      select: { local_day: true },
      distinct: ['local_day'],
    }),
    prisma.exerciseRun.findMany({
      where: { user_id: userId, completed: true },
      select: { local_day: true },
      distinct: ['local_day'],
    }),
    prisma.resetSession.findMany({
      where: { user_id: userId, completed: true },
      select: { before: true, after: true },
    }),
  ])
  const days = new Set<string>()
  for (const r of [...promiseDays, ...practiceDays, ...exerciseDays]) days.add(r.local_day)
  return {
    proofDays: days.size,
    resetsDone: resets.length,
    // Their own two numbers, and only when they gave both.
    resetsHelped: resets.filter(r => r.before !== null && r.after !== null && r.after < r.before).length,
  }
}

/**
 * Award whatever has become true, without an XP event of its own — for
 * actions that earn achievements but no XP (a discipline logged, a Right
 * now session finished, an era's line written), which otherwise waited for
 * some unrelated XP event to be noticed. Never throws.
 */
export async function checkAchievementsNow(userId: string): Promise<AwardedAchievement[]> {
  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: userId },
      select: { total_xp: true, current_streak: true },
    })
    const { achievements } = await evaluateAndAwardAchievements(userId, {
      totalXP: prefs?.total_xp ?? 0,
      streak: prefs?.current_streak ?? 0,
    })
    return achievements
  } catch (err) {
    console.warn('[achievements] check failed:', err)
    return []
  }
}

function addDaysTo(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
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

/**
 * What the disciplines and the exercises have actually produced.
 *
 * Counted from rows, never from anything a client sends — same rule as the
 * era stats above. `isDueOn` decides what a run means: a discipline due on
 * Mondays and Fridays keeps its run when Tuesday is skipped, because
 * Tuesday was never asked for.
 *
 * Retired disciplines are included. Somebody who kept a practice for two
 * months and then turned it off still kept it for two months.
 */
export async function gatherPracticeAchievementStats(
  userId: string,
): Promise<PracticeAchievementStats> {
  const [practices, runs, booksFinished] = await Promise.all([
    prisma.practice.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        label: true,
        days: true,
        minimum: true,
        logs: {
          select: { local_day: true, done: true, minimum_only: true },
          orderBy: { local_day: 'asc' },
        },
      },
    }),
    prisma.exerciseRun.findMany({
      where: { user_id: userId, completed: true },
      select: { exercise_id: true, local_day: true },
    }),
    // Counted, not listed — the number is all any achievement needs, and
    // pulling titles here would put what somebody reads into a code path
    // that has no business holding it.
    prisma.book.count({ where: { user_id: userId, finished_at: { not: null } } }),
  ])

  const stats: PracticeAchievementStats = {
    practicesKept: 0,
    minimumDays: 0,
    longestPracticeRun: 0,
    disciplinesKept: 0,
    practiceComebacks: 0,
    exercisesDone: runs.length,
    exerciseDays: new Set(runs.map(r => r.local_day)).size,
    exerciseVariety: new Set(runs.map(r => r.exercise_id)).size,
    booksFinished,
  }

  for (const practice of practices) {
    const history = practiceHistory(
      { id: practice.id, label: practice.label, days: practice.days, minimum: practice.minimum },
      practice.logs.map(l => ({ day: l.local_day, done: l.done, minimumOnly: l.minimum_only })),
    )

    // A discipline created and never kept is not a discipline yet.
    if (history.kept === 0) continue

    stats.disciplinesKept++
    stats.practicesKept += history.kept
    stats.minimumDays += history.minimumDays
    stats.practiceComebacks += history.comebacks
    stats.longestPracticeRun = Math.max(stats.longestPracticeRun, history.longestRun)
  }

  return stats
}
