import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq } from '@/lib/groq'

export const dynamic = 'force-dynamic'

const DEEP_MODEL = 'llama-3.3-70b-versatile'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check premium status
    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    // Check for cached insights today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayGuide = await prisma.dailyGuide.findUnique({
      where: {
        user_id_date: {
          user_id: user.id,
          date: today,
        },
      },
      select: { ai_journal_themes: true },
    })

    if (todayGuide?.ai_journal_themes) {
      try {
        const cached = JSON.parse(todayGuide.ai_journal_themes)
        return NextResponse.json({ ...cached, cached: true })
      } catch {
        // Bad cache, regenerate
      }
    }

    // Fetch last 14 days of journal entries
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    twoWeeksAgo.setHours(0, 0, 0, 0)

    const journals = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: twoWeeksAgo },
        OR: [
          { journal_win: { not: null } },
          { journal_gratitude: { not: null } },
          { journal_learned: { not: null } },
        ],
      },
      select: {
        date: true,
        journal_win: true,
        journal_gratitude: true,
        journal_learned: true,
        mood_before: true,
        mood_after: true,
      },
      orderBy: { date: 'desc' },
    })

    if (journals.length < 2) {
      return NextResponse.json({
        themes: [],
        emotionalTrend: 'Keep journaling to unlock your personal insights.',
        gratitudePatterns: '',
        suggestion: 'Try writing in your journal for a few more days.',
        moodCorrelation: '',
        insufficient: true,
      })
    }

    // Build journal text for AI analysis
    const journalText = journals.map(j => {
      const parts = [
        j.journal_win ? `Win: "${j.journal_win.substring(0, 100)}"` : null,
        j.journal_gratitude ? `Grateful: "${j.journal_gratitude.substring(0, 100)}"` : null,
        j.journal_learned ? `Learned: "${j.journal_learned.substring(0, 100)}"` : null,
        j.mood_before ? `Mood before: ${j.mood_before}` : null,
        j.mood_after ? `Mood after: ${j.mood_after}` : null,
      ].filter(Boolean).join(', ')
      const dateStr = new Date(j.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      return `${dateStr}: ${parts}`
    }).join('\n')

    const completion = await getGroq().chat.completions.create({
      model: DEEP_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a thoughtful journal analyst. Analyze the user's journal entries from the last 14 days and return a JSON response with these exact fields:
- "themes": Array of 3-5 one-word or two-word emotional/life themes you detect (e.g., "growth", "family", "career stress", "self-care")
- "emotionalTrend": A 1-2 sentence summary of their emotional trajectory
- "gratitudePatterns": A 1 sentence observation about what they tend to be grateful for
- "suggestion": A personalized 1-2 sentence actionable suggestion based on patterns
- "moodCorrelation": A 1 sentence observation correlating their mood with journal themes (e.g., "Your mood tends to improve on days you reflect on wins")

Respond with valid JSON only. Be warm and insightful.`,
        },
        {
          role: 'user',
          content: `Here are my journal entries:\n${journalText}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    })

    const rawResponse = completion.choices[0]?.message?.content?.trim() || ''

    let result = {
      themes: [] as string[],
      emotionalTrend: '',
      gratitudePatterns: '',
      suggestion: '',
      moodCorrelation: '',
    }

    try {
      const parsed = JSON.parse(rawResponse)
      result = {
        themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 5) : [],
        emotionalTrend: parsed.emotionalTrend || '',
        gratitudePatterns: parsed.gratitudePatterns || '',
        suggestion: parsed.suggestion || '',
        moodCorrelation: parsed.moodCorrelation || '',
      }
    } catch {
      // If JSON parsing fails, try to use the raw text
      result.emotionalTrend = rawResponse.length > 20 ? rawResponse.substring(0, 200) : 'Check back after more journal entries.'
    }

    // Cache the result
    try {
      await prisma.dailyGuide.upsert({
        where: {
          user_id_date: {
            user_id: user.id,
            date: today,
          },
        },
        update: { ai_journal_themes: JSON.stringify(result) },
        create: {
          user_id: user.id,
          date: today,
          day_type: 'work',
          ai_journal_themes: JSON.stringify(result),
        },
      })
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ ...result, cached: false })
  } catch (error) {
    console.error('Journal insights API error:', error)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
