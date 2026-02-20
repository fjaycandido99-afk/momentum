import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAudio, TONE_VOICES } from '@/lib/daily-guide/audio-utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { text, voiceId } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
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
