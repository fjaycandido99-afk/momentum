/**
 * GET /api/social/profile/:handle — public profile + recent posts.
 *
 * Returns the profile (handle, display name, bio, mindset), the
 * follow stats (followers, following, is_followed_by_me), and the
 * latest 20 non-hidden posts by that user. Single round-trip so the
 * profile page can render in one fetch.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ handle: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { handle: rawHandle } = await context.params
    const handle = rawHandle.toLowerCase().replace(/^@/, '')

    const profile = await prisma.socialProfile.findUnique({
      where: { handle },
      select: { user_id: true, handle: true, display_name: true, bio: true, created_at: true },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Mindset for the persona chip (best-effort — falls back gracefully).
    const userRow = await prisma.user.findUnique({
      where: { id: profile.user_id },
      select: { preferences: { select: { mindset: true } } },
    }).catch(() => null)
    const mindsetId = userRow?.preferences?.mindset || null

    // Follow stats.
    const [followers, following, mineFollowing] = await Promise.all([
      prisma.socialFollow.count({ where: { followee_id: profile.user_id } }),
      prisma.socialFollow.count({ where: { follower_id: profile.user_id } }),
      prisma.socialFollow.findUnique({
        where: { follower_id_followee_id: { follower_id: user.id, followee_id: profile.user_id } },
      }).catch(() => null),
    ])

    // Recent posts by this user.
    const posts = await prisma.socialPost.findMany({
      where: { user_id: profile.user_id, hidden: false },
      orderBy: { created_at: 'desc' },
      take: 20,
    })

    // Caller's reactions on those posts so the profile page can paint
    // pressed buttons in one round-trip.
    const postIds = posts.map(p => p.id)
    const myReactions = postIds.length > 0
      ? await prisma.socialReaction.findMany({
          where: { user_id: user.id, post_id: { in: postIds } },
          select: { post_id: true, kind: true },
        })
      : []
    const reactedByPost = new Map<string, string[]>()
    for (const r of myReactions) {
      const arr = reactedByPost.get(r.post_id) || []
      arr.push(r.kind)
      reactedByPost.set(r.post_id, arr)
    }

    const isOwn = profile.user_id === user.id

    return NextResponse.json({
      profile: {
        ...profile,
        mindset_id: mindsetId,
        is_own: isOwn,
      },
      stats: {
        followers,
        following,
        is_followed_by_me: !!mineFollowing,
      },
      posts: posts.map(p => ({
        id: p.id,
        body: p.body,
        mindset_id: p.mindset_id,
        anonymous: p.anonymous,
        created_at: p.created_at,
        reaction_count: p.reaction_count,
        comment_count: p.comment_count,
        is_own: isOwn,
        // On a profile page, the author is obvious — but honor the
        // anonymous flag by skipping the author chip on anonymous posts
        // EXCEPT when viewing your own profile (you can always see
        // which of your posts are anonymous).
        author: p.anonymous && !isOwn ? null : { handle: profile.handle, display_name: profile.display_name },
        my_reactions: reactedByPost.get(p.id) || [],
      })),
    })
  } catch (err) {
    console.error('[social/profile GET] error:', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
