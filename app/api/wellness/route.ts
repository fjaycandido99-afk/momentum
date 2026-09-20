import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { localDay } from '@/lib/assessment/service'
import { parseScore, sanitizeTags } from '@/lib/wellness/scales'

export const dynamic = 'force-dynamic'

/**
 * The daily wellness check-in (lib/wellness/scales.ts).
 *
 * GET    — { consent, today, recent }. Consent off ⇒ no rows, and none are read.
 * POST   — save or update today's. Refused unless consent is on: this is the
 *          one place in Voxu where writing without permission would be a
 *          breach rather than a bug.
 * PUT    — { enabled } turn the check-in on or off. Turning it on records
 *          when, which is what makes the collection lawful.
 * DELETE — erase every check-in this person has made, and nothing else.
 */

async function userState(userId: string) {
  const prefs = await prisma.userPreferences.findUnique({
    where: { user_id: userId },
    select: { wellness_enabled: true, wellness_consented_at: true, timezone: true },
  })
  return {
    enabled: prefs?.wellness_enabled ?? false,
    consentedAt: prefs?.wellness_consented_at ?? null,
    timezone: prefs?.timezone ?? null,
  }
}

const ROW = {
  local_day: true, mood: true, energy: true, stress: true, rested: true, tags: true, updated_at: true,
} as const

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const state = await userState(user.id)
    if (!state.enabled) {
      return NextResponse.json({ consent: { enabled: false, at: state.consentedAt }, today: null, recent: [] })
    }

    const today = localDay(state.timezone)
    const recent = await prisma.wellnessCheckIn.findMany({
      where: { user_id: user.id },
      orderBy: { local_day: 'desc' },
      take: 14,
      select: ROW,
    })
    return NextResponse.json({
      consent: { enabled: true, at: state.consentedAt },
      today: recent.find(r => r.local_day === today) ?? null,
      recent,
    })
  } catch (error) {
    console.error('[wellness GET] error:', error)
    return NextResponse.json({ error: 'Could not load your check-in' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`wellness:${user.id}`, { limit: 30, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const state = await userState(user.id)
    // Not an error the UI should ever hit — but a write here without consent
    // must be impossible, not merely unlikely.
    if (!state.enabled) {
      return NextResponse.json({ error: 'Check-ins are turned off', off: true }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const data = {
      mood: parseScore(body.mood),
      energy: parseScore(body.energy),
      stress: parseScore(body.stress),
      rested: parseScore(body.rested),
      tags: sanitizeTags(body.tags),
    }
    const today = localDay(state.timezone)

    const row = await prisma.wellnessCheckIn.upsert({
      where: { user_id_local_day: { user_id: user.id, local_day: today } },
      create: { user_id: user.id, local_day: today, ...data },
      update: data,
      select: ROW,
    })
    return NextResponse.json({ ok: true, today: row })
  } catch (error) {
    console.error('[wellness POST] error:', error)
    return NextResponse.json({ error: 'Could not save your check-in' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`wellness-consent:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const existing = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { wellness_consented_at: true },
    })
    // Stamped the first time they agree, then left alone: it records WHEN
    // permission was given, not when the switch was last touched.
    const data = {
      wellness_enabled: body.enabled,
      ...(body.enabled && !existing?.wellness_consented_at && { wellness_consented_at: new Date() }),
    }
    await prisma.userPreferences.upsert({
      where: { user_id: user.id },
      update: data,
      create: { user_id: user.id, ...data },
    })
    return NextResponse.json({ ok: true, enabled: body.enabled })
  } catch (error) {
    console.error('[wellness PUT] error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only this category, and only their own: erasing check-ins must never
    // mean erasing an account.
    const { count } = await prisma.wellnessCheckIn.deleteMany({ where: { user_id: user.id } })
    return NextResponse.json({ ok: true, deleted: count })
  } catch (error) {
    console.error('[wellness DELETE] error:', error)
    return NextResponse.json({ error: 'Could not delete your check-ins' }, { status: 500 })
  }
}
