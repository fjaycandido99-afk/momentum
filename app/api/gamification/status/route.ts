import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getLevelFromXP } from '@/lib/gamification'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { getDailyChallenges, checkChallengeCondition } from '@/lib/daily-challenges'
import { getWeekString, getWeeklyMissions, checkMissionProgress } from '@/lib/weekly-missions'
import { computeSocialNudges } from '@/lib/social-proof'
import { getUnlockedRewards, getNextReward } from '@/lib/unlockable-content'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayStr = now.toISOString().split('T')[0]

    // Week boundaries (Monday-Sunday)
    const dayOfWeek = now.getDay()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
    weekStart.setHours(0, 0, 0, 0)

    // Fetch all needed data in parallel
    const [prefs, todaysEvents, weekEvents, achievements, todayGuide, weekGuides, routinesCompleted, goals, journalCount, modulesCompleted] = await Promise.all([
      prisma.userPreferences.findUnique({ where: { user_id: user.id } }),
      prisma.xPEvent.findMany({
        where: { user_id: user.id, created_at: { gte: todayStart } },
        select: { xp_amount: true, event_type: true },
      }),
      prisma.xPEvent.findMany({
        where: { user_id: user.id, created_at: { gte: weekStart } },
        select: { xp_amount: true, event_type: true },
      }),
      prisma.userAchievement.findMany({
        where: { user_id: user.id },
        select: { achievement_id: true, unlocked_at: true },
      }),
      prisma.dailyGuide.findFirst({
        where: { user_id: user.id, date: new Date(todayStr) },
        select: {
          id: true,
          morning_prime_done: true,
          movement_done: true,
          micro_lesson_done: true,
          breath_done: true,
          day_close_done: true,
          journal_freetext: true,
          journal_win: true,
          journal_gratitude: true,
          mood_before: true,
          mood_after: true,
          music_genre_used: true,
          daily_bonus_claimed: true,
          daily_bonus_amount: true,
        },
      }),
      prisma.dailyGuide.findMany({
        where: { user_id: user.id, date: { gte: weekStart } },
        select: {
          date: true,
          morning_prime_done: true, movement_done: true, micro_lesson_done: true,
          breath_done: true, day_close_done: true,
          journal_freetext: true, journal_win: true, journal_gratitude: true,
          mood_before: true, mood_after: true,
          music_genre_used: true,
        },
      }),
      prisma.xPEvent.count({
        where: { user_id: user.id, event_type: 'routineComplete', created_at: { gte: weekStart } },
      }),
      prisma.goal.count({ where: { user_id: user.id, status: 'completed' } }),
      prisma.dailyGuide.count({
        where: { user_id: user.id, OR: [{ journal_freetext: { not: null } }, { journal_win: { not: null } }, { journal_gratitude: { not: null } }] },
      }),
      prisma.xPEvent.count({
        where: { user_id: user.id, event_type: 'moduleComplete' },
      }),
    ])

    const totalXP = prefs?.total_xp || 0
    const streak = prefs?.current_streak || 0
    const todaysXP = todaysEvents.reduce((sum, e) => sum + e.xp_amount, 0)
    const weekXP = weekEvents.reduce((sum, e) => sum + e.xp_amount, 0)
    const levelInfo = getLevelFromXP(totalXP)

    // --- Achievements ---
    const unlockedSet = new Set(achievements.map(a => a.achievement_id))
    const achievementData = ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: unlockedSet.has(a.id),
      unlockedAt: achievements.find(ua => ua.achievement_id === a.id)?.unlocked_at || null,
    }))

    // --- Daily Challenges ---
    const dailyChallenges = getDailyChallenges(todayStr)
    const challengeStatus = dailyChallenges.map(c => ({
      ...c,
      completed: checkChallengeCondition(
        c.condition,
        todayGuide,
        todaysXP,
        todaysEvents.map(e => ({ event_type: e.event_type }))
      ),
    }))

    // --- Weekly Missions ---
    const weekStr = getWeekString(now)
    const weeklyMissions = getWeeklyMissions(weekStr)

    // Gather weekly stats
    const weekJournalDays = new Set(
      weekGuides.filter(g => g.journal_freetext || g.journal_win || g.journal_gratitude).map(g => g.date.toISOString().split('T')[0])
    ).size
    const weekModules = weekGuides.reduce((sum, g) => {
      return sum + [g.morning_prime_done, g.movement_done, g.micro_lesson_done, g.breath_done, g.day_close_done].filter(Boolean).length
    }, 0)
    const weekBreathing = weekEvents.filter(e => e.event_type === 'breathingSession').length
    const weekMoodLogs = weekGuides.filter(g => g.mood_before || g.mood_after).length
    const weekActiveDays = new Set(weekGuides.map(g => g.date.toISOString().split('T')[0])).size

    const missionStatus = weeklyMissions.map(m => ({
      ...m,
      ...checkMissionProgress(m.condition, {
        journalDays: weekJournalDays,
        modulesCompleted: weekModules,
        xpEarned: weekXP,
        streak,
        breathingSessions: weekBreathing,
        moodLogs: weekMoodLogs,
        activeDays: weekActiveDays,
        routinesCompleted,
      }),
    }))

    // --- Social Proof ---
    const socialNudges = computeSocialNudges({
      streak,
      totalXP,
      modulesCompleted,
      journalCount,
      level: levelInfo.current.level,
    })

    // --- Unlockable Rewards ---
    const unlockedRewards = getUnlockedRewards(levelInfo.current.level)
    const nextReward = getNextReward(levelInfo.current.level)

    // --- Daily Bonus ---
    const dailyBonusClaimed = todayGuide?.daily_bonus_claimed || false
    const dailyBonusAmount = todayGuide?.daily_bonus_amount || null

    // --- Streak Freeze ---
    const streakFreezeAvailable = prefs?.streak_freezes ?? 1
    const streakFreezeLastUsed = prefs?.streak_freeze_used_at || null
    const lastStreakValue = prefs?.last_streak_value || 0
    const streakLostAt = prefs?.streak_lost_at || null

    // All challenges done?
    const allChallengesDone = challengeStatus.length > 0 && challengeStatus.every((c: any) => c.completed)

    return NextResponse.json({
      xp: { total: totalXP, today: todaysXP, week: weekXP },
      level: levelInfo,
      streak,
      achievements: achievementData,
      dailyChallenges: challengeStatus,
      weeklyMissions: missionStatus,
      socialNudges,
      rewards: { unlocked: unlockedRewards, next: nextReward },
      dailyBonus: { claimed: dailyBonusClaimed, amount: dailyBonusAmount },
      streakFreeze: { available: streakFreezeAvailable, lastUsed: streakFreezeLastUsed },
      lastStreakLost: lastStreakValue > 0 && streakLostAt ? { value: lastStreakValue, at: streakLostAt } : null,
      allChallengesDone,
    })
  } catch (error) {
    console.error('Gamification status error:', error)
    return NextResponse.json({ error: 'Failed to get gamification status' }, { status: 500 })
  }
}
