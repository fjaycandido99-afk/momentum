import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { finishReset, startReset } from '@/lib/reset/server'

export const dynamic = 'force-dynamic'

/**
 * POST — Nervous-System mode: { action: 'start' | 'finish' }.
 *
 * Free on every tier, and deliberately: this is the part of the app for
 * someone's worst evening, and a paywall in front of a breathing exercise
 * would be indefensible.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // Not signed in? The session still runs on the device — it just isn't
    // recorded. Nobody gets asked to log in to calm down.
    if (!user) return NextResponse.json({ ok: true, id: null })

    const limit = rateLimit(`reset:${user.id}`, { limit: 40, windowSeconds: 60 })
    if (!limit.allowed) return NextResponse.json({ error: 'Slow down' }, { status: 429 })

    const body = await request.json().catch(() => null)

    if (body?.action === 'start') {
      const result = await startReset(user.id, body?.state, body?.before)
      if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 })
      return NextResponse.json({ ok: true, id: result.id })
    }

    if (body?.action === 'finish') {
      const result = await finishReset(user.id, body?.id, body?.after, body?.completed === true)
      return NextResponse.json({ ok: result.ok })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('[reset POST] error:', error)
    // The screen must keep working even when the write doesn't.
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
