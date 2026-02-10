import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { XP_REWARDS, type XPEventType, getLevelFromXP } from '@/lib/gamification'
import { ACHIEVEMENTS, checkNewAchievements } from '@/lib/achievements'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { eventType, source } = body as { eventType: string; source?: string }

    if (!eventType || !(eventType in XP_REWARDS)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    const xpAmount = XP_REWARDS[eventType as XPEventType]

    // Transaction: create XP event + increment total_xp
    const [, prefs] = await prisma.$transaction([
      prisma.xPEvent.create({
        data: {
          user_id: user.id,
          event_type: eventType,
          xp_amount: xpAmount,
          source: source || null,
        },
      }),
      prisma.userPreferences.upsert({
        where: { user_id: user.id },
        update: { total_xp: { increment: xpAmount } },
        create: { user_id: user.id, total_xp: xpAmount },
      }),
    ])

    const totalXP = prefs.total_xp
    const { current } = getLevelFromXP(totalXP)

    // Check for new achievements
    const existingAchievements = await prisma.userAchievement.findMany({
      where: { user_id: user.id },
      select: { achievement_id: true },
    })
    const unlockedIds = new Set(existingAchievements.map(a => a.achievement_id))

    // Gather stats for achievement checking
    const streak = prefs.current_streak || 0

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todaysEvents = await prisma.xPEvent.findMany({
      where: { user_id: user.id, created_at: { gte: todayStart } },
      select: { xp_amount: true },
    })
    const todaysXP = todaysEvents.reduce((sum, e) => sum + e.xp_amount, 0)

    // Count various stats for achievements
    const [journalCount, breathingCount, moduleCount, moodLogCount, routineCount, genreCount, guides] = await Promise.all([
      prisma.dailyGuide.count({
        where: { user_id: user.id, OR: [{ journal_freetext: { not: null } }, { journal_win: { not: null } }, { journal_gratitude: { not: null } }] },
      }),
      prisma.xPEvent.count({ where: { user_id: user.id, event_type: 'breathingSession' } }),
      prisma.xPEvent.count({ where: { user_id: user.id, event_type: 'moduleComplete' } }),
      prisma.dailyGuide.count({
        where: { user_id: user.id, OR: [{ mood_before: { not: null } }, { mood_after: { not: null } }] },
      }),
      prisma.routine.count({ where: { user_id: user.id } }),
      prisma.dailyGuide.findMany({
        where: { user_id: user.id, music_genre_used: { not: null } },
        select: { music_genre_used: true },
        distinct: ['music_genre_used'],
      }),
      prisma.dailyGuide.findMany({
        where: { user_id: user.id },
        select: {
          morning_prime_done: true, movement_done: true, micro_lesson_done: true,
          breath_done: true, day_close_done: true, date: true,
        },
        orderBy: { date: 'desc' },
        take: 30,
      }),
    ])

    // Full day completions and unique module types
    let fullDayCount = 0
    let uniqueModuleTypes = 0
    const moduleTypesSeen = new Set<string>()
    let consecutiveFullDays = 0
    let countingConsecutive = true

    for (const g of guides) {
      const allDone = g.morning_prime_done && g.movement_done && g.micro_lesson_done && g.breath_done && g.day_close_done
      if (allDone) {
        fullDayCount++
        if (countingConsecutive) consecutiveFullDays++
      } else {
        countingConsecutive = false
      }
      if (g.morning_prime_done) moduleTypesSeen.add('morning_prime')
      if (g.movement_done) moduleTypesSeen.add('movement')
      if (g.micro_lesson_done) moduleTypesSeen.add('micro_lesson')
      if (g.breath_done) moduleTypesSeen.add('breath')
      if (g.day_close_done) moduleTypesSeen.add('day_close')
    }
    uniqueModuleTypes = moduleTypesSeen.size

    // Weekend active count
    const weekendGuides = guides.filter(g => {
      const day = g.date.getDay()
      return (day === 0 || day === 6) && (g.morning_prime_done || g.movement_done || g.micro_lesson_done || g.breath_done || g.day_close_done)
    })
    const weekendActiveCount = weekendGuides.length

    // Check for completed goals
    const completedGoals = await prisma.goal.count({
      where: { user_id: user.id, status: 'completed' },
    })

    // Check soundscape usage
    const soundscapeEvents = await prisma.xPEvent.count({
      where: { user_id: user.id, event_type: 'focusSession' },
    })

    const now = new Date()
    const newAchievements = checkNewAchievements(
      {
        streak,
        totalXP,
        level: current.level,
        journalCount,
        moodLogCount,
        breathingCount,
        moduleCount,
        fullDayCount,
        weekendActiveCount,
        uniqueGenres: genreCount.length,
        uniqueModuleTypes,
        hasFirstJournal: journalCount > 0,
        hasFirstSoundscape: soundscapeEvents > 0,
        hasFirstRoutine: routineCount > 0,
        hasCompletedGoal: completedGoals > 0,
        currentHour: now.getHours(),
        consecutiveFullDays,
      },
      unlockedIds
    )

    // Insert new achievements and award bonus XP
    let bonusXP = 0
    const achievementResults: { id: string; title: string; xpReward: number }[] = []

    if (newAchievements.length > 0) {
      await prisma.$transaction(
        newAchievements.map(a =>
          prisma.userAchievement.create({
            data: { user_id: user.id, achievement_id: a.id },
          })
        )
      )

      bonusXP = newAchievements.reduce((sum, a) => sum + a.xpReward, 0)
      if (bonusXP > 0) {
        await prisma.$transaction([
          prisma.xPEvent.create({
            data: {
              user_id: user.id,
              event_type: 'achievementBonus',
              xp_amount: bonusXP,
              source: newAchievements.map(a => a.id).join(','),
            },
          }),
          prisma.userPreferences.update({
            where: { user_id: user.id },
            data: { total_xp: { increment: bonusXP } },
          }),
        ])
      }

      for (const a of newAchievements) {
        achievementResults.push({ id: a.id, title: a.title, xpReward: a.xpReward })
      }
    }

    const finalTotalXP = totalXP + bonusXP
    const finalLevel = getLevelFromXP(finalTotalXP)

    return NextResponse.json({
      totalXP: finalTotalXP,
      todaysXP: todaysXP + bonusXP,
      level: finalLevel.current.level,
      newAchievements: achievementResults,
    })
  } catch (error) {
    console.error('XP logging error:', error)
    return NextResponse.json({ error: 'Failed to log XP' }, { status: 500 })
  }
}
