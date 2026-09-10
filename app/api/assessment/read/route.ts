import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { loadState } from '@/lib/assessment/service'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { AXES } from '@/lib/assessment/axes'
import { resolveSignature, signatureShare } from '@/lib/assessment/cohort'

export const dynamic = 'force-dynamic'

/**
 * The current read: the name the axes earn, how sure that is, and how much of
 * the picture is known.
 *
 * The headline is a SIGNATURE, not a mindset. Naming a mindset here put the
 * read in competition with the one the user chose in mindset-selection — the
 * screen read as "you picked wrong" rather than "here's what you're like".
 * The nearest mindset survives as a footnote, which is all it was ever
 * entitled to be.
 *
 * `signature` is null until there is genuinely enough behind it. The client
 * renders "too early to say" in that case — an honest empty state beats a
 * confident wrong answer on day two.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { timezone: true, mindset: true },
    })

    const { read } = await loadState(user.id, prefs?.timezone ?? null)
    const leanConfig = read.lean ? MINDSET_CONFIGS[read.lean] : null
    // Reads the standing name (so it stays sticky) and writes back only if
    // it actually changed. Once a day per user, on a screen they opened
    // deliberately — cheap enough to keep the table self-healing for anyone
    // who answered before signatures existed, instead of a backfill job.
    const signature = await resolveSignature(user.id, read)
    const share = await signatureShare(signature?.key ?? null)

    return NextResponse.json({
      signature: signature
        ? {
            key: signature.key,
            name: signature.name,
            blurb: signature.blurb,
            probe: signature.probe,
            named: signature.named,
            confidence: signature.confidence,
          }
        : null,
      // Share of reads landing on the same signature, or null when there
      // aren't enough reads for that to mean anything. The client hides the
      // line on null — it never fills the gap with a number.
      share,
      lean: read.lean,
      leanName: leanConfig?.name ?? null,
      leanIcon: leanConfig?.icon ?? null,
      runnerUp: read.runnerUp,
      runnerUpName: read.runnerUp ? MINDSET_CONFIGS[read.runnerUp].name : null,
      confidence: read.confidence,
      answered: read.answered,
      completeness: read.completeness,
      // The user's CHOSEN mindset, so the client can point out a divergence
      // between what they picked and what they've been answering like.
      current: prefs?.mindset ?? null,
      axes: AXES.map(a => ({
        id: a.id,
        label: a.label,
        low: a.low,
        high: a.high,
        value: read.axes[a.id],
        answers: read.coverage[a.id],
      })),
    })
  } catch (error) {
    console.error('Assessment read error:', error)
    return NextResponse.json({ error: 'Failed to load read' }, { status: 500 })
  }
}
