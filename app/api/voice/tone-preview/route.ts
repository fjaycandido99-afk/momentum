import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAudio } from '@/lib/daily-guide/audio-utils'
import { isGuideTone } from '@/lib/ai/voice-tone'
import { TONE_PREVIEW_LINES, TONE_PREVIEW_VERSION as VERSION } from '@/lib/voice/tone-preview'

export const dynamic = 'force-dynamic'

/**
 * Settings › Voxu Voice › Tone preview. Each tone is a different narrator
 * for guided sessions AND a different way of wording replies, so the sample
 * is that tone's narrator saying the same moment in that tone's words.
 * Fixed lines: voiced once ever (3 files), then served from the cache to
 * everyone — guests included, since it can't cost more than that.
 */
export async function GET(request: NextRequest) {
  const tone = request.nextUrl.searchParams.get('tone')
  if (!isGuideTone(tone)) return NextResponse.json({ error: 'Unknown tone' }, { status: 400 })
  const key = `tone-preview-${tone}-v${VERSION}`
  const text = TONE_PREVIEW_LINES[tone]
  try {
    const hit = await prisma.audioCache.findUnique({ where: { cache_key: key }, select: { audio: true } })
    if (hit) return NextResponse.json({ audio: hit.audio, text }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
    const { audioBase64 } = await generateAudio(text, tone)
    if (!audioBase64) return NextResponse.json({ error: 'Voice unavailable', text }, { status: 503 })
    await prisma.audioCache.upsert({
      where: { cache_key: key },
      update: { audio: audioBase64, script: text, duration: 0 },
      create: { cache_key: key, audio: audioBase64, script: text, duration: 0 },
    })
    return NextResponse.json({ audio: audioBase64, text })
  } catch (error) {
    console.error('[tone preview] error:', error)
    return NextResponse.json({ error: 'Voice unavailable', text }, { status: 500 })
  }
}
