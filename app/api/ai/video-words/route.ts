import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = rateLimit(`ai-video-words:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { title } = body

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You generate powerful single words that capture the emotional essence of a motivational video. Return ONLY a JSON array of exactly 10 uppercase single-word strings. No explanation, no markdown — just the JSON array. Example: ["DISCIPLINE","COURAGE","RISE","FEARLESS","PERSIST","EVOLVE","STRENGTH","CLARITY","CONQUER","UNSTOPPABLE"]',
        },
        {
          role: 'user',
          content: title,
        },
      ],
      max_tokens: 100,
      temperature: 0.8,
    })

    const raw = completion.choices[0]?.message?.content?.trim() || '[]'

    let words: string[]
    try {
      words = JSON.parse(raw)
      if (!Array.isArray(words)) throw new Error('not array')
      words = words.filter(w => typeof w === 'string').slice(0, 10).map(w => w.toUpperCase())
    } catch {
      words = ['FOCUS', 'RISE', 'STRENGTH', 'BELIEVE', 'PERSIST', 'EVOLVE', 'COURAGE', 'CLARITY', 'CONQUER', 'UNSTOPPABLE']
    }

    return NextResponse.json({ words })
  } catch (error) {
    console.error('Video words error:', error)
    return NextResponse.json({
      words: ['FOCUS', 'RISE', 'STRENGTH', 'BELIEVE', 'PERSIST', 'EVOLVE', 'COURAGE', 'CLARITY', 'CONQUER', 'UNSTOPPABLE'],
    })
  }
}
