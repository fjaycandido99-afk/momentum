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

    // Premium: Groq picks the best quote from 10 random ones
    if (isPremium) {
      try {
        const candidates = getRandomQuotes(10)
        const candidateList = candidates
          .map((q, i) => `${i}: "${q.text}" — ${q.author}`)
          .join('\n')

        const completion = await getGroq().chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a quote selector. Given a user's current state and a list of quotes, pick the single best quote for them. Reply with ONLY the number (0-9) of the best quote. Nothing else.`,
            },
            {
              role: 'user',
              content: `User state: mood=${mood || 'unknown'}, energy=${energy || 'unknown'}, day_type=${dayType || 'unknown'}\n\nQuotes:\n${candidateList}`,
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
