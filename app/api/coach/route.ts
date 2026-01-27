import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getGroq, GROQ_MODEL } from '@/lib/groq'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    const { message, context: rawContext } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    // Sanitize context: only allow user/assistant roles, limit length
    const context = Array.isArray(rawContext)
      ? rawContext
          .filter((m: any) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
          .slice(-20)
          .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }))
      : []

    // Get today's guide for context
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
        day_type: true,
        energy_level: true,
        mood_before: true,
        mood_after: true,
        journal_win: true,
        journal_gratitude: true,
      },
    })

    // Get recent journals for richer context
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)

    const recentJournals = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: weekAgo },
        journal_win: { not: null },
      },
      select: {
        date: true,
        journal_win: true,
        journal_gratitude: true,
      },
      orderBy: { date: 'desc' },
      take: 3,
    })

    const journalContext = recentJournals
      .map(j => `${new Date(j.date).toLocaleDateString()}: "${j.journal_win}"${j.journal_gratitude ? ` (grateful for: ${j.journal_gratitude})` : ''}`)
      .join('\n')

    // Fetch active goals for context
    let goalsContext = ''
    try {
      const goals = await prisma.goal.findMany({
        where: { user_id: user.id, status: 'active' },
        select: { title: true, current_count: true, target_count: true, frequency: true },
        take: 5,
      })
      if (goals.length > 0) {
        goalsContext = `- Active goals:\n${goals.map(g => `  * ${g.title} (${g.current_count}/${g.target_count} ${g.frequency})`).join('\n')}`
      }
    } catch {
      // Goals table may not exist yet, non-fatal
    }

    const systemPrompt = `You are a warm, encouraging personal wellness coach in the Voxu app. Your name is Coach.

CONTEXT:
- Today's day type: ${guide?.day_type || 'work'}
- Energy level: ${guide?.energy_level || 'unknown'}
- Morning mood: ${guide?.mood_before || 'not recorded'}
- Evening mood: ${guide?.mood_after || 'not recorded'}
${journalContext ? `- Recent journal entries:\n${journalContext}` : ''}
${goalsContext}

RULES:
- Keep responses under 150 words
- Be warm, actionable, and direct
- Use the user's context to personalize advice
- Don't be preachy or lecture
- Suggest practical next steps when appropriate
- If they share a problem, acknowledge it first before advising
- Never diagnose medical or mental health conditions
- If someone seems in crisis, encourage them to reach out to a professional`

    const chatCompletion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(context || []),
        { role: 'user', content: message },
      ],
      max_tokens: 300,
      temperature: 0.7,
    })

    const reply = chatCompletion.choices[0]?.message?.content || 'I\'m here for you. What would you like to talk about?'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Coach API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to get coach response', detail: message }, { status: 500 })
  }
}
