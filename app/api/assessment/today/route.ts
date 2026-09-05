import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { loadState, nextItemFor } from '@/lib/assessment/service'
import { SCALE } from '@/lib/assessment/items'
import { MIN_ANSWERS_FOR_READ } from '@/lib/assessment/axes'

export const dynamic = 'force-dynamic'

/**
 * What the home hero card needs: today's item if there is one, and how far
 * off a first read is.
 *
 * Separate from /api/assessment/read because the card and the Progress panel
 * want opposite things — the card needs something to ASK, the panel needs
 * something to SHOW, and the panel shouldn't pay for item selection.
 *
 * `show` is the server's decision, so the card never has to reason about it:
 * the card exists to close the cold start, and once a lean exists it has
 * nothing left to do that the Progress panel doesn't do better.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ show: false })

    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { timezone: true },
    })

    const state = await loadState(user.id, prefs?.timezone ?? null)
    const item = nextItemFor(state)

    return NextResponse.json({
      // Hide as soon as there's a read to show. The popup keeps it current
      // from then on.
      show: state.read.lean === null,
      item: item ? { id: item.id, text: item.text } : null,
      scale: SCALE,
      answered: state.read.answered,
      needed: MIN_ANSWERS_FOR_READ,
      answeredToday: state.answeredToday,
    })
  } catch (error) {
    // Fails closed: a home hero card is not worth an error state on the most
    // important screen in the app.
    console.error('Assessment today error:', error)
    return NextResponse.json({ show: false })
  }
}
