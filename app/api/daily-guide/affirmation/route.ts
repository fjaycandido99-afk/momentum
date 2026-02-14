import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import { getDailyAffirmation } from '@/lib/mindset/affirmations'
import { getRecentJournals, formatJournalContext } from '@/lib/daily-guide/journal-context'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Fetch mindset + premium status + today's guide in parallel
    const [mindset, isPremium, guide] = await Promise.all([
      getUserMindset(user.id),
      isPremiumUser(user.id),
      prisma.dailyGuide.findUnique({
        where: { user_id_date: { user_id: user.id, date: today } },
        select: {
          ai_affirmation: true,
          day_type: true,
          energy_level: true,
          mood_before: true,
          journal_win: true,
        },
      }),
    ])

    // Return cached AI affirmation if exists
    if (guide?.ai_affirmation) {
      return NextResponse.json({ affirmation: guide.ai_affirmation, cached: true })
    }

    // Free users: path-based static affirmation from their mindset
    if (!isPremium) {
      return NextResponse.json({ affirmation: getDailyAffirmation(mindset, todayStr), cached: false })
    }

    // Premium: AI-generated with deep context + mindset injection
    const [recentJournals, goals, prefs] = await Promise.all([
      getRecentJournals(user.id, 3, 3),
      prisma.goal.findMany({
        where: { user_id: user.id, status: 'active' },
        select: { title: true },
        take: 3,
      }).catch(() => [] as { title: string }[]),
      prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { zodiac_sign: true },
      }).catch(() => null),
    ])

    const journalContext = formatJournalContext(recentJournals)

    const context = [
      guide?.day_type ? `Day type: ${guide.day_type}` : null,
      guide?.energy_level ? `Energy: ${guide.energy_level}` : null,
      guide?.mood_before ? `Current mood: ${guide.mood_before}` : null,
      journalContext ? `Recent journal reflections:\n${journalContext}` : null,
      goals.length > 0 ? `Active goals: ${goals.map(g => g.title).join(', ')}` : null,
      prefs?.zodiac_sign ? `Zodiac sign: ${prefs.zodiac_sign}` : null,
    ].filter(Boolean).join('\n')

    const baseSystemPrompt = `You are a deeply personal wellness coach who knows this user's journey. Generate a single, short, powerful daily affirmation (1-2 sentences max). It should be personal ("I am...", "I choose...", "Today I..."), warm, and actionable. Reference their specific goals, journal themes, or zodiac energy if available — but subtly, not by name-dropping. No quotes, no attribution.\n\nUser context:\n${context || 'No specific context available.'}`

    try {
      const completion = await getGroq().chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: buildMindsetSystemPrompt(baseSystemPrompt, mindset) },
          { role: 'user', content: 'Generate my daily affirmation.' },
        ],
        max_tokens: 60,
        temperature: 0.8,
      })

      const affirmation = completion.choices[0]?.message?.content?.trim()

      if (affirmation) {
        // Cache on DailyGuide
        await prisma.dailyGuide.upsert({
          where: { user_id_date: { user_id: user.id, date: today } },
          update: { ai_affirmation: affirmation },
          create: { user_id: user.id, date: today, day_type: 'work', ai_affirmation: affirmation },
        })

        return NextResponse.json({ affirmation, cached: false })
      }
    } catch (error) {
      console.error('Affirmation AI error:', error)
    }

    // Fallback: path-based static affirmation
    return NextResponse.json({ affirmation: getDailyAffirmation(mindset, todayStr), cached: false })
  } catch (error) {
    console.error('Affirmation API error:', error)
    return NextResponse.json({ error: 'Failed to generate affirmation' }, { status: 500 })
  }
}
