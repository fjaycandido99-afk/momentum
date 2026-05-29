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
import { sendPushToUser } from '@/lib/push-service'

export const dynamic = 'force-dynamic'

const VALID_KINDS = new Set(['heart', 'relate', 'learn'])

const REACTION_LABEL: Record<string, string> = {
  heart:    'sent you a ❤️',
  relate:   "said 'I relate' 🪞",
  learn:    'learned from your entry 🌱',
}

// Tiny helper to keep the inline use site clean. Bypasses the per-type
// subscription filter via 'custom' (same trick as ai_callback in
// alert-service map). Future polish: a dedicated 'social' alert type
// with its own opt-out toggle in Settings.
async function notifyReaction(authorId: string, reactorId: string, postId: string, kind: string) {
  const reactor = await prisma.socialProfile.findUnique({
    where: { user_id: reactorId },
    select: { display_name: true, handle: true },
  })
  const who = reactor?.display_name || 'Someone'
  await sendPushToUser(authorId, 'custom', {
    title: `${who} ${REACTION_LABEL[kind] || 'reacted'}`,
    body: 'Tap to see.',
    data: { type: 'custom', event: 'social_reaction', url: `/post/${postId}`, post_id: postId },
  })
}

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

    const post = await prisma.socialPost.findUnique({ where: { id: postId } })
    if (!post || post.hidden) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if reaction already exists.
    const existing = await prisma.socialReaction.findUnique({
      where: { post_id_user_id_kind: { post_id: postId, user_id: user.id, kind } },
    }).catch(() => null)

    if (existing) {
      // Toggle off — also decrement relate_count if this was a relate.
      await prisma.socialReaction.delete({ where: { id: existing.id } })
      const updated = await prisma.socialPost.update({
        where: { id: postId },
        data: {
          reaction_count: { decrement: 1 },
          ...(kind === 'relate' ? { relate_count: { decrement: 1 } } : {}),
        },
        select: { reaction_count: true, relate_count: true },
      })
      return NextResponse.json({
        active: false,
        reaction_count: Math.max(0, updated.reaction_count),
        relate_count: Math.max(0, updated.relate_count),
      })
    } else {
      // Toggle on — increment relate_count too if this is a relate
      // reaction (for the "X related" soft-validation footer).
      await prisma.socialReaction.create({
        data: { post_id: postId, user_id: user.id, kind },
      })
      const updated = await prisma.socialPost.update({
        where: { id: postId },
        data: {
          reaction_count: { increment: 1 },
          ...(kind === 'relate' ? { relate_count: { increment: 1 } } : {}),
        },
        select: { reaction_count: true, relate_count: true },
      })

      // Fire-and-forget notification to the post author (unless they
      // reacted to their own post — no self-pings). Reuses the existing
      // push pipeline via sendPushToUser('custom') so it bypasses the
      // per-type subscription filter for now (same pattern as ai_callback).
      if (post.user_id !== user.id) {
        void notifyReaction(post.user_id, user.id, postId, kind).catch(err =>
          console.warn('[react] notify failed:', err),
        )
      }

      return NextResponse.json({
        active: true,
        reaction_count: updated.reaction_count,
        relate_count: updated.relate_count,
      })
    }
  } catch (err) {
    console.error('[social/react] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
