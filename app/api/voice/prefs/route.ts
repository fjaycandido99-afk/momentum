import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { parseCoachPrefs } from '@/lib/voice/coach-prefs'
import { isGuideTone } from '@/lib/ai/voice-tone'

export const dynamic = 'force-dynamic'

/** GET — Voxu Voice settings. PUT { coachPrefs?, tone? }. */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const p = await prisma.userPreferences.findUnique({ where: { user_id: user.id }, select: { coach_prefs: true, guide_tone: true } })
  return NextResponse.json({ coachPrefs: parseCoachPrefs(p?.coach_prefs ?? []), tone: isGuideTone(p?.guide_tone) ? p!.guide_tone : 'calm' })
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null)
    const data: { coach_prefs?: string[]; guide_tone?: string } = {}
    if (body && 'coachPrefs' in body) data.coach_prefs = parseCoachPrefs(body.coachPrefs)
    if (body && isGuideTone(body.tone)) data.guide_tone = body.tone
    if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })
    await prisma.userPreferences.upsert({
      where: { user_id: user.id },
      create: { user_id: user.id, ...data },
      update: data,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[voice prefs] error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}
