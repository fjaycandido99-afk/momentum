import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getGroq, GROQ_MODEL } from '@/lib/groq'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET - Fetch journal entries for a date or date range
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Single date query
    if (date) {
      const targetDate = new Date(date)
      targetDate.setHours(0, 0, 0, 0)

      const guide = await prisma.dailyGuide.findUnique({
        where: {
          user_id_date: {
            user_id: user.id,
            date: targetDate,
          },
        },
        select: {
          date: true,
          journal_win: true,
          journal_gratitude: true,
          journal_learned: true,
          journal_intention: true,
          journal_freetext: true,
          journal_mood: true,
          journal_prompt: true,
          journal_ai_reflection: true,
        },
      })

      return NextResponse.json(guide || { date: targetDate, journal_win: null, journal_gratitude: null, journal_learned: null, journal_intention: null, journal_freetext: null, journal_mood: null, journal_prompt: null, journal_ai_reflection: null })
    }

    // Date range query (for calendar/history)
    if (startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      const guides = await prisma.dailyGuide.findMany({
        where: {
          user_id: user.id,
          date: {
            gte: start,
            lte: end,
          },
        },
        select: {
          date: true,
          journal_win: true,
          journal_gratitude: true,
          journal_learned: true,
          journal_intention: true,
          journal_freetext: true,
          journal_mood: true,
          journal_prompt: true,
          day_close_done: true,
          morning_prime_done: true,
          movement_done: true,
          micro_lesson_done: true,
          breath_done: true,
          energy_level: true,
          day_type: true,
          mood_before: true,
          mood_after: true,
        },
        orderBy: {
          date: 'asc',
        },
      })

      return NextResponse.json({ entries: guides })
    }

    // Default: return this week's entries
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const guides = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: {
          gte: startOfWeek,
        },
      },
      select: {
        date: true,
        journal_win: true,
        journal_gratitude: true,
        journal_learned: true,
        journal_intention: true,
        journal_freetext: true,
        journal_mood: true,
        journal_prompt: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json({ entries: guides })
  } catch (error) {
    console.error('Get journal error:', error)
    return NextResponse.json(
      { error: 'Failed to get journal entries' },
      { status: 500 }
    )
  }
}

// POST - Save journal entry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, journal_win, journal_gratitude, journal_learned, journal_intention, journal_freetext, journal_mood, journal_prompt } = body

    const targetDate = date ? new Date(date) : new Date()
    targetDate.setHours(0, 0, 0, 0)

    // Update the daily guide with journal entry
    const guide = await prisma.dailyGuide.upsert({
      where: {
        user_id_date: {
          user_id: user.id,
          date: targetDate,
        },
      },
      update: {
        ...(journal_win !== undefined && { journal_win }),
        ...(journal_gratitude !== undefined && { journal_gratitude }),
        ...(journal_learned !== undefined && { journal_learned }),
        ...(journal_intention !== undefined && { journal_intention }),
        ...(journal_freetext !== undefined && { journal_freetext }),
        ...(journal_mood !== undefined && { journal_mood }),
        ...(journal_prompt !== undefined && { journal_prompt }),
      },
      create: {
        user_id: user.id,
        date: targetDate,
        day_type: 'work',
        journal_win,
        journal_gratitude,
        journal_learned,
        journal_intention,
        journal_freetext,
        journal_mood,
        journal_prompt,
      },
    })

    // AI Reflection: generate for premium users
    let reflection: string | null = null
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { user_id: user.id },
      })
      const isPremium = subscription?.tier === 'premium' &&
        (subscription?.status === 'active' || subscription?.status === 'trialing')

      if (isPremium && (journal_win || journal_gratitude || journal_learned || journal_freetext)) {
        // Fetch last 7 days of journals for pattern detection
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        weekAgo.setHours(0, 0, 0, 0)

        const recentJournals = await prisma.dailyGuide.findMany({
          where: {
            user_id: user.id,
            date: { gte: weekAgo },
            OR: [
              { journal_win: { not: null } },
              { journal_gratitude: { not: null } },
              { journal_learned: { not: null } },
              { journal_freetext: { not: null } },
            ],
          },
          select: {
            date: true,
            journal_win: true,
            journal_gratitude: true,
            journal_learned: true,
          },
          orderBy: { date: 'desc' },
          take: 7,
        })

        // Fetch active goals for context
        const goals = await prisma.goal.findMany({
          where: { user_id: user.id, status: 'active' },
          select: { title: true, current_count: true, target_count: true },
          take: 5,
        })

        const recentContext = recentJournals
          .map(j => {
            const parts = []
            if (j.journal_win) parts.push(`learned: "${j.journal_win}"`)
            if (j.journal_gratitude) parts.push(`grateful: "${j.journal_gratitude}"`)
            return `${new Date(j.date).toLocaleDateString()}: ${parts.join(', ')}`
          })
          .join('\n')

        const goalsContext = goals.length > 0
          ? `\nActive goals: ${goals.map(g => `${g.title} (${g.current_count}/${g.target_count})`).join(', ')}`
          : ''

        const todayEntry = [
          journal_win ? `Learned: "${journal_win}"` : null,
          journal_gratitude ? `Grateful for: "${journal_gratitude}"` : null,
          journal_learned ? `Insight: "${journal_learned}"` : null,
          journal_freetext ? `Free write: "${journal_freetext}"` : null,
        ].filter(Boolean).join('\n')

        const completion = await getGroq().chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a thoughtful wellness coach. Based on today's journal entry and recent patterns, provide a 1-2 sentence insight or reflection. Be specific, reference their actual words, notice patterns or growth. Don't be generic. Be warm but substantive.${goalsContext}`,
            },
            {
              role: 'user',
              content: `Today's entry:\n${todayEntry}\n\nRecent entries:\n${recentContext}`,
            },
          ],
          max_tokens: 150,
          temperature: 0.7,
        })

        reflection = completion.choices[0]?.message?.content?.trim() || null

        // Save reflection
        if (reflection) {
          await prisma.dailyGuide.update({
            where: {
              user_id_date: {
                user_id: user.id,
                date: targetDate,
              },
            },
            data: { journal_ai_reflection: reflection },
          })
        }
      }
    } catch (reflectionError) {
      console.error('AI reflection error (non-fatal):', reflectionError)
    }

    return NextResponse.json({
      success: true,
      data: {
        date: guide.date,
        journal_win: guide.journal_win,
        journal_gratitude: guide.journal_gratitude,
        journal_learned: guide.journal_learned,
        journal_intention: guide.journal_intention,
        journal_freetext: guide.journal_freetext,
        journal_mood: guide.journal_mood,
        journal_prompt: guide.journal_prompt,
        journal_ai_reflection: reflection,
      },
    })
  } catch (error) {
    console.error('Save journal error:', error)
    return NextResponse.json(
      { error: 'Failed to save journal entry' },
      { status: 500 }
    )
  }
}
