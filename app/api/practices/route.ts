import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { createPractice, loadPractices, logPractice, retirePractice } from '@/lib/practices/server'

export const dynamic = 'force-dynamic'

/**
 * GET    — the active practices, where today stands on each, and how many
 *          more can be added.
 * POST   — { action: 'create' | 'log' | 'retire' } and its fields.
 * Free on every tier.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ practices: [], remaining: 0, max: 0, today: '' })

    return NextResponse.json(await loadPractices(user.id))
  } catch (error) {
    // Home renders this; an empty list is a safer failure than a broken home.
    console.error('[practices GET] error:', error)
    return NextResponse.json({ practices: [], remaining: 0, max: 0, today: '' })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const limit = rateLimit(`practices:${user.id}`, { limit: 40, windowSeconds: 60 })
    if (!limit.allowed) return NextResponse.json({ error: 'Slow down' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const action = body?.action

    if (action === 'create') {
      const result = await createPractice(user.id, {
        presetKey: body?.presetKey,
        label: body?.label,
        days: body?.days,
        minimum: body?.minimum,
        blocker: body?.blocker,
      })
      if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 })
      return NextResponse.json({ ok: true, id: result.id })
    }

    if (action === 'log') {
      if (typeof body?.practiceId !== 'string' || typeof body?.done !== 'boolean') {
        return NextResponse.json({ error: 'Which practice, and did it happen?' }, { status: 400 })
      }
      const result = await logPractice({
        userId: user.id,
        practiceId: body.practiceId,
        done: body.done,
        minimumOnly: body?.minimumOnly === true,
        day: typeof body?.day === 'string' ? body.day : undefined,
      })
      if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'retire') {
      if (typeof body?.practiceId !== 'string') {
        return NextResponse.json({ error: 'Which practice?' }, { status: 400 })
      }
      const result = await retirePractice(user.id, body.practiceId)
      return NextResponse.json({ ok: result.ok })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('[practices POST] error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}
