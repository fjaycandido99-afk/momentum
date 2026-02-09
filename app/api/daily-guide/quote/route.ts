import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { QUOTES, getRandomQuotes, getHeuristicQuote, getDayOfYearQuote } from '@/lib/quotes'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const searchParams = request.nextUrl.searchParams
    const mood = searchParams.get('mood') || undefined
    const energy = searchParams.get('energy') || undefined
    const dayType = searchParams.get('day_type') || undefined

    // No context at all → dayOfYear fallback
    if (!mood && !energy && !dayType) {
      const quote = getDayOfYearQuote()
      return NextResponse.json({ quote, source: 'fallback' })
    }

    // Check premium status
    let isPremium = false
    if (user) {
      const subscription = await prisma.subscription.findUnique({
        where: { user_id: user.id },
      })
      isPremium = subscription?.tier === 'premium' &&
        (subscription?.status === 'active' || subscription?.status === 'trialing')
    }

    // Premium: Groq picks the best quote with mood trend + journal context
    if (isPremium && user) {
      try {
        const candidates = getRandomQuotes(10)
        const candidateList = candidates
          .map((q, i) => `${i}: "${q.text}" — ${q.author}`)
          .join('\n')

        // Fetch last 7 days of mood trends
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        weekAgo.setHours(0, 0, 0, 0)

        const recentGuides = await prisma.dailyGuide.findMany({
          where: {
            user_id: user.id,
            date: { gte: weekAgo },
          },
          select: {
            mood_before: true,
            mood_after: true,
            journal_win: true,
            journal_gratitude: true,
          },
          orderBy: { date: 'desc' },
          take: 7,
        })

        // Build mood trend context
        const moodValues: Record<string, number> = { low: 1, medium: 2, high: 3 }
        const moodEntries = recentGuides
          .filter(g => g.mood_before || g.mood_after)
          .map(g => ({
            before: g.mood_before ? moodValues[g.mood_before] ?? 2 : null,
            after: g.mood_after ? moodValues[g.mood_after] ?? 2 : null,
          }))

        let moodTrendText = ''
        if (moodEntries.length >= 3) {
          const recentAvg = moodEntries.slice(0, 3)
            .map(m => m.after ?? m.before ?? 2)
            .reduce((a, b) => a + b, 0) / 3
          const olderAvg = moodEntries.slice(-3)
            .map(m => m.after ?? m.before ?? 2)
            .reduce((a, b) => a + b, 0) / Math.min(3, moodEntries.slice(-3).length)
          if (recentAvg > olderAvg + 0.3) moodTrendText = 'Mood trending upward recently.'
          else if (recentAvg < olderAvg - 0.3) moodTrendText = 'Mood has been declining recently.'
          else moodTrendText = 'Mood has been steady.'
        }

        // Extract journal themes
        const journalThemes = recentGuides
          .map(g => [g.journal_win, g.journal_gratitude].filter(Boolean).join('. '))
          .filter(Boolean)
          .slice(0, 3)
          .map(t => t.substring(0, 60))
          .join('; ')

        const userContext = [
          `Current: mood=${mood || 'unknown'}, energy=${energy || 'unknown'}, day_type=${dayType || 'unknown'}`,
          moodTrendText || null,
          journalThemes ? `Recent journal themes: ${journalThemes}` : null,
        ].filter(Boolean).join('\n')

        const completion = await getGroq().chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a quote selector. Given a user's current state, mood trends, and life themes, pick the single best quote that will resonate most deeply. Reply with ONLY the number (0-9) of the best quote. Nothing else.`,
            },
            {
              role: 'user',
              content: `${userContext}\n\nQuotes:\n${candidateList}`,
            },
          ],
          max_tokens: 5,
          temperature: 0.3,
        })

        const reply = completion.choices[0]?.message?.content?.trim() || '0'
        const index = parseInt(reply, 10)
        const selectedIndex = isNaN(index) || index < 0 || index >= candidates.length ? 0 : index
        return NextResponse.json({ quote: candidates[selectedIndex], source: 'ai' })
      } catch (error) {
        console.error('Smart quote AI error, falling back:', error)
        // Fall through to heuristic
      }
    }

    // Free tier: heuristic category match
    const quote = getHeuristicQuote(mood, energy)
    return NextResponse.json({ quote, source: 'heuristic' })
  } catch (error) {
    console.error('Quote API error:', error)
    const quote = getDayOfYearQuote()
    return NextResponse.json({ quote, source: 'fallback' })
  }
}
