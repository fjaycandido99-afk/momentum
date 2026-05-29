/**
 * Admin moderation queue endpoints.
 *
 * GET   /api/admin/social/reports — list pending reports (most recent first)
 * PATCH /api/admin/social/reports — resolve a report
 *
 * Admin gate: process.env.ADMIN_USER_IDS = comma-separated user IDs.
 * Set it in Vercel env. Anyone else gets 403. This is a temporary
 * gate until we have proper RBAC.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function isAdmin(userId: string): boolean {
  const allow = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  return allow.includes(userId)
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const reports = await prisma.socialReport.findMany({
      where: { status: 'pending' },
      orderBy: [
        // Auto-crisis reports float to the top — duty of care.
        { reason: 'desc' }, // 'auto_crisis' sorts above 'abuse' alphabetically (a < auto)
        { created_at: 'desc' },
      ],
      take: 100,
    })

    // Hydrate target content so the moderator sees what they're reviewing
    // without an extra round-trip per report.
    const postIds = reports.filter(r => r.target_type === 'post').map(r => r.target_id)
    const commentIds = reports.filter(r => r.target_type === 'comment').map(r => r.target_id)

    const [posts, comments] = await Promise.all([
      postIds.length > 0
        ? prisma.socialPost.findMany({ where: { id: { in: postIds } } })
        : Promise.resolve([]),
      commentIds.length > 0
        ? prisma.socialComment.findMany({ where: { id: { in: commentIds } } })
        : Promise.resolve([]),
    ])

    const postsById = new Map(posts.map(p => [p.id, p]))
    const commentsById = new Map(comments.map(c => [c.id, c]))

    return NextResponse.json({
      reports: reports.map(r => ({
        ...r,
        target: r.target_type === 'post'
          ? postsById.get(r.target_id) || null
          : commentsById.get(r.target_id) || null,
      })),
    })
  } catch (err) {
    console.error('[admin/reports GET]', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const reportId = body.report_id
    const action = body.action // "hide" | "dismiss" | "clear_crisis"
    const resolution = (body.resolution || '').toString().slice(0, 500)

    if (!reportId) return NextResponse.json({ error: 'report_id required' }, { status: 400 })
    if (!['hide', 'dismiss', 'clear_crisis'].includes(action)) {
      return NextResponse.json({ error: 'action must be hide|dismiss|clear_crisis' }, { status: 400 })
    }

    const report = await prisma.socialReport.findUnique({ where: { id: reportId } })
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    // Apply the moderator's action to the target.
    if (action === 'hide') {
      if (report.target_type === 'post') {
        await prisma.socialPost.update({
          where: { id: report.target_id },
          data: { hidden: true, hidden_reason: `Moderator: ${resolution || report.reason}` },
        })
      } else {
        await prisma.socialComment.update({
          where: { id: report.target_id },
          data: { hidden: true, hidden_reason: `Moderator: ${resolution || report.reason}` },
        })
      }
    } else if (action === 'clear_crisis' && report.target_type === 'post') {
      // Crisis content was reviewed and the author is OK — unlock comments.
      await prisma.socialPost.update({
        where: { id: report.target_id },
        data: { crisis_level: null },
      })
    }

    await prisma.socialReport.update({
      where: { id: reportId },
      data: {
        status: action === 'dismiss' || action === 'clear_crisis' ? 'dismissed' : 'resolved',
        resolution: resolution || null,
        resolved_by: user.id,
        resolved_at: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/reports PATCH]', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
