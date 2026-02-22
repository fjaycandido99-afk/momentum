import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import { generateAudio } from '@/lib/daily-guide/audio-utils'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const DEEP_MODEL = 'llama-3.3-70b-versatile'

const THEMES = {
  'stress-relief': 'Guide a gentle stress release meditation. Help the listener let go of tension, breathe deeply, and find calm.',
  'focus': 'Guide a concentration meditation. Help the listener clear mental clutter and sharpen their attention.',
  'self-compassion': 'Guide a self-compassion meditation with kindness affirmations. Help the listener treat themselves with gentleness.',
  'gratitude': 'Guide a gratitude meditation. Help the listener appreciate their life, relationships, and small joys.',
  'body-scan': 'Guide a progressive body scan. Move from head to toe, releasing tension from each body part.',
  'sleep': 'Guide a sleep meditation with progressive relaxation. Use soothing imagery to help the listener drift off.',
  'confidence': 'Guide a confidence-building meditation. Help the listener feel strong, capable, and ready.',
}

function getWordCount(durationMinutes: number): number {
  // ~130 words per minute for slow meditation speech
  return Math.round(durationMinutes * 130)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = rateLimit(`ai-meditation:${user.id}`, { limit: 10, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Check premium
    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const body = await request.json()
    const { theme, durationMinutes, mood } = body
    const wantsAudio = body.generateAudio !== false

    const validTheme = theme && theme in THEMES ? theme : 'stress-relief'
    const duration = Math.min(Math.max(Number(durationMinutes) || 5, 3), 10)
    const wordCount = getWordCount(duration)
    const themePrompt = THEMES[validTheme as keyof typeof THEMES]

    // Get user's tone preference
    let tone = 'calm'
    try {
      const prefs = await prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { guide_tone: true },
      })
      tone = prefs?.guide_tone || 'calm'
    } catch {}

    // Permanent cache key — same theme+duration+tone reuses audio forever
    const cacheKey = `meditation-${validTheme}-${duration}-${tone}`

    let cached = await prisma.audioCache.findUnique({
      where: { cache_key: cacheKey },
    })

    // If exact match not found, try any cached version of this theme (any duration/tone/old date key)
    if (!cached) {
      cached = await prisma.audioCache.findFirst({
        where: { cache_key: { startsWith: `meditation-${validTheme}-` } },
      })
    }

    if (cached) {
      return NextResponse.json({
        script: '',
        audioBase64: wantsAudio ? cached.audio : null,
        theme: validTheme,
        duration,
        cached: true,
      })
    }

    // Generate script (Groq is free — always fresh)
    const contextParts = [
      mood ? `The listener is feeling ${mood}.` : '',
      `Duration: approximately ${duration} minutes.`,
    ].filter(Boolean).join(' ')

    const mindset = await getUserMindset(user.id)

    const baseMeditationPrompt = `You are a calm, soothing meditation guide. Write scripts that are peaceful and reassuring. Use ellipses (...) for natural pauses. No markdown formatting. No section headers. Just flowing, gentle guidance. ${themePrompt}`

    const completion = await getGroq().chat.completions.create({
      model: DEEP_MODEL,
      messages: [
        {
          role: 'system',
          content: buildMindsetSystemPrompt(baseMeditationPrompt, mindset),
        },
        {
          role: 'user',
          content: `Write a ${duration}-minute guided meditation script. About ${wordCount} words. ${contextParts} Make this unique and personal.`,
        },
      ],
      max_tokens: Math.min(wordCount * 2, 1200),
      temperature: 0.8,
    })

    const script = completion.choices[0]?.message?.content?.trim() || ''

    if (!script) {
      return NextResponse.json({ error: 'Failed to generate script' }, { status: 500 })
    }

    // Generate TTS via centralized function (tracks credits + enforces limit)
    let audioBase64: string | null = null

    if (wantsAudio) {
      const result = await generateAudio(script, tone)
      audioBase64 = result.audioBase64

      // Cache permanently so this theme+duration+tone never costs credits again
      if (audioBase64) {
        try {
          await prisma.audioCache.upsert({
            where: { cache_key: cacheKey },
            update: { audio: audioBase64, duration: duration * 60 },
            create: { cache_key: cacheKey, audio: audioBase64, duration: duration * 60 },
          })
        } catch {}
      }
    }

    return NextResponse.json({
      script,
      audioBase64,
      theme: validTheme,
      duration,
      cached: false,
    })
  } catch (error) {
    console.error('AI Meditation API error:', error)
    return NextResponse.json({ error: 'Failed to generate meditation' }, { status: 500 })
  }
}
