/**
 * GET /api/journal/streak — current journaling streak for the signed-in user.
 *
 * Counts CONSECUTIVE calendar days where the user has any journal-bearing
 * data: free_text, win, gratitude, learned, intention, OR the new
 * morning_minute_transcript. The 60-second Morning Minute counts as
 * showing up.
 *
 * Reuses `loadProfileWallStats` so the streak computation is the SAME
 * one driving the InkSpiral / profile wall / spiral-name route — single
 * source of truth.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { loadProfileWallStats } from '@/lib/profile-stats'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const stats = await loadProfileWallStats(prisma, user.id)
    return NextResponse.json({
      streak_days: stats.streak_days,
      entry_count: stats.entry_count,
    })
  } catch (err) {
    console.error('[journal/streak GET] error:', err)
    return NextResponse.json({ streak_days: 0, entry_count: 0 }, { status: 200 })
  }
}
