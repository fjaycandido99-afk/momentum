/**
 * GET /api/social/pulse — live aggregate of how the community feels.
 *
 * Counts non-hidden posts by mood in the last 7 days (default) and
 * returns percentages so the UI can render a horizontal mood-share
 * bar at the top of /community. Auth-gated like every other social
 * endpoint. Block-aware (you don't pulse off posts from people you
 * blocked or who blocked you).
 *
 * Query params:
 *   window=24h | 7d (default) | 30d
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getBlockedUserIds } from '@/lib/social/blocks'

export const dynamic = 'force-dynamic'

const WINDOW_HOURS: Record<string, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const windowParam = (url.searchParams.get('window') || '7d').toLowerCase()
    const hours = WINDOW_HOURS[windowParam] ?? WINDOW_HOURS['7d']
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const blockedIds = await getBlockedUserIds(user.id)

    // Use Prisma's groupBy for a single roundtrip mood histogram.
    const rows = await prisma.socialPost.groupBy({
      by: ['mood'],
      where: {
        hidden: false,
        created_at: { gte: since },
        mood: { not: null },
        ...(blockedIds.length > 0 ? { user_id: { notIn: blockedIds } } : {}),
      },
      _count: { _all: true },
    })

    const total = rows.reduce((acc, r) => acc + r._count._all, 0)

    const moods = rows
      .map(r => ({
        mood: r.mood!,
        count: r._count._all,
        pct: total > 0 ? Math.round((r._count._all / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ window: windowParam, total, moods })
  } catch (err) {
    console.error('[social/pulse]', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
