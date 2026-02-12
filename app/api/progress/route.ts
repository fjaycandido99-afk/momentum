import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch subscription for premium check
    const sub = await prisma.subscription.findUnique({ where: { user_id: user.id } })
    const isPremium = sub?.tier === 'premium' && (sub?.status === 'active' || sub?.status === 'trialing')

    // Get preferences for streak
    const prefs = await prisma.userPreferences.findUnique({ where: { user_id: user.id } })
    const streak = prefs?.current_streak || 0

    // Get sessions for listening time and active days
    const daysLimit = isPremium ? 365 : 7
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - daysLimit)

    const sessions = await prisma.session.findMany({
      where: { user_id: user.id, started_at: { gte: sinceDate } },
      select: { started_at: true, duration_actual: true, activity_type: true },
      orderBy: { started_at: 'asc' },
    })

    // Get daily guides for mood data and active days
    const guides = await prisma.dailyGuide.findMany({
      where: { user_id: user.id, date: { gte: sinceDate } },
      select: {
        date: true,
        mood_before: true,
        mood_after: true,
        morning_prime_done: true,
        movement_done: true,
        micro_lesson_done: true,
        breath_done: true,
        day_close_done: true,
      },
      orderBy: { date: 'asc' },
    })

    // Calculate active days (unique dates from sessions + guides)
    const activeDateSet = new Set<string>()
    sessions.forEach(s => activeDateSet.add(s.started_at.toISOString().split('T')[0]))
    guides.forEach(g => activeDateSet.add(g.date.toISOString().split('T')[0]))

    // Calculate listening minutes
    const listeningMinutes = sessions.reduce((sum, s) => sum + (s.duration_actual || 0), 0)

    // Category breakdown
    const categoryMinutes: Record<string, number> = {}
    sessions.forEach(s => {
      const type = s.activity_type || 'other'
      categoryMinutes[type] = (categoryMinutes[type] || 0) + (s.duration_actual || 0)
    })

    // Modules completed
    let modulesCompleted = 0
    guides.forEach(g => {
      if (g.morning_prime_done) modulesCompleted++
      if (g.movement_done) modulesCompleted++
      if (g.micro_lesson_done) modulesCompleted++
      if (g.breath_done) modulesCompleted++
      if (g.day_close_done) modulesCompleted++
    })

    // Mood data for chart
    const moodToNum = (m: string | null) => m === 'low' ? 1 : m === 'medium' ? 2 : m === 'high' ? 3 : null
    const moodData = guides
      .filter(g => g.mood_before || g.mood_after)
      .map(g => ({
        date: g.date.toISOString().split('T')[0],
        before: moodToNum(g.mood_before),
        after: moodToNum(g.mood_after),
      }))

    // Activity heatmap data (daily activity count)
    const heatmap: Record<string, number> = {}
    activeDateSet.forEach(date => {
      const count = sessions.filter(s => s.started_at.toISOString().split('T')[0] === date).length +
        guides.filter(g => g.date.toISOString().split('T')[0] === date).length
      heatmap[date] = count
    })

    return NextResponse.json({
      streak,
      activeDays: activeDateSet.size,
      listeningMinutes,
      categoryMinutes,
      modulesCompleted,
      moodData,
      heatmap,
      daysLimit,
    })
  } catch (error) {
    console.error('Progress error:', error)
    return NextResponse.json({ error: 'Failed to get progress' }, { status: 500 })
  }
}
