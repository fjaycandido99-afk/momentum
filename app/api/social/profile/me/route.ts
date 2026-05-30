/**
 * GET   /api/social/profile/me — caller's profile (auto-mints if missing).
 * PATCH /api/social/profile/me — update display_name / bio / handle.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { ensureProfile, isValidHandle } from '@/lib/social/handle'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const profile = await ensureProfile(user.id)
    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[social/profile/me GET] error:', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureProfile(user.id)
    const body = await request.json()

    const update: Record<string, string | boolean | number | null> = {}
    if (typeof body.display_name === 'string') {
      const dn = body.display_name.trim()
      if (dn.length > 0 && dn.length <= 60) update.display_name = dn
    }
    if (typeof body.bio === 'string') {
      const bio = body.bio.trim()
      if (bio.length <= 280) update.bio = bio
    }
    if (typeof body.discoverable === 'boolean') {
      update.discoverable = body.discoverable
    }
    // Voice essence — pass URL + duration to attach; pass null on either
    // to clear (Re-record / Remove flow).
    if (body.voice_essence_url === null) {
      update.voice_essence_url = null
      update.voice_essence_duration_sec = null
    } else if (typeof body.voice_essence_url === 'string' && body.voice_essence_url.length > 0) {
      update.voice_essence_url = body.voice_essence_url
      const d = Number(body.voice_essence_duration_sec)
      if (Number.isFinite(d) && d > 0 && d < 60) update.voice_essence_duration_sec = Math.round(d)
    }

    if (typeof body.handle === 'string') {
      const newHandle = body.handle.trim().toLowerCase().replace(/^@/, '')
      if (!isValidHandle(newHandle)) {
        return NextResponse.json({ error: 'Handle must be 3–24 chars, a–z 0–9 or _, not reserved.' }, { status: 400 })
      }
      const taken = await prisma.socialProfile.findUnique({ where: { handle: newHandle } })
      if (taken && taken.user_id !== user.id) {
        return NextResponse.json({ error: 'Handle already taken' }, { status: 409 })
      }
      update.handle = newHandle
    }

    const profile = await prisma.socialProfile.update({
      where: { user_id: user.id },
      data: update,
    })
    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[social/profile/me PATCH] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
