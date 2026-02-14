import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch subscription for premium check + preferences for streak in parallel
    const [sub, prefs] = await Promise.all([
      prisma.subscription.findUnique({ where: { user_id: user.id }, select: { tier: true, status: true } }),
      prisma.userPreferences.findUnique({ where: { user_id: user.id }, select: { current_streak: true } }),
    ])
    const isPremium = sub?.tier === 'premium' && (sub?.status === 'active' || sub?.status === 'trialing')
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
        journal_mood: true,
        journal_freetext: true,
        journal_win: true,
        journal_gratitude: true,
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

    // --- Mood Insights (30-day analysis) ---
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const moodGuides = guides.filter(g => g.date >= thirtyDaysAgo)

    const moodToNumDetailed: Record<string, number> = { awful: 1, low: 2, okay: 3, good: 4, great: 5, medium: 3, high: 5 }
    const moodScores = moodGuides
      .map(g => moodToNumDetailed[g.journal_mood || g.mood_after || ''] || 0)
      .filter(s => s > 0)

    let moodInsights = null
    if (moodScores.length >= 3) {
      const avgMood = moodScores.reduce((a, b) => a + b, 0) / moodScores.length
      const firstHalf = moodScores.slice(0, Math.ceil(moodScores.length / 2))
      const secondHalf = moodScores.slice(Math.ceil(moodScores.length / 2))
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : firstAvg
      const improvement = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0

      const dayScores: Record<number, number[]> = {}
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      moodGuides.forEach(g => {
        const score = moodToNumDetailed[g.journal_mood || g.mood_after || ''] || 0
        if (score > 0) {
          const day = g.date.getDay()
          if (!dayScores[day]) dayScores[day] = []
          dayScores[day].push(score)
        }
      })

      let bestDay = ''
      let bestDayAvg = 0
      for (const [day, scores] of Object.entries(dayScores)) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        if (avg > bestDayAvg) { bestDayAvg = avg; bestDay = dayNames[parseInt(day)] }
      }

      const daysWithJournal = moodGuides.filter(g => g.journal_freetext || g.journal_win || g.journal_gratitude)
      const journalMoodScores = daysWithJournal.map(g => moodToNumDetailed[g.journal_mood || g.mood_after || ''] || 0).filter(s => s > 0)
      const journalMoodAvg = journalMoodScores.length > 0 ? journalMoodScores.reduce((a, b) => a + b, 0) / journalMoodScores.length : 0

      moodInsights = {
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
    }

    return NextResponse.json({
      streak,
      activeDays: activeDateSet.size,
      listeningMinutes,
      categoryMinutes,
      modulesCompleted,
      moodData,
      heatmap,
      daysLimit,
      moodInsights,
    })
  } catch (error) {
    console.error('Progress error:', error)
    return NextResponse.json({ error: 'Failed to get progress' }, { status: 500 })
  }
}
