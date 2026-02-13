import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getPathRank } from '@/lib/path-journey'
import type { MindsetId } from '@/lib/mindset/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get last 7 days
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6) // Include today = 7 days

    const [weekGuides, totalDays, prefs] = await Promise.all([
      prisma.dailyGuide.findMany({
        where: {
          user_id: user.id,
          date: { gte: sevenDaysAgo, lte: today },
        },
        select: {
          date: true,
          path_reflection_done: true,
          path_exercise_done: true,
          path_quote_viewed: true,
          path_soundscape_played: true,
          path_streak: true,
        },
        orderBy: { date: 'asc' },
      }),
      prisma.dailyGuide.count({
        where: {
          user_id: user.id,
          OR: [
            { path_reflection_done: true },
            { path_exercise_done: true },
            { path_quote_viewed: true },
            { path_soundscape_played: true },
          ],
        },
      }),
      prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { mindset: true },
      }),
    ])

    // Calculate weekly stats
    let activeDays = 0
    let totalActivities = 0
    let topActivityCounts: Record<string, number> = {
      reflection: 0,
      exercise: 0,
      quote: 0,
      soundscape: 0,
    }

    // Build 7-day array (fill gaps with inactive)
    const weekData: { date: string; active: boolean; count: number }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const guide = weekGuides.find(g => {
        const gd = new Date(g.date)
        return gd.toISOString().split('T')[0] === dateStr
      })

      if (guide) {
        const activities = [
          guide.path_reflection_done,
          guide.path_exercise_done,
          guide.path_quote_viewed,
          guide.path_soundscape_played,
        ]
        const dayCount = activities.filter(Boolean).length
        const isActive = dayCount > 0

        if (isActive) activeDays++
        totalActivities += dayCount

        if (guide.path_reflection_done) topActivityCounts.reflection++
        if (guide.path_exercise_done) topActivityCounts.exercise++
        if (guide.path_quote_viewed) topActivityCounts.quote++
        if (guide.path_soundscape_played) topActivityCounts.soundscape++

        weekData.push({ date: dateStr, active: isActive, count: dayCount })
      } else {
        weekData.push({ date: dateStr, active: false, count: 0 })
      }
    }

    // Find top activity
    const topActivity = Object.entries(topActivityCounts).sort((a, b) => b[1] - a[1])[0]

    // Current streak from today's guide
    const todayGuide = weekGuides.find(g => {
      const gd = new Date(g.date)
      return gd.toISOString().split('T')[0] === today.toISOString().split('T')[0]
    })
    const currentStreak = todayGuide?.path_streak ?? 0

    // Longest streak: max of all path_streak values
    const longestStreak = Math.max(0, ...weekGuides.map(g => g.path_streak))

    const mindsetId = (prefs?.mindset || 'stoic') as Exclude<MindsetId, 'scholar'>

    return NextResponse.json({
      activeDays,
      totalActivities,
      currentStreak,
      longestStreak,
      topActivity: topActivity[1] > 0 ? topActivity[0] : null,
      rank: getPathRank(mindsetId, totalDays),
      totalDays,
      mindsetId,
      weekData,
    })
  } catch (error) {
    console.error('Weekly review error:', error)
    return NextResponse.json({ error: 'Failed to get weekly review' }, { status: 500 })
  }
}
