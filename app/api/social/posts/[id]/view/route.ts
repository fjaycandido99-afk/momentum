/**
 * POST /api/social/posts/:id/view — increment view counter.
 *
 * Client-side dedup expected: PostCard fires this once per session
 * per post (key in sessionStorage). Authors viewing their own posts
 * don't bump the counter.
 *
 * Counts are intentionally aggregate, not per-user. We're not building
 * "X viewed your post" stalker metrics — just soft-validation for the
 * author ("247 people read this").
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const post = await prisma.socialPost.findUnique({
      where: { id },
      select: { id: true, hidden: true, user_id: true },
    })
    if (!post || post.hidden) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    // Don't count author's own views — the metric is meant to show
    // OTHERS read the post, not "you keep refreshing it."
    if (post.user_id === user.id) {
      return NextResponse.json({ ok: true, skipped: 'own_view' })
    }

    const updated = await prisma.socialPost.update({
      where: { id },
      data: { view_count: { increment: 1 } },
      select: { view_count: true },
    })

    return NextResponse.json({ ok: true, view_count: updated.view_count })
  } catch (err) {
    console.error('[posts/view]', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
