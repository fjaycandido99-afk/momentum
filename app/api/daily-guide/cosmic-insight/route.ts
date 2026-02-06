import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { getZodiacTraits, getElementContext, getRandomCosmicTheme } from '@/lib/ai/zodiac-traits'

export const dynamic = 'force-dynamic'

// Fallback cosmic insights for when AI is unavailable
const FALLBACK_INSIGHTS = [
  {
    text: 'The cosmos reminds you that every ending creates space for a new beginning. Trust the timing of your life.',
    influence: 'Lunar energy',
    affirmation: 'I trust the natural flow of my journey.',
  },
  {
    text: 'Today holds a spark of inspiration waiting to be noticed. Stay open to unexpected moments of clarity.',
    influence: 'Solar alignment',
    affirmation: 'I am open to receiving wisdom from unexpected sources.',
  },
  {
    text: 'Your inner strength is being highlighted by the stars. What feels challenging today is building your resilience.',
    influence: 'Mars transit',
    affirmation: 'I am stronger than my challenges.',
  },
  {
    text: 'Connections with others carry extra meaning right now. A small conversation could lead to big insights.',
    influence: 'Mercury retrograde',
    affirmation: 'I am present in my conversations and connections.',
  },
  {
    text: 'The universe is inviting you to slow down and listen. Answers often come in moments of stillness.',
    influence: 'Venus alignment',
    affirmation: 'In stillness, I find my answers.',
  },
  {
    text: 'Your intuition is particularly sharp today. Trust those gut feelings - they are guiding you well.',
    influence: 'Neptune influence',
    affirmation: 'I trust my inner knowing.',
  },
  {
    text: 'Growth often happens in the space between comfort and challenge. You are exactly where you need to be.',
    influence: 'Jupiter expansion',
    affirmation: 'I am growing in perfect timing.',
  },
]

interface CosmicInsight {
  text: string
  influence: string
  affirmation: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Allow guests to get a basic insight
    const { searchParams } = new URL(request.url)
    const zodiacSign = searchParams.get('zodiac')
    const dayType = searchParams.get('day_type')
    const dateStr = searchParams.get('date')

    // Get today's date key for caching
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateKey = dateStr || today.toISOString().split('T')[0]

    // Check for cached insight in the user's DailyGuide
    if (user) {
      const guide = await prisma.dailyGuide.findUnique({
        where: {
          user_id_date: {
            user_id: user.id,
            date: new Date(dateKey),
          },
        },
        select: {
          cosmic_insight_script: true,
        },
      })

      // Return cached if exists
      if (guide?.cosmic_insight_script) {
        try {
          const cached = JSON.parse(guide.cosmic_insight_script)
          return NextResponse.json({ insight: cached, cached: true })
        } catch {
          // Invalid JSON, regenerate
        }
      }
    }

    // Generate new cosmic insight
    let insight: CosmicInsight

    // If no zodiac sign, use fallback
    if (!zodiacSign) {
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
      insight = FALLBACK_INSIGHTS[dayOfYear % FALLBACK_INSIGHTS.length]
    } else {
      // Try AI generation
      try {
        if (!process.env.GROQ_API_KEY) {
          throw new Error('GROQ_API_KEY not set')
        }

        const zodiacTraits = getZodiacTraits(zodiacSign)
        if (!zodiacTraits) {
          throw new Error('Invalid zodiac sign')
        }

        const elementContext = getElementContext(zodiacTraits.element)
        const theme = getRandomCosmicTheme(zodiacSign)
        const dayContext = dayType ? `This is a ${dayType} day.` : ''

        const completion = await getGroq().chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a gentle cosmic guide providing daily astrological insights. Your tone is warm, encouraging, and grounded - NOT mystical-preachy or dramatic. Keep it practical and relatable.

Zodiac Sign: ${zodiacSign}
Element: ${zodiacTraits.element} - ${elementContext}
Key Traits: ${zodiacTraits.traits}
Today's Theme: ${theme}
${dayContext}

Generate a cosmic insight with:
1. "text": A 2-3 sentence insight relevant to the sign's energy today (no "As a [sign]..." - speak directly)
2. "influence": A brief planetary or cosmic influence (e.g., "Mercury in motion", "Lunar cycle", "Solar warmth")
3. "affirmation": A short, first-person affirmation aligned with the sign's strengths

Respond ONLY with valid JSON:
{"text": "...", "influence": "...", "affirmation": "..."}`,
            },
            {
              role: 'user',
              content: `Generate today's cosmic insight for ${zodiacSign}.`,
            },
          ],
          max_tokens: 200,
          temperature: 0.85,
        })

        const content = completion.choices[0]?.message?.content
        if (!content) throw new Error('No response')

        // Parse the JSON response
        const parsed = JSON.parse(content.trim())
        insight = {
          text: parsed.text || 'The stars remind you of your inner strength today.',
          influence: parsed.influence || 'Cosmic alignment',
          affirmation: parsed.affirmation || 'I am aligned with my highest path.',
        }
      } catch (error) {
        console.error('Cosmic insight generation error:', error)
        // Use zodiac-aware fallback
        const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
        insight = FALLBACK_INSIGHTS[dayOfYear % FALLBACK_INSIGHTS.length]
      }
    }

    // Cache the insight for logged-in users
    if (user) {
      try {
        await prisma.dailyGuide.upsert({
          where: {
            user_id_date: {
              user_id: user.id,
              date: new Date(dateKey),
            },
          },
          update: {
            cosmic_insight_script: JSON.stringify(insight),
          },
          create: {
            user_id: user.id,
            date: new Date(dateKey),
            day_type: dayType || 'work',
            cosmic_insight_script: JSON.stringify(insight),
          },
        })
      } catch (cacheError) {
        console.error('Failed to cache cosmic insight:', cacheError)
      }
    }

    return NextResponse.json({ insight, cached: false })
  } catch (error) {
    console.error('Cosmic insight API error:', error)
    // Always return something useful
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
    const fallback = FALLBACK_INSIGHTS[dayOfYear % FALLBACK_INSIGHTS.length]
    return NextResponse.json({ insight: fallback, cached: false, fallback: true })
  }
}
