import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getGroq, GROQ_MODEL } from '@/lib/groq'

export const dynamic = 'force-dynamic'

type NudgeType = 'streak_risk' | 'journal_reminder' | 'mood_trend' | 'inactive' | 'energy_pattern' | 'none'

interface NudgeResult {
  type: NudgeType
  message: string
  icon: string
}

// Template messages for free users
const NUDGE_TEMPLATES: Record<NudgeType, string> = {
  streak_risk: "You haven't logged in today yet. Keep your streak going!",
  journal_reminder: "You've been journaling consistently. Don't forget to reflect today!",
  mood_trend: "Your mood has been trending upward this week. Keep it up!",
  inactive: "We miss you! Take a moment to check in with yourself today.",
  energy_pattern: "You tend to have more energy in the mornings. Plan your important tasks then.",
  none: "",
}

const NUDGE_ICONS: Record<NudgeType, string> = {
  streak_risk: 'flame',
  journal_reminder: 'pen',
  mood_trend: 'trending-up',
  inactive: 'heart',
  energy_pattern: 'zap',
  none: '',
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch last 14 days of data
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    twoWeeksAgo.setHours(0, 0, 0, 0)

    const guides = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: twoWeeksAgo },
      },
      select: {
        date: true,
        energy_level: true,
        mood_before: true,
        mood_after: true,
        journal_win: true,
        journal_gratitude: true,
        morning_prime_done: true,
        movement_done: true,
        micro_lesson_done: true,
        breath_done: true,
        day_close_done: true,
      },
      orderBy: { date: 'desc' },
    })

    // Analyze patterns
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const hasToday = guides.some(g => new Date(g.date).toISOString().split('T')[0] === todayStr)
    const recentDays = guides.slice(0, 7)
    const journalCount = recentDays.filter(g => g.journal_win || g.journal_gratitude).length
    const activeDays = recentDays.filter(g => g.morning_prime_done || g.movement_done || g.day_close_done).length
    const inactiveDays = 7 - activeDays

    // Mood trend analysis
    const moodValues: Record<string, number> = { low: 0, medium: 1, high: 2 }
    const recentMoods = recentDays
      .filter(g => g.mood_after)
      .map(g => moodValues[g.mood_after!] ?? 1)
    const moodTrending = recentMoods.length >= 3 &&
      recentMoods.slice(0, 3).reduce((a, b) => a + b, 0) / 3 >
      recentMoods.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, recentMoods.length)

    // Energy pattern
    const energyCounts = { low: 0, normal: 0, high: 0 }
    recentDays.forEach(g => {
      if (g.energy_level && g.energy_level in energyCounts) {
        energyCounts[g.energy_level as keyof typeof energyCounts]++
      }
    })

    // Determine nudge type
    let nudgeType: NudgeType = 'none'
    if (!hasToday && activeDays >= 3) {
      nudgeType = 'streak_risk'
    } else if (journalCount >= 4 && !guides[0]?.journal_win) {
      nudgeType = 'journal_reminder'
    } else if (moodTrending) {
      nudgeType = 'mood_trend'
    } else if (inactiveDays >= 4) {
      nudgeType = 'inactive'
    } else if (energyCounts.high >= 3 || energyCounts.low >= 3) {
      nudgeType = 'energy_pattern'
    }

    if (nudgeType === 'none') {
      return NextResponse.json({ nudge: null })
    }

    // Check premium for personalized message
    const subscription = await prisma.subscription.findUnique({
      where: { user_id: user.id },
    })
    const isPremium = subscription?.tier === 'premium' &&
      (subscription?.status === 'active' || subscription?.status === 'trialing')

    let message = NUDGE_TEMPLATES[nudgeType]

    if (isPremium) {
      try {
        const context = [
          `Nudge type: ${nudgeType}`,
          `Active days this week: ${activeDays}/7`,
          `Journal entries this week: ${journalCount}`,
          moodTrending ? 'Mood has been improving' : null,
          energyCounts.low >= 3 ? 'Frequently low energy' : null,
          energyCounts.high >= 3 ? 'Frequently high energy' : null,
        ].filter(Boolean).join('. ')

        const completion = await getGroq().chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a warm wellness coach. Write a single, short encouraging nudge message (1 sentence, max 20 words). Be personal and specific. Don't use emojis. Context: ${context}`,
            },
            {
              role: 'user',
              content: `Write a ${nudgeType} nudge message.`,
            },
          ],
          max_tokens: 50,
          temperature: 0.7,
        })

        const aiMessage = completion.choices[0]?.message?.content?.trim()
        if (aiMessage) message = aiMessage
      } catch (error) {
        console.error('Smart nudge AI error:', error)
        // Fall through to template
      }
    }

    const nudge: NudgeResult = {
      type: nudgeType,
      message,
      icon: NUDGE_ICONS[nudgeType],
    }

    return NextResponse.json({ nudge })
  } catch (error) {
    console.error('Smart nudge API error:', error)
    return NextResponse.json({ error: 'Failed to get nudge' }, { status: 500 })
  }
}
