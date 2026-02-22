import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const DEEP_MODEL = 'llama-3.3-70b-versatile'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = rateLimit(`ai-dream:${user.id}`, { limit: 10, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Premium check
    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const body = await request.json()
    const { dreamText } = body

    if (!dreamText?.trim()) {
      return NextResponse.json({ error: 'dreamText is required' }, { status: 400 })
    }

    if (dreamText.length > 5000) {
      return NextResponse.json({ error: 'dreamText is too long' }, { status: 400 })
    }

    const mindset = await getUserMindset(user.id)

    const basePrompt = `You are a dream analyst inspired by Jungian psychology. Analyze dreams with symbolic depth and practical connection to daily life.

Return valid JSON with this exact structure:
{
  "symbols": [
    { "symbol": "string", "meaning": "string" }
  ],
  "emotionalTheme": "string",
  "connectionToLife": "string",
  "mindsetReflection": "string"
}

Rules:
- Identify 2-4 key symbols from the dream with their psychological meanings
- Name the dominant emotional theme in 1 sentence
- Connect the dream to the user's waking life in 1-2 sentences
- Offer a philosophical reflection relevant to their growth in 1-2 sentences
- Be insightful, not sensational
- Return valid JSON only`

    const completion = await getGroq().chat.completions.create({
      model: DEEP_MODEL,
      messages: [
        {
          role: 'system',
          content: buildMindsetSystemPrompt(basePrompt, mindset),
        },
        {
          role: 'user',
          content: `My dream: ${dreamText}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    })

    const rawResponse = completion.choices[0]?.message?.content?.trim() || ''

    let interpretation = {
      symbols: [] as { symbol: string; meaning: string }[],
      emotionalTheme: '',
      connectionToLife: '',
      mindsetReflection: '',
    }

    try {
      const parsed = JSON.parse(rawResponse)
      interpretation = {
        symbols: Array.isArray(parsed.symbols)
          ? parsed.symbols.slice(0, 4).map((s: { symbol?: string; meaning?: string }) => ({
              symbol: s.symbol || '',
              meaning: s.meaning || '',
            }))
          : [],
        emotionalTheme: parsed.emotionalTheme || '',
        connectionToLife: parsed.connectionToLife || '',
        mindsetReflection: parsed.mindsetReflection || '',
      }
    } catch {
      // Fallback
      interpretation.emotionalTheme = 'Your dream carries rich symbolism worth exploring.'
      interpretation.connectionToLife = 'Consider what feelings this dream evoked and how they relate to your current state.'
      interpretation.mindsetReflection = 'Dreams often reveal what our waking mind overlooks. Sit with these images today.'
    }

    // Save to today's guide
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
      await prisma.dailyGuide.upsert({
        where: { user_id_date: { user_id: user.id, date: today } },
        update: {
          journal_dream: dreamText,
          journal_dream_interpretation: JSON.stringify(interpretation),
        },
        create: {
          user_id: user.id,
          date: today,
          day_type: 'work',
          journal_dream: dreamText,
          journal_dream_interpretation: JSON.stringify(interpretation),
        },
      })
    } catch {
      // Non-fatal
    }

    return NextResponse.json(interpretation)
  } catch (error) {
    console.error('Dream interpretation error:', error)
    return NextResponse.json({
      symbols: [],
      emotionalTheme: 'Your dream carries rich symbolism worth exploring.',
      connectionToLife: 'Consider what feelings this dream evoked.',
      mindsetReflection: 'Dreams often reveal what our waking mind overlooks.',
    })
  }
}
