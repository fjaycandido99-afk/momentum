import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'

export const dynamic = 'force-dynamic'

const MOOD_SCORES: Record<string, number> = {
  great: 25, good: 20, okay: 15, low: 8, awful: 3,
}

const ENERGY_SCORES: Record<string, number> = {
  high: 25, normal: 15, low: 5,
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    // Check cache
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayGuide = await prisma.dailyGuide.findUnique({
      where: { user_id_date: { user_id: user.id, date: today } },
      select: { ai_wellness_score: true, ai_wellness_factors: true },
    })

    if (todayGuide?.ai_wellness_score !== null && todayGuide?.ai_wellness_score !== undefined) {
      try {
        const factors = todayGuide.ai_wellness_factors ? JSON.parse(todayGuide.ai_wellness_factors) : {}
        return NextResponse.json({
          score: todayGuide.ai_wellness_score,
          ...factors,
          cached: true,
        })
      } catch {
        // Bad cache, recalculate
      }
    }

    // Fetch 7 days of data
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)

    const guides = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: weekAgo },
      },
      select: {
        date: true,
        journal_mood: true,
        energy_level: true,
        morning_prime_done: true,
        breath_done: true,
        movement_done: true,
        day_close_done: true,
        journal_win: true,
        journal_gratitude: true,
        journal_freetext: true,
      },
      orderBy: { date: 'desc' },
    })

    if (guides.length === 0) {
      return NextResponse.json({
        score: null,
        insufficient: true,
        message: 'Use Voxu for a few days to generate your wellness score.',
      })
    }

    // Compute sub-scores
    // Mood (0-25): average of mood scores
    const moodValues = guides.filter(g => g.journal_mood).map(g => MOOD_SCORES[g.journal_mood!] || 15)
    const moodScore = moodValues.length > 0
      ? Math.round(moodValues.reduce((a, b) => a + b, 0) / moodValues.length)
      : 12

    // Energy (0-25): average of energy scores
    const energyValues = guides.filter(g => g.energy_level).map(g => ENERGY_SCORES[g.energy_level!] || 15)
    const energyScore = energyValues.length > 0
      ? Math.round(energyValues.reduce((a, b) => a + b, 0) / energyValues.length)
      : 12

    // Engagement (0-25): how many activities completed per day
    const engagementPerDay = guides.map(g => {
      let count = 0
      if (g.morning_prime_done) count++
      if (g.breath_done) count++
      if (g.movement_done) count++
      if (g.day_close_done) count++
      if (g.journal_win || g.journal_gratitude || g.journal_freetext) count++
      return Math.min(25, count * 5)
    })
    const engagementScore = Math.round(engagementPerDay.reduce((a, b) => a + b, 0) / engagementPerDay.length)

    // Trend (0-25): are things getting better or worse?
    let trendScore = 12 // neutral
    if (guides.length >= 3) {
      const recent = guides.slice(0, Math.ceil(guides.length / 2))
      const older = guides.slice(Math.ceil(guides.length / 2))
      const recentMoodAvg = recent.filter(g => g.journal_mood).map(g => MOOD_SCORES[g.journal_mood!] || 15)
      const olderMoodAvg = older.filter(g => g.journal_mood).map(g => MOOD_SCORES[g.journal_mood!] || 15)
      const rAvg = recentMoodAvg.length > 0 ? recentMoodAvg.reduce((a, b) => a + b, 0) / recentMoodAvg.length : 15
      const oAvg = olderMoodAvg.length > 0 ? olderMoodAvg.reduce((a, b) => a + b, 0) / olderMoodAvg.length : 15
      if (rAvg > oAvg + 2) trendScore = 22 // improving
      else if (rAvg < oAvg - 2) trendScore = 5 // declining
      else trendScore = 15 // stable
    }

    const totalScore = Math.min(100, moodScore + energyScore + engagementScore + trendScore)

    const factors = {
      mood: moodScore,
      energy: energyScore,
      engagement: engagementScore,
      trend: trendScore,
      daysTracked: guides.length,
    }

    // Generate AI alert if score is low
    let alert: string | null = null
    if (totalScore < 40) {
      const prefs = await prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { last_wellness_alert: true },
      })

      const thresholdDate = new Date()
      thresholdDate.setDate(thresholdDate.getDate() - 3)

      if (!prefs?.last_wellness_alert || new Date(prefs.last_wellness_alert) < thresholdDate) {
        try {
          const mindset = await getUserMindset(user.id)
          const basePrompt = 'You are a compassionate wellness advisor. The user\'s wellness score is low. Write 2-3 sentences of gentle encouragement and one actionable suggestion. Do not mention the score number directly.'

          const completion = await getGroq().chat.completions.create({
            model: GROQ_MODEL,
            messages: [
              { role: 'system', content: buildMindsetSystemPrompt(basePrompt, mindset) },
              { role: 'user', content: `Wellness factors: mood ${moodScore}/25, energy ${energyScore}/25, engagement ${engagementScore}/25, trend ${trendScore}/25. Score: ${totalScore}/100.` },
            ],
            max_tokens: 120,
            temperature: 0.7,
          })

          alert = completion.choices[0]?.message?.content?.trim() || 'Your patterns suggest extra care today. Try a short breathing exercise.'

          await prisma.userPreferences.update({
            where: { user_id: user.id },
            data: { last_wellness_alert: new Date() },
          })
        } catch {
          alert = 'Your patterns suggest extra care today. Try a short breathing exercise.'
        }
      }
    }

    // Cache score
    try {
      await prisma.dailyGuide.upsert({
        where: { user_id_date: { user_id: user.id, date: today } },
        update: {
          ai_wellness_score: totalScore,
          ai_wellness_factors: JSON.stringify(factors),
        },
        create: {
          user_id: user.id,
          date: today,
          day_type: 'work',
          ai_wellness_score: totalScore,
          ai_wellness_factors: JSON.stringify(factors),
        },
      })

      // Update 7-day avg
      await prisma.userPreferences.update({
        where: { user_id: user.id },
        data: { wellness_score_7day_avg: totalScore },
      })
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      score: totalScore,
      ...factors,
      alert,
      cached: false,
    })
  } catch (error) {
    console.error('Wellness score error:', error)
    return NextResponse.json({ error: 'Failed to calculate wellness score' }, { status: 500 })
  }
}
