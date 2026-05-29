/**
 * GET  /api/social/posts/:id/comments — list comments on a post.
 * POST /api/social/posts/:id/comments — add a comment.
 *
 * Comments are blocked on posts with crisis_level === 'urgent' until a
 * moderator clears the post. Public-facing reason returned in the API
 * so the UI can display the right empty-state copy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { ensureProfile } from '@/lib/social/handle'
import { detectCrisisLevel } from '@/lib/social/crisis-detect'
import { sendPushToUser } from '@/lib/push-service'
import { isBlocked, getBlockedUserIds } from '@/lib/social/blocks'

async function notifyComment(authorId: string, commenterId: string, postId: string) {
  if (authorId === commenterId) return
  const commenter = await prisma.socialProfile.findUnique({
    where: { user_id: commenterId },
    select: { display_name: true },
  })
  const who = commenter?.display_name || 'Someone'
  await sendPushToUser(authorId, 'custom', {
    title: `${who} commented on your post`,
    body: 'Tap to read.',
    data: { type: 'custom', event: 'social_comment', url: `/post/${postId}`, post_id: postId },
  })
}

export const dynamic = 'force-dynamic'

const MAX_BODY = 600

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: postId } = await context.params

    // Exclude comments authored by users in either direction of a
    // block with this viewer.
    const blockedIds = await getBlockedUserIds(user.id)
    const comments = await prisma.socialComment.findMany({
      where: {
        post_id: postId,
        hidden: false,
        ...(blockedIds.length > 0 ? { user_id: { notIn: blockedIds } } : {}),
      },
      orderBy: { created_at: 'asc' },
      take: 200,
    })

    if (comments.length === 0) return NextResponse.json({ comments: [] })

    const authorIds = Array.from(new Set(comments.map(c => c.user_id)))
    const profiles = await prisma.socialProfile.findMany({
      where: { user_id: { in: authorIds } },
      select: { user_id: true, handle: true, display_name: true },
    })
    const byUser = new Map(profiles.map(p => [p.user_id, { handle: p.handle, display_name: p.display_name }]))

    return NextResponse.json({
      comments: comments.map(c => ({
        id: c.id,
        body: c.body,
        created_at: c.created_at,
        is_own: c.user_id === user.id,
        author: byUser.get(c.user_id) || { handle: 'user', display_name: 'Someone' },
      })),
    })
  } catch (err) {
    console.error('[comments GET]', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
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
    const text: string = (body.body || '').trim()
    if (!text) return NextResponse.json({ error: 'body required' }, { status: 400 })
    if (text.length > MAX_BODY) return NextResponse.json({ error: `body too long (max ${MAX_BODY})` }, { status: 400 })

    const post = await prisma.socialPost.findUnique({ where: { id: postId } })
    if (!post || post.hidden) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    // Refuse comment when either party blocked the other. 404, not 403,
    // so we don't tip off the blocked user that a block exists.
    const block = await isBlocked(user.id, post.user_id)
    if (block.blocked) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    if (post.crisis_level === 'urgent') {
      return NextResponse.json(
        { error: 'Comments are paused on this post while we make sure it has the right support. Please react with strength instead.' },
        { status: 423 }, // 423 Locked
      )
    }

    await ensureProfile(user.id)

    // Detect crisis content on the comment too — same auto-report path.
    const crisisLevel = detectCrisisLevel(text)

    const comment = await prisma.socialComment.create({
      data: {
        post_id: postId,
        user_id: user.id,
        body: text,
        crisis_level: crisisLevel,
      },
    })

    // Bump denormalized counter on the post for fast feed reads.
    await prisma.socialPost.update({
      where: { id: postId },
      data: { comment_count: { increment: 1 } },
    }).catch(() => {})

    if (crisisLevel) {
      await prisma.socialReport.create({
        data: {
          target_type: 'comment',
          target_id: comment.id,
          reporter_id: null,
          reason: 'auto_crisis',
          notes: `Auto-detected crisis level: ${crisisLevel}`,
        },
      }).catch(err => console.warn('[comments] auto-report failed:', err))
    }

    // Notify the post author (not for crisis-flagged comments — those
    // need human review before pinging the author).
    if (!crisisLevel) {
      void notifyComment(post.user_id, user.id, postId).catch(err =>
        console.warn('[comments] notify failed:', err),
      )
    }

    return NextResponse.json({ comment, crisis_level: crisisLevel })
  } catch (err) {
    console.error('[comments POST]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
