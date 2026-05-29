/**
 * POST /api/social/posts/[id]/react — toggle a reaction on a post.
 *
 * Body: { kind: 'heart' | 'felt' | 'strength' }
 *
 * Toggles the reaction on the (user, post, kind) tuple. Updates the
 * post's denormalized reaction_count for fast feed reads. Returns the
 * new reaction state (active: bool) + count so the client can update
 * optimistically without re-fetching the post.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const VALID_KINDS = new Set(['heart', 'felt', 'strength'])

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: postId } = await context.params
    const body = await request.json()
    const kind: string = body.kind || 'heart'
    if (!VALID_KINDS.has(kind)) {
      return NextResponse.json({ error: 'invalid kind' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = await (prisma as any).socialPost.findUnique({ where: { id: postId } })
    if (!post || post.hidden) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if reaction already exists.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).socialReaction.findUnique({
      where: { post_id_user_id_kind: { post_id: postId, user_id: user.id, kind } },
    }).catch(() => null)

    if (existing) {
      // Toggle off
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).socialReaction.delete({ where: { id: existing.id } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = await (prisma as any).socialPost.update({
        where: { id: postId },
        data: { reaction_count: { decrement: 1 } },
        select: { reaction_count: true },
      })
      return NextResponse.json({ active: false, reaction_count: Math.max(0, updated.reaction_count) })
    } else {
      // Toggle on
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).socialReaction.create({
        data: { post_id: postId, user_id: user.id, kind },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = await (prisma as any).socialPost.update({
        where: { id: postId },
        data: { reaction_count: { increment: 1 } },
        select: { reaction_count: true },
      })
      return NextResponse.json({ active: true, reaction_count: updated.reaction_count })
    }
  } catch (err) {
    console.error('[social/react] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
