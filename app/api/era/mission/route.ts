import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { loadEraToday, setMissionDone } from '@/lib/era/service'

export const dynamic = 'force-dynamic'

/**
 * POST { done: boolean } — mark today's era mission done, or undo it.
 *
 * Its own endpoint because a mission is its own act: it isn't the promise,
 * and many days will have one without the other.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`era-mission:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const result = await setMissionDone(user.id, body?.done)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({ ok: true, done: result.done, era: await loadEraToday(user.id) })
  } catch (error) {
    console.error('[era mission] error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}
