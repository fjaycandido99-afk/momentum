import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { getRelics, saveRelics, setRelicsInCircle } from '@/lib/relics-server'

export const dynamic = 'force-dynamic'

/** GET — their coins: earned, equipped, featured. */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json(await getRelics(user.id))
  } catch (error) {
    console.error('[relics GET] error:', error)
    return NextResponse.json({ error: 'Could not load relics' }, { status: 500 })
  }
}

/** POST { featured, equipped } — what they wear. Only earned coins are kept. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`relics:${user.id}`, { limit: 30, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    // { inCircle } alone flips the circle opt-in; anything else is the selection.
    if (typeof body?.inCircle === 'boolean' && body?.equipped === undefined) {
      return NextResponse.json(await setRelicsInCircle(user.id, body.inCircle))
    }
    return NextResponse.json(await saveRelics(user.id, { featured: body?.featured, equipped: body?.equipped }))
  } catch (error) {
    console.error('[relics POST] error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}
