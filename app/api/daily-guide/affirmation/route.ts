import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getGroq, GROQ_MODEL } from '@/lib/groq'

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

    // Generate new affirmation
    const context = [
      guide?.day_type ? `Day type: ${guide.day_type}` : null,
      guide?.energy_level ? `Energy: ${guide.energy_level}` : null,
      guide?.mood_before ? `Current mood: ${guide.mood_before}` : null,
    ].filter(Boolean).join('. ')

    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a personal wellness coach. Generate a single, short, powerful daily affirmation (1-2 sentences max). It should be personal ("I am...", "I choose...", "Today I..."), warm, and actionable. No quotes, no attribution. ${context ? `Context: ${context}` : ''}`,
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
