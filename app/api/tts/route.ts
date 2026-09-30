import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAudio, TONE_VOICES } from '@/lib/daily-guide/audio-utils'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Generic text-to-speech. NOT for Voxu speaking — that goes through
 * /api/ai/chat-voice (lib/voice/voxu-audio), which is metered, cached and in
 * Voxu's voice. This route had no per-user limit and no length cap, so one
 * account could spend the month's shared ElevenLabs allowance; it keeps
 * both now for anything still calling it.
 */
const MAX_CHARS = 600

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`tts:${user.id}`, { limit: 6, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { text, voiceId } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json({ error: 'Text too long' }, { status: 413 })
    }

    // Validate voiceId contains only alphanumeric characters
    if (voiceId && !/^[a-zA-Z0-9]+$/.test(voiceId)) {
      return NextResponse.json({ error: 'Invalid voiceId' }, { status: 400 })
    }

    // Use centralized generateAudio which tracks credits
    const tone = voiceId
      ? Object.entries(TONE_VOICES).find(([, v]) => v === voiceId)?.[0] || 'calm'
      : 'calm'
    const { audioBase64 } = await generateAudio(text, tone)

    if (!audioBase64) {
      return NextResponse.json({ fallback: true })
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64')

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    return NextResponse.json({ fallback: true })
  }
}
