import { NextRequest, NextResponse } from 'next/server'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { getZodiacTraits, getElementContext } from '@/lib/ai/zodiac-traits'
import { getFallbackAffirmations } from '@/lib/astrology/fallback-affirmations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zodiacSign = searchParams.get('sign')

    if (!zodiacSign) {
      return NextResponse.json(
        { error: 'Missing sign parameter' },
        { status: 400 }
      )
    }

    const traits = getZodiacTraits(zodiacSign)
    if (!traits) {
      return NextResponse.json(
        { error: 'Invalid zodiac sign' },
        { status: 400 }
      )
    }

    // Try AI generation
    try {
      if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY not set')
      }

      const elementContext = getElementContext(traits.element)

      const completion = await getGroq().chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a cosmic guide creating personalized affirmations. Generate exactly 3 unique, powerful affirmations for a ${zodiacSign} (${traits.element} element).

Sign traits: ${traits.traits}
Strengths: ${traits.strengths}
Affirmation style: ${traits.affirmationStyle}
Element energy: ${elementContext}

Each affirmation should be:
- First person ("I am...", "I embrace...", "My...")
- 1-2 sentences max
- Grounded and empowering, not fluffy
- Personalized to this sign's energy and strengths

Respond ONLY with valid JSON:
{"affirmations": ["...", "...", "..."]}`,
          },
          {
            role: 'user',
            content: `Generate 3 zodiac-tuned affirmations for ${zodiacSign} today.`,
          },
        ],
        max_tokens: 250,
        temperature: 0.85,
      })

      const content = completion.choices[0]?.message?.content
      if (!content) throw new Error('No response')

      const parsed = JSON.parse(content.trim())
      const affirmations = parsed.affirmations

      if (!Array.isArray(affirmations) || affirmations.length < 3) {
        throw new Error('Invalid affirmation format')
      }

      return NextResponse.json({
        affirmations: affirmations.slice(0, 3),
        source: 'ai',
      })
    } catch (error) {
      console.error('Affirmation AI generation error:', error)
      // Fall back to pre-written affirmations
      const fallback = getFallbackAffirmations(zodiacSign)
      return NextResponse.json({
        affirmations: fallback,
        source: 'fallback',
      })
    }
  } catch (error) {
    console.error('Affirmations API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate affirmations' },
      { status: 500 }
    )
  }
}
