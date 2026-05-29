/**
 * POST /api/social/reports — user-submitted abuse / spam / etc. report.
 *
 * Body: { target_type: "post" | "comment", target_id, reason, notes? }
 *
 * Reasons: "abuse" | "spam" | "off_topic" | "self_harm_concern"
 * (auto_crisis is reserved for system-generated reports.)
 *
 * Rate-limited per user (10 reports per hour) to deter spam-reporting.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const VALID_REASONS = new Set(['abuse', 'spam', 'off_topic', 'self_harm_concern'])
const RATE_LIMIT_PER_HOUR = 10

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const targetType = body.target_type
    const targetId = body.target_id
    const reason = body.reason
    const notes = (body.notes || '').toString().trim().slice(0, 500)

    if (targetType !== 'post' && targetType !== 'comment') {
      return NextResponse.json({ error: 'target_type must be post|comment' }, { status: 400 })
    }
    if (!targetId) return NextResponse.json({ error: 'target_id required' }, { status: 400 })
    if (!VALID_REASONS.has(reason)) {
      return NextResponse.json({ error: `reason must be one of: ${[...VALID_REASONS].join(', ')}` }, { status: 400 })
    }

    // Rate limit
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentCount = await prisma.socialReport.count({
      where: { reporter_id: user.id, created_at: { gt: hourAgo } },
    })
    if (recentCount >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json({ error: 'Rate limit reached — try again later.' }, { status: 429 })
    }

    // Verify target exists
    if (targetType === 'post') {
      const post = await prisma.socialPost.findUnique({ where: { id: targetId } })
      if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    } else {
      const comment = await prisma.socialComment.findUnique({ where: { id: targetId } })
      if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const report = await prisma.socialReport.create({
      data: {
        target_type: targetType,
        target_id: targetId,
        reporter_id: user.id,
        reason,
        notes: notes || null,
      },
    })

    return NextResponse.json({ ok: true, report_id: report.id })
  } catch (err) {
    console.error('[reports POST]', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
