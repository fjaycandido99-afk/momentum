import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { saveRelicNote } from '@/lib/relics-server'

export const dynamic = 'force-dynamic'

/** POST { id, text } — their one line on a coin they hold. Empty clears it. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`relic-note:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const result = await saveRelicNote(user.id, body?.id, body?.text)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ note: result.note })
  } catch (error) {
    console.error('[relic note] error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}
