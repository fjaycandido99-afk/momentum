import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
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
    const subscription = await prisma.subscription.findUnique({
      where: { user_id: user.id },
    })

    const isPremium = subscription?.tier === 'premium' &&
      (subscription?.status === 'active' || subscription?.status === 'trialing')

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    // Fetch last 7 days of data
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
        day_type: true,
        energy_level: true,
        mood_before: true,
        mood_after: true,
        journal_win: true,
        journal_gratitude: true,
        journal_learned: true,
        morning_prime_done: true,
        movement_done: true,
        micro_lesson_done: true,
        breath_done: true,
        day_close_done: true,
      },
      orderBy: { date: 'asc' },
    })

    // Compute stats
    let completedDays = 0
    let totalModules = 0
    let journalEntries = 0
    let moodImproved = 0
    let moodTracked = 0
    const energyCounts = { low: 0, normal: 0, high: 0 }
    const wins: string[] = []
    const gratitudes: string[] = []
    const learneds: string[] = []
    const moodChart: { date: string; before: number | null; after: number | null }[] = []

    const moodOrder: Record<string, number> = { low: 0, medium: 1, high: 2 }

    for (const g of guides) {
      let modules = 0
      if (g.morning_prime_done) modules++
      if (g.movement_done) modules++
      if (g.micro_lesson_done) modules++
      if (g.breath_done) modules++
      if (g.day_close_done) modules++

      totalModules += modules
      if (modules >= 4) completedDays++

      if (g.journal_win) { journalEntries++; wins.push(g.journal_win) }
      if (g.journal_gratitude) gratitudes.push(g.journal_gratitude)
      if (g.journal_learned) learneds.push(g.journal_learned)

      if (g.energy_level && g.energy_level in energyCounts) {
        energyCounts[g.energy_level as keyof typeof energyCounts]++
      }

      // Mood chart data
      const dateStr = new Date(g.date).toISOString().split('T')[0]
      moodChart.push({
        date: dateStr,
        before: g.mood_before ? (moodOrder[g.mood_before] ?? null) : null,
        after: g.mood_after ? (moodOrder[g.mood_after] ?? null) : null,
      })

      if (g.mood_before && g.mood_after) {
        moodTracked++
        if ((moodOrder[g.mood_after] ?? 0) > (moodOrder[g.mood_before] ?? 0)) moodImproved++
      }
    }

    const completionRate = Math.round((completedDays / 7) * 100)
    const moodImprovedPercent = moodTracked > 0 ? Math.round((moodImproved / moodTracked) * 100) : 0

    // Build context for AI narrative + insights
    const statsContext = [
      `${completedDays}/7 full days completed (${completionRate}% completion)`,
      `${totalModules} total modules done`,
      `${journalEntries} journal entries`,
      moodTracked > 0 ? `Mood improved ${moodImprovedPercent}% of tracked days` : null,
      wins.length > 0 ? `Key wins: ${wins.slice(0, 3).map(w => `"${w.substring(0, 50)}"`).join(', ')}` : null,
      gratitudes.length > 0 ? `Gratitude themes: ${gratitudes.slice(0, 2).map(g => `"${g.substring(0, 40)}"`).join(', ')}` : null,
      learneds.length > 0 ? `Lessons learned: ${learneds.slice(0, 2).map(l => `"${l.substring(0, 40)}"`).join(', ')}` : null,
      `Energy distribution: low=${energyCounts.low}, normal=${energyCounts.normal}, high=${energyCounts.high}`,
    ].filter(Boolean).join('\n')

    // Generate AI narrative + insights using the deeper model
    const completion = await getGroq().chat.completions.create({
      model: DEEP_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a warm personal wellness coach reflecting on a user's week. Generate a JSON response with these exact fields:
- "summary": A 3-4 sentence encouraging narrative summary. Be specific about their data, highlight patterns, celebrate wins, and gently suggest one area to focus on. Don't use bullet points. Keep it conversational and personal.
- "insights": An array of exactly 3 short pattern observations (max 15 words each). These should be specific, data-backed insights. Example: "Your mood improved most on days you journaled."
- "nextWeekFocus": A single sentence suggestion for what to focus on next week, based on their weakest area.

Respond with valid JSON only. No markdown.`,
        },
        {
          role: 'user',
          content: `Here's my week:\n${statsContext}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    })

    const rawResponse = completion.choices[0]?.message?.content?.trim() || ''

    let summary = 'Great work this week! Keep showing up for yourself.'
    let insights: string[] = []
    let nextWeekFocus = ''

    try {
      const parsed = JSON.parse(rawResponse)
      summary = parsed.summary || summary
      insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : []
      nextWeekFocus = parsed.nextWeekFocus || ''
    } catch {
      // If JSON parsing fails, use the raw response as the summary
      if (rawResponse.length > 20) {
        summary = rawResponse
      }
    }

    // Cache insights on today's guide
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    try {
      await prisma.dailyGuide.upsert({
        where: {
          user_id_date: {
            user_id: user.id,
            date: today,
          },
        },
        update: {
          ai_weekly_insights: JSON.stringify(insights),
          ai_weekly_focus: nextWeekFocus,
        },
        create: {
          user_id: user.id,
          date: today,
          day_type: 'work',
          ai_weekly_insights: JSON.stringify(insights),
          ai_weekly_focus: nextWeekFocus,
        },
      })
    } catch {
      // Non-fatal caching error
    }

    return NextResponse.json({
      summary,
      insights,
      nextWeekFocus,
      moodChart,
      stats: {
        completedDays,
        totalModules,
        journalEntries,
        completionRate,
        moodImprovedPercent,
        energyCounts,
      },
    })
  } catch (error) {
    console.error('Weekly summary API error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
