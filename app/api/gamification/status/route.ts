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
    const [prefs, todaysEvents, weekEvents, achievements, todayGuide, weekGuides, routinesCompleted, goals] = await Promise.all([
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
    const journalCount = await prisma.dailyGuide.count({
      where: { user_id: user.id, OR: [{ journal_freetext: { not: null } }, { journal_win: { not: null } }, { journal_gratitude: { not: null } }] },
    })
    const modulesCompleted = await prisma.xPEvent.count({
      where: { user_id: user.id, event_type: 'moduleComplete' },
    })
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

    // --- Mood Insights (30-day analysis) ---
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const moodGuides = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: thirtyDaysAgo },
        OR: [{ mood_before: { not: null } }, { mood_after: { not: null } }, { journal_mood: { not: null } }],
      },
      select: {
        date: true,
        mood_before: true,
        mood_after: true,
        journal_mood: true,
        journal_freetext: true,
        journal_win: true,
        journal_gratitude: true,
      },
      orderBy: { date: 'asc' },
    })

    const moodToNum: Record<string, number> = { awful: 1, low: 2, okay: 3, good: 4, great: 5, medium: 3, high: 5 }
    const moodScores = moodGuides
      .map(g => moodToNum[g.journal_mood || g.mood_after || ''] || 0)
      .filter(s => s > 0)

    const avgMood = moodScores.length > 0 ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length : 0
    const firstHalf = moodScores.slice(0, Math.ceil(moodScores.length / 2))
    const secondHalf = moodScores.slice(Math.ceil(moodScores.length / 2))
    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0
    const improvement = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0

    // Best day of week
    const dayScores: Record<number, number[]> = {}
    moodGuides.forEach(g => {
      const score = moodToNum[g.journal_mood || g.mood_after || ''] || 0
      if (score > 0) {
        const day = g.date.getDay()
        if (!dayScores[day]) dayScores[day] = []
        dayScores[day].push(score)
      }
    })
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    let bestDay = ''
    let bestDayAvg = 0
    for (const [day, scores] of Object.entries(dayScores)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      if (avg > bestDayAvg) {
        bestDayAvg = avg
        bestDay = dayNames[parseInt(day)]
      }
    }

    // Journal correlation
    const daysWithJournal = moodGuides.filter(g => g.journal_freetext || g.journal_win || g.journal_gratitude)
    const journalMoodAvg = daysWithJournal.length > 0
      ? daysWithJournal.map(g => moodToNum[g.journal_mood || g.mood_after || ''] || 0).filter(s => s > 0).reduce((a, b) => a + b, 0) / daysWithJournal.filter(g => moodToNum[g.journal_mood || g.mood_after || ''] || 0 > 0).length
      : 0

    const moodInsights = {
      averageMood: Math.round(avgMood * 10) / 10,
      improvementPercent: improvement,
      bestDay,
      journalCorrelation: journalMoodAvg > avgMood,
      totalEntries: moodScores.length,
      weeklyBreakdown: Object.entries(dayScores).map(([day, scores]) => ({
        day: dayNames[parseInt(day)],
        average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      })),
    }

    return NextResponse.json({
      xp: { total: totalXP, today: todaysXP, week: weekXP },
      level: levelInfo,
      streak,
      achievements: achievementData,
      dailyChallenges: challengeStatus,
      weeklyMissions: missionStatus,
      socialNudges,
      rewards: { unlocked: unlockedRewards, next: nextReward },
      moodInsights,
    })
  } catch (error) {
    console.error('Gamification status error:', error)
    return NextResponse.json({ error: 'Failed to get gamification status' }, { status: 500 })
  }
}
