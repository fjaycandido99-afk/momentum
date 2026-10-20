import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAudio, VOXU_VOICE_ID } from '@/lib/daily-guide/audio-utils'
import { VOXU_PREVIEW_LINES, VOXU_PREVIEW_VERSION as VERSION } from '@/lib/voice/voxu-preview'

export const dynamic = 'force-dynamic'

/**
 * The download page's Voxu Voice sample (?n=0): Voxu answering a journal
 * entry. A fixed line, voiced once ever in Voxu Voice, then served from the cache to everyone,
 * guests included, since it can't cost more than that. Same pattern as
 * /api/voice/tone-preview.
 */
export async function GET(request: NextRequest) {
  const n = Number(request.nextUrl.searchParams.get('n'))
  if (!Number.isInteger(n) || n < 0 || n >= VOXU_PREVIEW_LINES.length) return NextResponse.json({ error: 'Unknown sample' }, { status: 400 })
  const key = `voxu-preview-${n}-v${VERSION}`
  const text = VOXU_PREVIEW_LINES[n]
  try {
    const hit = await prisma.audioCache.findUnique({ where: { cache_key: key }, select: { audio: true } })
    if (hit) return NextResponse.json({ audio: hit.audio, text }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
    const { audioBase64 } = await generateAudio(text, 'calm', undefined, VOXU_VOICE_ID)
    if (!audioBase64) return NextResponse.json({ error: 'Voice unavailable', text }, { status: 503 })
    await prisma.audioCache.upsert({
      where: { cache_key: key },
      update: { audio: audioBase64, script: text, duration: 0 },
      create: { cache_key: key, audio: audioBase64, script: text, duration: 0 },
    })
    return NextResponse.json({ audio: audioBase64, text })
  } catch (error) {
    console.error('[voxu preview] error:', error)
    return NextResponse.json({ error: 'Voice unavailable', text }, { status: 500 })
  }
}
