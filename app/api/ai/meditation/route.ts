import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'

export const dynamic = 'force-dynamic'

const DEEP_MODEL = 'llama-3.3-70b-versatile'

// Voice ID mapping (reused from calm-voice)
const TONE_VOICES: Record<string, string> = {
  calm: 'XB0fDUnXU5powFXDhCwa',
  neutral: 'uju3wxzG5OhpWcoi3SMy',
  direct: 'goT3UYdM9bhm0n2lmKQx',
}

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

    // Check premium
    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const { theme, durationMinutes, mood, generateAudio } = await request.json()

    const validTheme = theme && theme in THEMES ? theme : 'stress-relief'
    const duration = Math.min(Math.max(Number(durationMinutes) || 5, 3), 10)
    const wordCount = getWordCount(duration)
    const themePrompt = THEMES[validTheme as keyof typeof THEMES]

    // Check cache
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const cacheKey = `meditation-${validTheme}-${dateStr}-${duration}`

    const cached = await prisma.audioCache.findUnique({
      where: { cache_key: cacheKey },
    })

    if (cached) {
      return NextResponse.json({
        script: '',
        audioBase64: generateAudio ? cached.audio : null,
        theme: validTheme,
        duration,
        cached: true,
      })
    }

    // Generate script
    const contextParts = [
      mood ? `The listener is feeling ${mood}.` : '',
      `Duration: approximately ${duration} minutes.`,
    ].filter(Boolean).join(' ')

    // Fetch user's mindset
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
          content: `Write a ${duration}-minute guided meditation script. About ${wordCount} words. ${contextParts} Make this unique and personal. Today is ${dateStr}.`,
        },
      ],
      max_tokens: Math.min(wordCount * 2, 1200),
      temperature: 0.8,
    })

    const script = completion.choices[0]?.message?.content?.trim() || ''

    if (!script) {
      return NextResponse.json({ error: 'Failed to generate script' }, { status: 500 })
    }

    // Optionally generate TTS
    let audioBase64: string | null = null

    if (generateAudio) {
      const apiKey = process.env.ELEVENLABS_API_KEY
      if (apiKey) {
        // Get user's tone preference
        let tone = 'calm'
        try {
          const prefs = await prisma.userPreferences.findUnique({
            where: { user_id: user.id },
            select: { guide_tone: true },
          })
          tone = prefs?.guide_tone || 'calm'
        } catch {
          // Default to calm
        }

        const voiceId = TONE_VOICES[tone] || TONE_VOICES.calm

        const ttsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': apiKey,
            },
            body: JSON.stringify({
              text: script,
              model_id: 'eleven_turbo_v2_5',
              voice_settings: {
                stability: 0.65,
                similarity_boost: 0.7,
              },
            }),
          }
        )

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer()
          audioBase64 = Buffer.from(audioBuffer).toString('base64')

          // Cache the audio
          try {
            await prisma.audioCache.upsert({
              where: { cache_key: cacheKey },
              update: { audio: audioBase64, duration: duration * 60 },
              create: { cache_key: cacheKey, audio: audioBase64, duration: duration * 60 },
            })
          } catch {
            // Non-fatal caching error
          }
        }
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
