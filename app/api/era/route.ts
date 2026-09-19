import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { awardEraCompletionIfDue, endEra, loadEraToday, startEra } from '@/lib/era/service'

export const dynamic = 'force-dynamic'

/**
 * GET    — the active era and what the home card should do today, or
 *          { era: null } when there isn't one.
 * POST   — start an era { key, title?, change, why? }. Ends any active one.
 * DELETE — end the active era early. Its promises are kept.
 *
 * Free on every tier; see lib/era/service.ts for why.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ era: null })
    const era = await loadEraToday(user.id)
    // A finished era pays out the first time home sees it (idempotent).
    const newAchievements = await awardEraCompletionIfDue(user.id, era)
    return NextResponse.json({ era, newAchievements })
  } catch (error) {
    // Home must never error over a card. No era shown is the safe failure.
    console.error('[era GET] error:', error)
    return NextResponse.json({ era: null })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`era-start:${user.id}`, { limit: 5, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const result = await startEra(user.id, body)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({
      ok: true,
      crisis: result.crisis,
      era: await loadEraToday(user.id),
      newAchievements: result.newAchievements,
    })
  } catch (error) {
    console.error('[era POST] error:', error)
    return NextResponse.json({ error: 'Could not start the era' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ended = await endEra(user.id)
    return NextResponse.json({ ok: ended })
  } catch (error) {
    console.error('[era DELETE] error:', error)
    return NextResponse.json({ error: 'Could not end the era' }, { status: 500 })
  }
}
