import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check premium status
    const subscription = await prisma.subscription.findUnique({
      where: { user_id: user.id },
    })

    const isPremium = subscription?.tier === 'premium' &&
      (subscription?.status === 'active' || subscription?.status === 'trialing')

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    // Check for cached affirmation today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const guide = await prisma.dailyGuide.findUnique({
      where: {
        user_id_date: {
          user_id: user.id,
          date: today,
        },
      },
      select: {
        ai_affirmation: true,
        day_type: true,
        energy_level: true,
        mood_before: true,
        journal_win: true,
      },
    })

    // Return cached if exists
    if (guide?.ai_affirmation) {
      return NextResponse.json({ affirmation: guide.ai_affirmation, cached: true })
    }

    // Fetch last 3 journal entries for deeper personalization
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    threeDaysAgo.setHours(0, 0, 0, 0)

    const recentJournals = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: threeDaysAgo, lt: today },
        OR: [
          { journal_win: { not: null } },
          { journal_gratitude: { not: null } },
          { journal_learned: { not: null } },
        ],
      },
      select: {
        journal_win: true,
        journal_gratitude: true,
        journal_learned: true,
      },
      orderBy: { date: 'desc' },
      take: 3,
    })

    // Fetch active goals
    let goalsText = ''
    try {
      const goals = await prisma.goal.findMany({
        where: { user_id: user.id, status: 'active' },
        select: { title: true },
        take: 3,
      })
      if (goals.length > 0) {
        goalsText = `Active goals: ${goals.map(g => g.title).join(', ')}`
      }
    } catch {
      // Goals table may not exist yet
    }

    // Fetch zodiac sign for optional cosmic context
    let zodiacText = ''
    try {
      const prefs = await prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { zodiac_sign: true },
      })
      if (prefs?.zodiac_sign) {
        zodiacText = `Zodiac sign: ${prefs.zodiac_sign}`
      }
    } catch {
      // Non-fatal
    }

    // Build journal context
    const journalContext = recentJournals
      .map(j => [
        j.journal_win ? `Win: "${j.journal_win.substring(0, 80)}"` : null,
        j.journal_gratitude ? `Grateful for: "${j.journal_gratitude.substring(0, 80)}"` : null,
        j.journal_learned ? `Learned: "${j.journal_learned.substring(0, 80)}"` : null,
      ].filter(Boolean).join('; '))
      .filter(Boolean)
      .join('\n')

    // Build full context
    const context = [
      guide?.day_type ? `Day type: ${guide.day_type}` : null,
      guide?.energy_level ? `Energy: ${guide.energy_level}` : null,
      guide?.mood_before ? `Current mood: ${guide.mood_before}` : null,
      journalContext ? `Recent journal reflections:\n${journalContext}` : null,
      goalsText || null,
      zodiacText || null,
    ].filter(Boolean).join('\n')

    // Fetch user's mindset for prompt injection
    const mindset = await getUserMindset(user.id)

    const baseSystemPrompt = `You are a deeply personal wellness coach who knows this user's journey. Generate a single, short, powerful daily affirmation (1-2 sentences max). It should be personal ("I am...", "I choose...", "Today I..."), warm, and actionable. Reference their specific goals, journal themes, or zodiac energy if available — but subtly, not by name-dropping. No quotes, no attribution.\n\nUser context:\n${context || 'No specific context available.'}`

    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: buildMindsetSystemPrompt(baseSystemPrompt, mindset),
        },
        {
          role: 'user',
          content: 'Generate my daily affirmation.',
        },
      ],
      max_tokens: 60,
      temperature: 0.8,
    })

    const affirmation = completion.choices[0]?.message?.content?.trim() || 'I am capable, I am growing, and today matters.'

    // Cache it on the DailyGuide
    await prisma.dailyGuide.upsert({
      where: {
        user_id_date: {
          user_id: user.id,
          date: today,
        },
      },
      update: { ai_affirmation: affirmation },
      create: {
        user_id: user.id,
        date: today,
        day_type: 'work',
        ai_affirmation: affirmation,
      },
    })

    return NextResponse.json({ affirmation, cached: false })
  } catch (error) {
    console.error('Affirmation API error:', error)
    return NextResponse.json({ error: 'Failed to generate affirmation' }, { status: 500 })
  }
}
