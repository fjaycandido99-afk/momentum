import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { loadState, nextItemFor } from '@/lib/assessment/service'
import { SCALE } from '@/lib/assessment/items'
import { MIN_ANSWERS_FOR_READ } from '@/lib/assessment/axes'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'

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
      // Show whenever there is something to ask today, and hide once it has
      // been answered.
      //
      // This used to hide as soon as a read existed, on the theory that the
      // Spark popup would carry the habit from there. It doesn't: the popup
      // is a ~40% roll and dismissible, so the day a user got their first
      // read the feature effectively vanished — which is exactly what
      // Francis reported ("daily hasn't popped up at all today"). The daily
      // question is the product; it needs a dependable home, not a lottery.
      // ...or once there is a read, since this card is now the feature's
      // only permanent home: the Progress panel was buried among twenty
      // others and nobody could find it.
      show: item !== null || state.read.lean !== null,
      item: item ? { id: item.id, text: item.text } : null,
      scale: SCALE,
      answered: state.read.answered,
      needed: MIN_ANSWERS_FOR_READ,
      answeredToday: state.answeredToday,
      lean: state.read.lean,
      leanName: state.read.lean ? MINDSET_CONFIGS[state.read.lean].name : null,
      leanIcon: state.read.lean ? MINDSET_CONFIGS[state.read.lean].icon : null,
      completeness: state.read.completeness,
    })
  } catch (error) {
    // Fails closed: a home hero card is not worth an error state on the most
    // important screen in the app.
    console.error('Assessment today error:', error)
    return NextResponse.json({ show: false })
  }
}
