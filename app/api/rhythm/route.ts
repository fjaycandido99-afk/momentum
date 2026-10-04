import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isFocusWindow, isValidTime } from '@/lib/rhythm/plan'

export const dynamic = 'force-dynamic'

const SELECT = {
  wake_time: true, work_start_time: true, work_end_time: true, work_days: true,
  focus_window: true, bedtime: true, quiet_start: true, quiet_end: true, work_mode: true,
  // Read-only here: the reminders the "How Voxu will adapt" plan shows.
  daily_reminder: true, reminder_time: true,
  midday_reminder_enabled: true, midday_reminder_time: true,
  winddown_reminder_enabled: true, winddown_reminder_time: true,
  bedtime_reminder_enabled: true, bedtime_reminder_time: true,
} as const

/** Settings › Daily Rhythm. GET everything the page shows; PUT only its own fields. */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const p = await prisma.userPreferences.findUnique({ where: { user_id: user.id }, select: SELECT })
  return NextResponse.json(p ?? {})
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const b = await request.json().catch(() => null)
    if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })
    const data: Record<string, unknown> = {}
    for (const k of ['wake_time', 'work_start_time', 'work_end_time'] as const) if (isValidTime(b[k])) data[k] = b[k]
    for (const k of ['bedtime', 'quiet_start', 'quiet_end'] as const) {
      if (k in b) { if (b[k] === null) data[k] = null; else if (isValidTime(b[k])) data[k] = b[k] }
    }
    if ('focus_window' in b) data.focus_window = isFocusWindow(b.focus_window) ? b.focus_window : null
    if (Array.isArray(b.work_days)) {
      data.work_days = [...new Set(b.work_days.filter((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6))].sort()
    }
    if (typeof b.work_mode === 'boolean') data.work_mode = b.work_mode
    if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })
    await prisma.userPreferences.upsert({ where: { user_id: user.id }, create: { user_id: user.id, ...data }, update: data })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[rhythm] error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}
