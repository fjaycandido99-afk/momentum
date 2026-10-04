import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { normalizeStyle } from '@/lib/coach/style'
import { isGuideTone } from '@/lib/ai/voice-tone'

export const dynamic = 'force-dynamic'

/** Settings › Mindset & Coaching. GET the style (legacy switches carried over); PUT a style. */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const p = await prisma.userPreferences.findUnique({ where: { user_id: user.id }, select: { coach_style: true, coach_prefs: true, guide_tone: true } })
  return NextResponse.json({ style: normalizeStyle(p?.coach_style, p?.coach_prefs), tone: isGuideTone(p?.guide_tone) ? p!.guide_tone : 'calm' })
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const b = await request.json().catch(() => null)
    if (!b?.style) return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })
    const style = normalizeStyle(b.style)
    await prisma.userPreferences.upsert({
      where: { user_id: user.id },
      create: { user_id: user.id, coach_style: style as object },
      update: { coach_style: style as object },
    })
    return NextResponse.json({ ok: true, style })
  } catch (error) {
    console.error('[coach style] error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}
