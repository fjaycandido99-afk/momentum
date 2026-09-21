import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { loadTodaysPractice, recordRun } from '@/lib/exercises/server'

export const dynamic = 'force-dynamic'

/**
 * GET  — today's practice: which exercise, what it trains, and whether it
 *        has been started or finished. { practice: null } with no era.
 * POST — record a run { exerciseId, secondsDone?, completed?, helped? }.
 *        Called when it starts and again at the end, so abandoned runs are
 *        visible too.
 *
 * Free on every tier.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ practice: null })

    const practice = await loadTodaysPractice(user.id)
    return NextResponse.json({ practice })
  } catch (error) {
    // Home shows this card; no card is a safer failure than a broken home.
    console.error('[exercise GET] error:', error)
    return NextResponse.json({ practice: null })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const limit = rateLimit(`exercise:${user.id}`, { limit: 60, windowSeconds: 60 })
    if (!limit.allowed) return NextResponse.json({ error: 'Slow down' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const exerciseId = typeof body?.exerciseId === 'string' ? body.exerciseId : null
    if (!exerciseId) return NextResponse.json({ error: 'Which exercise?' }, { status: 400 })

    const result = await recordRun({
      userId: user.id,
      exerciseId,
      secondsDone: typeof body?.secondsDone === 'number' ? body.secondsDone : 0,
      completed: body?.completed === true,
      helped: body?.helped,
    })
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[exercise POST] error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}
