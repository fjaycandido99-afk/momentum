/**
 * GET  /api/social/guidelines — has the user accepted?
 * POST /api/social/guidelines — mark accepted (idempotent).
 *
 * Acceptance is required before the first community post. Stored on
 * UserPreferences.community_guidelines_accepted_at (DateTime?) so it's
 * persistent across devices + survives reinstalls. We don't re-prompt
 * once accepted unless the guidelines materially change.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { community_guidelines_accepted_at: true },
    })
    return NextResponse.json({
      accepted: !!prefs?.community_guidelines_accepted_at,
      accepted_at: prefs?.community_guidelines_accepted_at ?? null,
    })
  } catch (err) {
    console.error('[guidelines GET]', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    // Upsert so users who haven't gone through onboarding yet still get
    // the acceptance recorded (creates a minimal UserPreferences row).
    await prisma.userPreferences.upsert({
      where: { user_id: user.id },
      update: { community_guidelines_accepted_at: now },
      create: {
        user_id: user.id,
        community_guidelines_accepted_at: now,
      },
    })
    return NextResponse.json({ accepted: true, accepted_at: now })
  } catch (err) {
    console.error('[guidelines POST]', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
