import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_MODE, parseMode } from '@/lib/notifications/modes'

export const dynamic = 'force-dynamic'

/** GET — their notification mode. PUT { mode } — quiet | coach | strict. */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const prefs = await prisma.userPreferences.findUnique({ where: { user_id: user.id }, select: { notification_mode: true } })
  return NextResponse.json({ mode: parseMode(prefs?.notification_mode) ?? DEFAULT_MODE })
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null)
    const mode = parseMode(body?.mode)
    if (!mode) return NextResponse.json({ error: 'mode must be quiet, coach or strict' }, { status: 400 })
    await prisma.userPreferences.upsert({
      where: { user_id: user.id },
      create: { user_id: user.id, notification_mode: mode },
      update: { notification_mode: mode },
    })
    return NextResponse.json({ mode })
  } catch (error) {
    console.error('[notification mode] error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}
