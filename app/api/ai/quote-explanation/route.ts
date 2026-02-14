import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'

export const dynamic = 'force-dynamic'

const FALLBACK = 'This quote reminds us to stay present and intentional.'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Premium check
    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const body = await request.json()
    const { quoteText, author } = body

    if (!quoteText) {
      return NextResponse.json({ error: 'quoteText is required' }, { status: 400 })
    }

    const mindset = await getUserMindset(user.id)

    const basePrompt = `You are a wisdom interpreter. Explain in 2-3 sentences why this quote matters for personal growth. Connect it to daily life. Be specific and actionable, not generic. Keep it under 60 words.`

    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: buildMindsetSystemPrompt(basePrompt, mindset),
        },
        {
          role: 'user',
          content: `"${quoteText}" — ${author || 'Unknown'}`,
        },
      ],
      max_tokens: 120,
      temperature: 0.7,
    })

    const explanation = completion.choices[0]?.message?.content?.trim() || FALLBACK

    return NextResponse.json({ explanation })
  } catch (error) {
    console.error('Quote explanation error:', error)
    return NextResponse.json({ explanation: FALLBACK })
  }
}
