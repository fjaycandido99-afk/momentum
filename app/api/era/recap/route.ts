import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { getEraRecap } from '@/lib/era/service'

export const dynamic = 'force-dynamic'

/**
 * POST — the Era Recap for the finished active era. Written on first request
 * (premium), then served from the row. 403 { locked: true } for free users,
 * which the card turns into the upgrade prompt.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`era-recap:${user.id}`, { limit: 4, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const result = await getEraRecap(user.id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error, locked: !!result.locked }, { status: result.status })
    }
    return NextResponse.json({ recap: result.recap })
  } catch (error) {
    console.error('[era recap] error:', error)
    return NextResponse.json({ error: 'Could not load your recap' }, { status: 500 })
  }
}
