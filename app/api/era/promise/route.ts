import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { loadEraToday, makePromise } from '@/lib/era/service'

export const dynamic = 'force-dynamic'

/**
 * POST { text, source?: 'typed' | 'spoken' } — today's promise.
 * Returns the coach's reply, crisis resources if the words call for them,
 * and the refreshed era so the card updates without a second fetch.
 *
 * Spoken promises arrive here as text: the card transcribes through the
 * existing /api/transcribe (VoiceInput), so there is one write path and
 * typing is never a second-class way in.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Each call is a Groq round trip; re-promising a few times a day is fine,
    // hammering it is not.
    const { allowed } = rateLimit(`era-promise:${user.id}`, { limit: 6, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const result = await makePromise(user.id, {
      text: body?.text,
      source: body?.source,
      confidence: body?.confidence,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({
      ok: true,
      coachReply: result.coachReply,
      crisis: result.crisis,
      era: await loadEraToday(user.id),
      newAchievements: result.newAchievements,
    })
  } catch (error) {
    console.error('[era promise] error:', error)
    return NextResponse.json({ error: 'Could not save your promise' }, { status: 500 })
  }
}
