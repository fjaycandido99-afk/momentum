import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { loadState, recordAnswer } from '@/lib/assessment/service'

export const dynamic = 'force-dynamic'

/** Record one Daily Read answer. Free for every tier — this is the input the
 *  AI features are starved of, so metering it would defeat the purpose. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`assessment-answer:${user.id}`, { limit: 10, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const itemId = typeof body?.itemId === 'string' ? body.itemId : null
    const score = typeof body?.score === 'number' ? body.score : null
    if (!itemId || score === null) {
      return NextResponse.json({ error: 'itemId and score are required' }, { status: 400 })
    }

    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { timezone: true },
    })

    const ok = await recordAnswer(user.id, prefs?.timezone ?? null, itemId, score)
    if (!ok) return NextResponse.json({ error: 'Unknown item or score out of range' }, { status: 400 })

    // Hand back the updated read so the popup can show progress immediately
    // rather than making the client fetch again.
    const { read } = await loadState(user.id, prefs?.timezone ?? null)
    return NextResponse.json({ ok: true, read })
  } catch (error) {
    console.error('Assessment answer error:', error)
    return NextResponse.json({ error: 'Failed to record answer' }, { status: 500 })
  }
}
