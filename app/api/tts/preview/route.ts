import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAudio, getSharedCached, setSharedCache } from '@/lib/daily-guide/audio-utils'

export const dynamic = 'force-dynamic'

// Short preview scripts that showcase each voice's character
const PREVIEW_SCRIPTS: Record<string, string> = {
  calm: "Take a deep breath. You're exactly where you need to be. Today is a fresh start, and I'm right here with you.",
  direct: "Let's get to it. You've got goals to hit today. No excuses, no distractions. You're ready for this.",
  neutral: "Good morning. Here's your moment to set the tone for today. Let's focus on what matters most and move forward.",
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tone = request.nextUrl.searchParams.get('tone')
    if (!tone || !PREVIEW_SCRIPTS[tone]) {
      return NextResponse.json({ error: 'Invalid tone' }, { status: 400 })
    }

    const cacheKey = `tone-preview-v2-${tone}`

    // Check DB cache first
    const cached = await getSharedCached(cacheKey)
    if (cached) {
      const audioBuffer = Buffer.from(cached.audioBase64, 'base64')
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=604800', // 7 days
        },
      })
    }

    // Generate and cache
    const { audioBase64 } = await generateAudio(PREVIEW_SCRIPTS[tone], tone)
    if (!audioBase64) {
      return NextResponse.json({ error: 'Audio generation failed' }, { status: 500 })
    }

    await setSharedCache(cacheKey, audioBase64, 8)

    const audioBuffer = Buffer.from(audioBase64, 'base64')
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=604800',
      },
    })
  } catch (error) {
    console.error('TTS preview error:', error)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}
