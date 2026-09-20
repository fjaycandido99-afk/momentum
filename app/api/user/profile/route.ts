import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { cleanPreferredName, displayNameFrom, NAME_MAX } from '@/lib/user/display-name'

export const dynamic = 'force-dynamic'

/**
 * GET — { preferredName, fallbackName, displayName }: what they chose, what
 *       the auth provider gave us, and what Voxu will actually say.
 * PUT — { preferredName } sets it. An empty string clears it, which falls
 *       back to the provider's first name rather than to nothing.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { preferred_name: true, name: true },
    })
    return NextResponse.json({
      preferredName: row?.preferred_name ?? null,
      fallbackName: row?.name ?? null,
      displayName: displayNameFrom(row),
    })
  } catch (error) {
    console.error('[user profile GET] error:', error)
    return NextResponse.json({ error: 'Could not load your profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`user-profile:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body.preferredName !== 'string') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const cleaned = cleanPreferredName(body.preferredName)
    // Typed something that isn't a name (an email, a link) — say so instead
    // of silently storing nothing and leaving them wondering.
    if (body.preferredName.trim() && !cleaned) {
      return NextResponse.json(
        { error: `Just a name — up to ${NAME_MAX} characters, no email or link.` },
        { status: 400 },
      )
    }

    const row = await prisma.user.update({
      where: { id: user.id },
      data: { preferred_name: cleaned },
      select: { preferred_name: true, name: true },
    })
    return NextResponse.json({
      ok: true,
      preferredName: row.preferred_name,
      displayName: displayNameFrom(row),
    })
  } catch (error) {
    console.error('[user profile PUT] error:', error)
    return NextResponse.json({ error: 'Could not save your name' }, { status: 500 })
  }
}
