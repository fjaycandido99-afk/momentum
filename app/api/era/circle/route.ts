import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { loadCircle, loadTrending } from '@/lib/era/circle-server'

export const dynamic = 'force-dynamic'

/**
 * GET — { circle, trending, visible }.
 *
 *   circle    people connected through a "Join this era" link, in both
 *             directions: a first name, their era, day and streak. Never a
 *             promise, never an email (lib/era/circle.ts).
 *   trending  eras with enough real people in them to name a number. Empty
 *             until then, and the client renders nothing — the counts of
 *             eras below the bar never leave the server.
 *   visible   whether this user appears in other people's circles.
 *
 * PUT { visible: boolean } — appear in circles, or not.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ circle: [], trending: [], visible: true })

    const [circle, trending, prefs] = await Promise.all([
      loadCircle(user.id),
      loadTrending(),
      prisma.userPreferences.findUnique({ where: { user_id: user.id }, select: { circle_visible: true } }),
    ])
    return NextResponse.json({ circle, trending, visible: prefs?.circle_visible ?? true })
  } catch (error) {
    // Home must never break over this section.
    console.error('[era circle GET] error:', error)
    return NextResponse.json({ circle: [], trending: [], visible: true })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`era-circle:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body.visible !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    await prisma.userPreferences.upsert({
      where: { user_id: user.id },
      update: { circle_visible: body.visible },
      create: { user_id: user.id, circle_visible: body.visible },
    })
    return NextResponse.json({ ok: true, visible: body.visible })
  } catch (error) {
    console.error('[era circle PUT] error:', error)
    return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 })
  }
}
