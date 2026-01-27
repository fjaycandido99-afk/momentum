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

      if (g.energy_level && g.energy_level in energyCounts) {
        energyCounts[g.energy_level as keyof typeof energyCounts]++
      }

      if (g.mood_before && g.mood_after) {
        moodTracked++
        const order: Record<string, number> = { low: 0, medium: 1, high: 2 }
        if ((order[g.mood_after] ?? 0) > (order[g.mood_before] ?? 0)) moodImproved++
      }
    }

    const completionRate = Math.round((completedDays / 7) * 100)
    const moodImprovedPercent = moodTracked > 0 ? Math.round((moodImproved / moodTracked) * 100) : 0

    // Build context for AI narrative
    const statsContext = [
      `${completedDays}/7 full days completed (${completionRate}% completion)`,
      `${totalModules} total modules done`,
      `${journalEntries} journal entries`,
      moodTracked > 0 ? `Mood improved ${moodImprovedPercent}% of tracked days` : null,
      wins.length > 0 ? `Key wins: ${wins.slice(0, 3).map(w => `"${w.substring(0, 50)}"`).join(', ')}` : null,
      gratitudes.length > 0 ? `Gratitude themes: ${gratitudes.slice(0, 2).map(g => `"${g.substring(0, 40)}"`).join(', ')}` : null,
    ].filter(Boolean).join('\n')

    // Generate AI narrative
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a warm personal wellness coach reflecting on a user's week. Write a 3-4 sentence encouraging narrative summary. Be specific about their data, highlight patterns, celebrate wins, and gently suggest one area to focus on. Don't use bullet points. Keep it conversational and personal.`,
        },
        {
          role: 'user',
          content: `Here's my week:\n${statsContext}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    })

    const summary = completion.choices[0]?.message?.content?.trim() ||
      'Great work this week! Keep showing up for yourself.'

    return NextResponse.json({
      summary,
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
