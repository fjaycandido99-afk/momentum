import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import { getRecentJournals, formatJournalContext } from '@/lib/daily-guide/journal-context'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const DEEP_MODEL = 'llama-3.3-70b-versatile'

const FALLBACK_LETTER = `Dear You,

I want you to know that every step you've taken matters. The days that felt small were building something extraordinary. Your consistency, even when imperfect, is creating a foundation that future you will stand on with pride.

Keep going. Not because it's easy, but because you've already proven you can.

With belief in your journey.`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = rateLimit(`ai-letter-to-self:${user.id}`, { limit: 5, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const body = await request.json()
    const { type = 'future', milestone } = body as { type: 'future' | 'past'; milestone?: string }

    // Check cache
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayGuide = await prisma.dailyGuide.findUnique({
      where: { user_id_date: { user_id: user.id, date: today } },
      select: { ai_letter_to_self: true },
    })

    if (todayGuide?.ai_letter_to_self) {
      try {
        const cached = JSON.parse(todayGuide.ai_letter_to_self)
        if (cached.type === type) {
          return NextResponse.json({ ...cached, cached: true })
        }
      } catch {
        // Bad cache
      }
    }

    // Gather user data
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const [journals, goals, prefs] = await Promise.all([
      getRecentJournals(user.id, 30, 15),
      prisma.goal.findMany({
        where: { user_id: user.id },
        select: { title: true, status: true, current_count: true, target_count: true },
        take: 5,
      }),
      prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { current_streak: true },
      }),
    ])

    const mindset = await getUserMindset(user.id)
    const streak = prefs?.current_streak || 0

    const journalContext = formatJournalContext(journals.slice(0, 10))

    const allTags = journals.flatMap(j => j.journal_tags || [])
    const tagFreq: Record<string, number> = {}
    allTags.forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 1 })
    const topThemes = Object.entries(tagFreq).sort(([, a], [, b]) => b - a).slice(0, 5).map(([t]) => t)

    const goalContext = goals.map(g =>
      `${g.title}: ${g.status === 'completed' ? 'Completed!' : `${g.current_count}/${g.target_count}`}`
    ).join(', ')

    const letterType = type === 'future'
      ? 'Write a heartfelt letter FROM the user\'s future self TO their present self. The future self has achieved their goals and looks back with love. Acknowledge current struggles, celebrate wins so far, promise what consistency builds.'
      : 'Write a heartfelt letter FROM the user\'s present self TO their past self. Reflect on how far they\'ve come. Reassure the past self that the hard days were worth it.'

    const basePrompt = `${letterType}

Rules:
- 200-300 words
- Use their REAL data — reference specific wins, themes, and struggles
- Be intimate, emotional, and specific — NOT generic motivation
- Write in first person ("I" for the letter writer, "you" for the recipient)
- Include a greeting and a closing
- Make it something they'd want to save and re-read`

    const userContent = [
      milestone ? `Milestone: ${milestone}` : null,
      `Current streak: ${streak} days`,
      `Top themes: ${topThemes.join(', ')}`,
      goals.length > 0 ? `Goals: ${goalContext}` : null,
      journals.length > 0 ? `Recent journal entries:\n${journalContext}` : null,
    ].filter(Boolean).join('\n')

    const completion = await getGroq().chat.completions.create({
      model: DEEP_MODEL,
      messages: [
        { role: 'system', content: buildMindsetSystemPrompt(basePrompt, mindset) },
        { role: 'user', content: userContent || 'Generate a general letter of encouragement.' },
      ],
      max_tokens: 500,
      temperature: 0.8,
    })

    const letter = completion.choices[0]?.message?.content?.trim() || FALLBACK_LETTER

    const result = { type, letter, milestone: milestone || null }

    // Cache
    try {
      await prisma.dailyGuide.upsert({
        where: { user_id_date: { user_id: user.id, date: today } },
        update: { ai_letter_to_self: JSON.stringify(result) },
        create: {
          user_id: user.id,
          date: today,
          day_type: 'work',
          ai_letter_to_self: JSON.stringify(result),
        },
      })
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ ...result, cached: false })
  } catch (error) {
    console.error('Letter to self error:', error)
    return NextResponse.json({
      type: 'future',
      letter: FALLBACK_LETTER,
      milestone: null,
    })
  }
}
