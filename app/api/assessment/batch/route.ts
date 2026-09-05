import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { loadState } from '@/lib/assessment/service'
import { SCALE, pickSequence } from '@/lib/assessment/items'
import { MIN_ANSWERS_FOR_READ } from '@/lib/assessment/axes'

export const dynamic = 'force-dynamic'

/**
 * A run of items for someone who wants to finish their read now rather than
 * wait out the daily drip.
 *
 * Deliberately NOT gated on `answeredToday`. The one-a-day rule exists to stop
 * US interrupting people; it has no business stopping someone who came looking.
 * The daily surfaces still stand down for the rest of the day, because
 * answering here writes today's row like any other answer.
 */
const MAX_RUN = 12

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const asked = Number(new URL(request.url).searchParams.get('count'))
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { timezone: true },
    })

    const state = await loadState(user.id, prefs?.timezone ?? null)

    // Default to exactly what a first read still needs, so the run has a
    // natural finish line rather than being an open-ended quiz.
    const toFirstRead = Math.max(0, MIN_ANSWERS_FOR_READ - state.read.answered)
    const count = Math.min(
      MAX_RUN,
      Number.isFinite(asked) && asked > 0 ? asked : Math.max(toFirstRead, 4),
    )

    const items = pickSequence(count, state.onCooldown, state.read.coverage, state.staleFirst)

    return NextResponse.json({
      items: items.map(i => ({ id: i.id, text: i.text })),
      scale: SCALE,
      answered: state.read.answered,
      needed: MIN_ANSWERS_FOR_READ,
      hasRead: state.read.lean !== null,
    })
  } catch (error) {
    console.error('Assessment batch error:', error)
    return NextResponse.json({ error: 'Failed to build run' }, { status: 500 })
  }
}
