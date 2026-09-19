import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { loadWakeCall } from '@/lib/era/wake-server'
import { formatWakeTime, parseWakeTime } from '@/lib/era/wake'

export const dynamic = 'force-dynamic'

/**
 * The era wake-up call (lib/era/wake.ts).
 *
 * GET — { settings: { enabled, time }, call: { title, body, script } | null,
 *       ring, eraTitle, image, promisedToday }. The page speaks `script`
 *       through /api/ai/chat-voice, which meters and caches it.
 * PUT — { enabled: boolean, time?: "HH:MM", timezone? } saves the settings.
 *       The timezone is only filled in when none is stored, so the call
 *       rings at their local time without overriding a zone they chose.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { settings, call, era, ring } = await loadWakeCall(user.id)
    return NextResponse.json({
      settings,
      call,
      ring,
      eraTitle: era?.title ?? null,
      image: era?.image ?? null,
      complete: era?.step === 'complete',
      promisedToday: !!era?.today,
    })
  } catch (error) {
    console.error('[era wake GET] error:', error)
    return NextResponse.json({ error: 'Could not load your wake-up call.' }, { status: 500 })
  }
}

function validTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`era-wake:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const minutes = parseWakeTime(body.time)
    if (body.enabled && minutes === null) {
      return NextResponse.json({ error: 'Pick a time for your wake-up call.' }, { status: 400 })
    }

    const existing = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { timezone: true, wake_call_time: true },
    })
    const timezone = !existing?.timezone && validTimezone(body.timezone) ? body.timezone : undefined

    const data = {
      wake_call_enabled: body.enabled,
      // Turning it off keeps the time, so switching back on is one tap.
      ...(minutes !== null && { wake_call_time: formatWakeTime(minutes) }),
      ...(timezone && { timezone }),
    }
    await prisma.userPreferences.upsert({
      where: { user_id: user.id },
      update: data,
      create: { user_id: user.id, ...data },
    })

    return NextResponse.json({
      ok: true,
      settings: {
        enabled: body.enabled,
        time: minutes !== null ? formatWakeTime(minutes) : existing?.wake_call_time ?? null,
      },
    })
  } catch (error) {
    console.error('[era wake PUT] error:', error)
    return NextResponse.json({ error: 'Could not save your wake-up call.' }, { status: 500 })
  }
}
