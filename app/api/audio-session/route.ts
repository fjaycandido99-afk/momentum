import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { recordAudioSession } from '@/lib/audio-sessions-server'

export const dynamic = 'force-dynamic'

/**
 * POST { kind, itemId, title, seconds, completed } — one listening session.
 * Sent when a session ENDS (a guide played through; music or motivation
 * stopped after 10+ minutes), never on a timer. Anything not worth keeping
 * is ignored with 200 { ok: false } — the player must never care.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const { allowed } = rateLimit(`audio-session:${user.id}`, { limit: 30, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ ok: false }, { status: 429 })

    const body = await request.json().catch(() => null)
    return NextResponse.json(await recordAudioSession(user.id, body))
  } catch (error) {
    console.error('[audio-session] error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
