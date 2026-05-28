import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDateString } from '@/lib/daily-guide/day-type'

export const dynamic = 'force-dynamic'

// Fast cache lookup for a rendered audiogram. The daily cron does the rendering
// and stores the public MP4 URL in AudioCache under "audiogram-{mindset}-{date}".
// Returns { url } when ready, else { available: false } so the client falls back
// to the image card.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mindset = searchParams.get('mindset') || 'stoic'
  const date = searchParams.get('date') || getDateString(new Date())
  const key = `audiogram-${mindset}-${date}`

  try {
    const cached = await prisma.audioCache.findUnique({ where: { cache_key: key }, select: { audio: true } })
    if (cached?.audio?.startsWith('http')) {
      return NextResponse.json({ url: cached.audio })
    }
  } catch {
    /* fall through to unavailable */
  }
  return NextResponse.json({ available: false })
}
