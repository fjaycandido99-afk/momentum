import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { hashWidgetToken } from '@/lib/widget/token'

export const dynamic = 'force-dynamic'

/**
 * POST — a fresh key for this phone's widget buttons (lib/widget-sync hands
 * it to the App Group). Issuing deletes any older key: one per person, so a
 * lost phone's widget stops working the next time they open the app.
 * DELETE — sign-out: the widget can no longer act for them.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed } = rateLimit(`widget-token:${user.id}`, { limit: 5, windowSeconds: 3600 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const token = randomBytes(32).toString('base64url')
    await prisma.$transaction([
      prisma.widgetToken.deleteMany({ where: { user_id: user.id } }),
      prisma.widgetToken.create({ data: { user_id: user.id, token_hash: hashWidgetToken(token) } }),
    ])
    return NextResponse.json({ token })
  } catch (error) {
    console.error('[widget token] error:', error)
    return NextResponse.json({ error: 'Could not set up the widget' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: true })
    await prisma.widgetToken.deleteMany({ where: { user_id: user.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[widget token DELETE] error:', error)
    return NextResponse.json({ error: 'Could not sign the widget out' }, { status: 500 })
  }
}
