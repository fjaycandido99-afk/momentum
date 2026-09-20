import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { checkPromise, loadEraToday } from '@/lib/era/service'

export const dynamic = 'force-dynamic'

/**
 * POST { which: 'today' | 'yesterday', kept: boolean, reason?: string } —
 * the check-in. `reason` is a BLOCKERS key on a miss or a HELPERS key on a
 * keep (lib/era/reasons.ts), and is always optional.
 * Answering again overwrites: a mis-tap should be fixable.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`era-check:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const result = await checkPromise(user.id, {
      which: body?.which,
      kept: body?.kept,
      // One tap, optional: what got in the way, or what helped.
      reason: body?.reason,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({ ok: true, era: await loadEraToday(user.id), newAchievements: result.newAchievements })
  } catch (error) {
    console.error('[era check] error:', error)
    return NextResponse.json({ error: 'Could not save your check-in' }, { status: 500 })
  }
}
