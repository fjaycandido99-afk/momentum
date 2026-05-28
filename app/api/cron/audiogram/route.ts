import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDailyMindsetQuote } from '@/lib/mindset/quotes'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { renderAudiogram, isAudiogramConfigured } from '@/lib/audiogram/render'
import { getDateString } from '@/lib/daily-guide/day-type'
import type { MindsetId } from '@/lib/mindset/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MINDSETS: MindsetId[] = ['stoic', 'existentialist', 'cynic', 'hedonist', 'samurai', 'scholar', 'manifestor', 'hustler']

// Pre-renders today's quote audiogram for each mindset (8 videos), cached in
// AudioCache by "audiogram-{mindset}-{date}". So every user sharing that day's
// quote hits the cache instantly — ~8 renders/day total. Schedule in vercel.json:
//   { "path": "/api/cron/audiogram", "schedule": "0 6 * * *" }
// No-ops (200) until Remotion Lambda is configured.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAudiogramConfigured()) {
    return NextResponse.json({ skipped: 'Remotion Lambda not configured' })
  }

  const date = getDateString(new Date())
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://voxu.app'

  const results = await Promise.all(
    MINDSETS.map(async (m) => {
      const key = `audiogram-${m}-${date}`
      const existing = await prisma.audioCache.findUnique({ where: { cache_key: key }, select: { audio: true } })
      if (existing?.audio?.startsWith('http')) return false // already rendered today

      const quote = getDailyMindsetQuote(m, date)
      if (!quote) return false

      const audioSrc = `${base}/api/audiogram/audio?mindset=${m}&date=${date}`
      const url = await renderAudiogram({
        quote: quote.text,
        author: quote.author,
        mindset: MINDSET_CONFIGS[m]?.name || m,
        audioSrc,
      })
      if (!url) return false

      await prisma.audioCache.upsert({
        where: { cache_key: key },
        update: { audio: url, duration: 0 },
        create: { cache_key: key, audio: url, duration: 0 },
      })
      return true
    })
  )

  return NextResponse.json({ rendered: results.filter(Boolean).length, date })
}
