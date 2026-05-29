/**
 * POST /api/admin/backfill-essence — one-tap retroactive essence
 * extraction for any existing community post without an essence.
 *
 * Hit this after deploying the essence feature to pull pulled-quotes
 * from the existing bot posts (and any human posts that predate the
 * feature). Admin-gated (ADMIN_USER_IDS or ADMIN_OWNER_EMAIL).
 *
 * Returns { processed, updated, skipped } so you can see the impact.
 * Idempotent: skips posts that already have an essence.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { enrichPost } from '@/lib/social/post-enrichment'

export const dynamic = 'force-dynamic'

function isAdmin(userId: string, email: string | undefined): boolean {
  const allow = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  if (allow.includes(userId)) return true
  const ownerEmail = (process.env.ADMIN_OWNER_EMAIL || '').trim().toLowerCase()
  if (ownerEmail && email && email.toLowerCase() === ownerEmail) return true
  return false
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(user.id, user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(request.url)
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 200)))

    const posts = await prisma.socialPost.findMany({
      where: { essence: null, hidden: false },
      select: { id: true, body: true, mindset_id: true },
      orderBy: { created_at: 'desc' },
      take: limit,
    })

    let updated = 0
    let skipped = 0
    const samples: { id: string; essence: string | null; themes: string[]; echo_attribution: string | null }[] = []

    for (const p of posts) {
      const enrichment = await enrichPost(p.body, p.mindset_id)
      // Update only if we got something useful — otherwise leave the
      // post alone so a future re-run can take another shot.
      if (enrichment.essence || enrichment.themes.length > 0 || enrichment.echo_quote) {
        await prisma.socialPost.update({
          where: { id: p.id },
          data: {
            essence: enrichment.essence,
            themes: enrichment.themes,
            echo_quote: enrichment.echo_quote,
            echo_attribution: enrichment.echo_attribution,
          },
        })
        updated++
        if (samples.length < 8) samples.push({
          id: p.id.slice(0, 8),
          essence: enrichment.essence,
          themes: enrichment.themes,
          echo_attribution: enrichment.echo_attribution,
        })
      } else {
        skipped++
      }
    }

    return NextResponse.json({ ok: true, processed: posts.length, updated, skipped, samples })
  } catch (err) {
    console.error('[backfill-essence] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
