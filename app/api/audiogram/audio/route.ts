import { NextRequest, NextResponse } from 'next/server'
import { generateAndCacheAudio } from '@/lib/daily-guide/audio-cache'
import { getDailyMindsetQuote } from '@/lib/mindset/quotes'
import { getDateString } from '@/lib/daily-guide/day-type'
import type { MindsetId } from '@/lib/mindset/types'

export const dynamic = 'force-dynamic'

// Public spoken-quote audio for the audiogram — Remotion Lambda fetches this URL.
// Voiced by ELEVENLABS via generateAndCacheAudio (eleven_turbo_v2_5), shared-cached
// in AudioCache so each quote is synthesized once. NOT browser TTS.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mindset = (searchParams.get('mindset') || 'stoic') as MindsetId
  const date = searchParams.get('date') || getDateString(new Date())

  const quote = getDailyMindsetQuote(mindset, date)
  if (!quote) return NextResponse.json({ error: 'No quote' }, { status: 404 })

  // ElevenLabs synth + shared cache (segment key isn't a daily-session, so it caches).
  const audio = await generateAndCacheAudio(quote.text, `quote-${mindset}-${date}`, 'calm')
  if (!audio) return NextResponse.json({ error: 'Audio unavailable' }, { status: 502 })

  const buf = Buffer.from(audio.audioBase64, 'base64')
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
      'Content-Length': String(buf.length),
    },
  })
}
