/**
 * GET /api/social/feed — paginated public community feed.
 *
 * Reverse chronological (most recent first). Each post includes
 * author profile (handle, display name) UNLESS the post is
 * anonymous, plus the current user's reaction state per kind so
 * the client can paint the buttons "pressed" without a second
 * round-trip.
 *
 * Query params:
 *   cursor=<postId>  — start after this id (createdAt-based pagination)
 *   limit=<n>        — max 50, default 20
 *   scope=all|following  (default all; following not implemented in v1)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getBlockedUserIds } from '@/lib/social/blocks'
import { detectRegion } from '@/lib/social/crisis-detect'

export const dynamic = 'force-dynamic'

interface AuthorLite {
  handle: string
  display_name: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 20)))
    const cursor = url.searchParams.get('cursor')
    const scope = url.searchParams.get('scope') || 'all'
    const moodFilter = url.searchParams.get('mood') || null
    const mindsetFilter = url.searchParams.get('mindset') || null

    // Following-scope: limit to authors the caller follows (+ self,
    // so a user's own posts always show on their Following feed too).
    let userIdsFilter: string[] | null = null
    if (scope === 'following') {
      const follows = await prisma.socialFollow.findMany({
        where: { follower_id: user.id },
        select: { followee_id: true },
      })
      userIdsFilter = [...follows.map(f => f.followee_id), user.id]
      // Empty following set → return empty feed instead of "everyone".
      if (userIdsFilter.length === 1 && follows.length === 0) {
        return NextResponse.json({ posts: [], nextCursor: null, scope })
      }
    }

    // Block-aware filter — exclude posts authored by anyone in EITHER
    // direction of a block relationship with this user.
    const blockedIds = await getBlockedUserIds(user.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawPosts: any[] = await (prisma as any).socialPost.findMany({
      where: {
        hidden: false,
        ...(userIdsFilter ? { user_id: { in: userIdsFilter } } : {}),
        ...(blockedIds.length > 0 ? { user_id: { notIn: blockedIds } } : {}),
        ...(moodFilter ? { mood: moodFilter } : {}),
        ...(mindsetFilter ? { mindset_id: mindsetFilter } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })

    if (rawPosts.length === 0) {
      return NextResponse.json({ posts: [], nextCursor: null })
    }

    const authorIds = Array.from(new Set(rawPosts.map(p => p.user_id)))
    const postIds = rawPosts.map(p => p.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profiles = await (prisma as any).socialProfile.findMany({
      where: { user_id: { in: authorIds } },
      select: { user_id: true, handle: true, display_name: true },
    })
    const profileByUser = new Map<string, AuthorLite>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profiles.map((p: any) => [p.user_id, { handle: p.handle, display_name: p.display_name }]),
    )

    // Pull the CURRENT user's reactions on this page so the UI can
    // paint pressed states without an extra request per post.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myReactions: any[] = await (prisma as any).socialReaction.findMany({
      where: { user_id: user.id, post_id: { in: postIds } },
      select: { post_id: true, kind: true },
    })
    const reactedKindsByPost = new Map<string, Set<string>>()
    for (const r of myReactions) {
      const set = reactedKindsByPost.get(r.post_id) || new Set<string>()
      set.add(r.kind)
      reactedKindsByPost.set(r.post_id, set)
    }

    // Hydrate quote-parent posts for replies in one extra query.
    const replyTargetIds = Array.from(new Set(
      rawPosts.map(p => p.reply_to_post_id).filter(Boolean),
    )) as string[]
    const parentPosts = replyTargetIds.length > 0
      ? await prisma.socialPost.findMany({
          where: { id: { in: replyTargetIds } },
          select: { id: true, body: true, anonymous: true, user_id: true },
        })
      : []
    const parentById = new Map(parentPosts.map(pp => [pp.id, pp]))
    const parentAuthorProfiles = parentPosts.length > 0
      ? await prisma.socialProfile.findMany({
          where: { user_id: { in: parentPosts.map(pp => pp.user_id) } },
          select: { user_id: true, handle: true, display_name: true },
        })
      : []
    const parentAuthorByUser = new Map(parentAuthorProfiles.map(p => [p.user_id, p]))

    const posts = rawPosts.map(p => {
      const author = profileByUser.get(p.user_id)
      const isOwn = p.user_id === user.id
      // Build the quote-parent payload (body excerpt + author chip)
      // when this post is a reply.
      let replyTo: { id: string; excerpt: string; author: AuthorLite | null } | null = null
      if (p.reply_to_post_id) {
        const parent = parentById.get(p.reply_to_post_id)
        if (parent) {
          const pa = parentAuthorByUser.get(parent.user_id)
          replyTo = {
            id: parent.id,
            excerpt: parent.body.slice(0, 240),
            author: parent.anonymous ? null : (pa ? { handle: pa.handle, display_name: pa.display_name } : null),
          }
        }
      }
      return {
        id: p.id,
        body: p.body,
        mindset_id: p.mindset_id,
        source_entry_id: p.source_entry_id,
        anonymous: p.anonymous,
        mood: p.mood,
        view_count: p.view_count,
        relate_count: p.relate_count,
        reply_to: replyTo,
        created_at: p.created_at,
        reaction_count: p.reaction_count,
        comment_count: p.comment_count,
        crisis_level: p.crisis_level,
        is_own: isOwn,
        // Anonymous posts hide author info from everyone EXCEPT the
        // author themselves (who needs to see their own posts in the
        // feed and recognize them).
        author:
          p.anonymous && !isOwn
            ? null
            : (author || { handle: 'user', display_name: 'Someone' }),
        my_reactions: Array.from(reactedKindsByPost.get(p.id) || []),
      }
    })

    const nextCursor = rawPosts.length === limit ? rawPosts[rawPosts.length - 1].id : null

    // Surface the viewer's crisis region (derived from timezone) so the
    // client banner can pick localized helplines per-post. Cheap — one
    // tiny lookup per feed fetch; tied to user's UserPreferences.
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { timezone: true },
    }).catch(() => null)
    const crisisRegion = detectRegion(prefs?.timezone ?? null)

    return NextResponse.json({ posts, nextCursor, scope, mood: moodFilter, mindset: mindsetFilter, crisis_region: crisisRegion })
  } catch (err) {
    console.error('[social/feed] error:', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
