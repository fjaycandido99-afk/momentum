import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'

export const dynamic = 'force-dynamic'

const DEEP_MODEL = 'llama-3.3-70b-versatile'

export async function GET(request: NextRequest) {
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

    // Determine month
    const monthParam = request.nextUrl.searchParams.get('month')
    let startDate: Date
    let endDate: Date

    if (monthParam) {
      // Format: "2026-01"
      const [year, month] = monthParam.split('-').map(Number)
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0) // Last day of month
    } else {
      // Default: previous month
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0)
    }
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    // Check cache on the first day of the month
    const cacheDate = new Date(startDate)
    const cached = await prisma.dailyGuide.findUnique({
      where: { user_id_date: { user_id: user.id, date: cacheDate } },
      select: { ai_monthly_retrospective: true },
    })

    if (cached?.ai_monthly_retrospective) {
      try {
        return NextResponse.json({ ...JSON.parse(cached.ai_monthly_retrospective), cached: true })
      } catch {
        // Bad cache
      }
    }

    // Fetch month's data
    const guides = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: startDate, lte: endDate },
      },
      select: {
        date: true,
        journal_win: true,
        journal_gratitude: true,
        journal_learned: true,
        journal_freetext: true,
        journal_mood: true,
        journal_tags: true,
        energy_level: true,
        morning_prime_done: true,
        breath_done: true,
        movement_done: true,
        day_close_done: true,
        ai_wellness_score: true,
      },
      orderBy: { date: 'asc' },
    })

    if (guides.length < 5) {
      return NextResponse.json({
        insufficient: true,
        message: 'Need at least 5 days of data for a monthly review.',
        stats: { totalDays: guides.length },
      })
    }

    // Compute stats
    const totalDays = guides.length
    const journalDays = guides.filter(g => g.journal_win || g.journal_gratitude || g.journal_freetext).length
    const moodCounts: Record<string, number> = {}
    const allTags: string[] = []
    let totalWellness = 0
    let wellnessCount = 0

    guides.forEach(g => {
      if (g.journal_mood) {
        moodCounts[g.journal_mood] = (moodCounts[g.journal_mood] || 0) + 1
      }
      if (g.journal_tags) {
        allTags.push(...g.journal_tags)
      }
      if (g.ai_wellness_score) {
        totalWellness += g.ai_wellness_score
        wellnessCount++
      }
    })

    // Top tags
    const tagFreq: Record<string, number> = {}
    allTags.forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 1 })
    const topTags = Object.entries(tagFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag)

    // Mood chart data
    const moodChart = guides
      .filter(g => g.journal_mood)
      .map(g => ({
        date: new Date(g.date).toISOString().split('T')[0],
        mood: g.journal_mood,
      }))

    const stats = {
      totalDays,
      journalDays,
      dominantMood: Object.entries(moodCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'okay',
      avgWellness: wellnessCount > 0 ? Math.round(totalWellness / wellnessCount) : null,
      topTags,
      moodChart,
    }

    // AI narrative generation
    const journalSummary = guides
      .filter(g => g.journal_win || g.journal_gratitude || g.journal_freetext)
      .slice(0, 15) // Limit for context window
      .map(g => {
        const parts = []
        if (g.journal_win) parts.push(`Win: "${g.journal_win.substring(0, 80)}"`)
        if (g.journal_gratitude) parts.push(`Grateful: "${g.journal_gratitude.substring(0, 80)}"`)
        if (g.journal_freetext) parts.push(`Wrote: "${g.journal_freetext.substring(0, 80)}"`)
        if (g.journal_mood) parts.push(`Mood: ${g.journal_mood}`)
        return `${new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${parts.join(', ')}`
      })
      .join('\n')

    const mindset = await getUserMindset(user.id)
    const monthLabel = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const basePrompt = `You are a personal growth analyst reviewing a user's monthly data. Return valid JSON with these fields:
- "emotionalArc": 2-3 sentence narrative of their emotional journey this month
- "commonThemes": Array of 3-5 string themes you observed
- "goalProgress": 1-2 sentence assessment of their progress
- "bestDays": Array of 2-3 strings describing standout days
- "growthInsights": Array of 3 string observations about their growth
- "nextMonthSuggestion": 1-2 sentence suggestion for next month

Return valid JSON only. Be specific to their data.`

    let aiNarrative = null
    try {
      const completion = await getGroq().chat.completions.create({
        model: DEEP_MODEL,
        messages: [
          { role: 'system', content: buildMindsetSystemPrompt(basePrompt, mindset) },
          {
            role: 'user',
            content: `Month: ${monthLabel}\nDays tracked: ${totalDays}\nJournal days: ${journalDays}\nDominant mood: ${stats.dominantMood}\nTop themes: ${topTags.join(', ')}\n\nJournal entries:\n${journalSummary}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      })

      const raw = completion.choices[0]?.message?.content?.trim() || ''
      aiNarrative = JSON.parse(raw)
    } catch {
      // AI narrative failed, return stats only
    }

    const result = {
      month: monthLabel,
      stats,
      ...(aiNarrative || {}),
    }

    // Cache
    try {
      await prisma.dailyGuide.upsert({
        where: { user_id_date: { user_id: user.id, date: cacheDate } },
        update: { ai_monthly_retrospective: JSON.stringify(result) },
        create: {
          user_id: user.id,
          date: cacheDate,
          day_type: 'work',
          ai_monthly_retrospective: JSON.stringify(result),
        },
      })
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ ...result, cached: false })
  } catch (error) {
    console.error('Monthly retrospective error:', error)
    return NextResponse.json({ error: 'Failed to generate retrospective' }, { status: 500 })
  }
}
