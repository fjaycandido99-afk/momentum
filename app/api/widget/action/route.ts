import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { widgetUser } from '@/lib/widget/token'
import { checkinMood, isWidgetAction } from '@/lib/widget/actions'
import { checkPromise, makePromise } from '@/lib/era/service'
import { localDay } from '@/lib/assessment/service'

export const dynamic = 'force-dynamic'

/**
 * POST { action, level?, text? } with "Authorization: Bearer <widget key>" —
 * the home-screen widget's buttons (iOS 17 App Intents in VoxuWidget.swift).
 * The key can do exactly these, through the same paths the app uses:
 *
 *   promise_done   → checkPromise(today, kept)
 *   checkin        → today's mood (2/3/4), ONLY if wellness check-ins are on
 *   tomorrow_keep  → makePromise(text, tomorrow)
 *
 * 401 → the widget shows "Open Voxu" instead of buttons until the app
 * gives it a new key.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await widgetUser(request.headers.get('authorization'))
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed } = rateLimit(`widget-action:${userId}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    if (!isWidgetAction(body?.action)) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    // Admin totals (lib/analytics/new-features widgetUse): which button, never what it said.
    const track = () => prisma.featureEvent.create({ data: { user_id: userId, feature: 'widget', action: 'use', metadata: body.action } }).catch(() => {})

    if (body.action === 'promise_done') {
      const r = await checkPromise(userId, { which: 'today', kept: true })
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
      await track()
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'checkin') {
      const mood = checkinMood(body.level)
      if (mood === null) return NextResponse.json({ error: 'level must be low, okay or good' }, { status: 400 })
      const prefs = await prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { wellness_enabled: true, timezone: true } })
      // Their consent decides, the same as the app: no write while it's off.
      if (!prefs?.wellness_enabled) return NextResponse.json({ error: 'Check-ins are turned off', off: true }, { status: 403 })
      const day = localDay(prefs.timezone ?? null)
      // Mood only — never wipe the energy or stress they logged in the app.
      await prisma.wellnessCheckIn.upsert({
        where: { user_id_local_day: { user_id: userId, local_day: day } },
        create: { user_id: userId, local_day: day, mood },
        update: { mood },
      })
      await track()
      return NextResponse.json({ ok: true })
    }

    // tomorrow_keep
    const r = await makePromise(userId, { text: body.text, source: 'typed', forDay: 'tomorrow' })
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
    await track()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[widget action] error:', error)
    return NextResponse.json({ error: 'Could not do that' }, { status: 500 })
  }
}
