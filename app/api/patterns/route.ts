import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadPatternsWithCharts, pastEraGapDays } from '@/lib/patterns/server'
import { sampleInsight } from '@/lib/home/insights'
import { isPremiumUser } from '@/lib/subscription-check'

export const dynamic = 'force-dynamic'

/**
 * GET — what this person's own record shows (lib/patterns/rules.ts): the
 * patterns that cleared their thresholds, what's still needed before more
 * can be said, and the counts behind every line.
 *
 * Their own data only, and never the words they wrote.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Laws are free — their own record. The rhythm and blocker charts are
    // Premium: sent only to Premium, with a flag so the screen can say so.
    //
    // Free also gets ONE line from those charts (sample), which Home offers
    // once as "A Premium insight — on us". And everyone gets their past
    // eras' slip days (gapDays) — the day-before warning is theirs, free.
    const [report, premium, gapDays] = await Promise.all([
      loadPatternsWithCharts(user.id),
      isPremiumUser(user.id),
      pastEraGapDays(user.id).catch(() => [] as number[]),
    ])
    return NextResponse.json(premium
      ? { ...report, gapDays }
      : { ...report, charts: null, chartsLocked: true, sample: sampleInsight(report.charts), gapDays })
  } catch (error) {
    console.error('[patterns GET] error:', error)
    return NextResponse.json({ error: 'Could not read your record right now.' }, { status: 500 })
  }
}
