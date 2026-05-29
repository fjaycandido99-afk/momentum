/**
 * POST /api/social/follow — toggle follow on a user.
 * Body: { handle } OR { userId }
 *
 * Returns { active: bool, followers: number } so the client can
 * update the button + count optimistically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push-service'
import { isBlocked } from '@/lib/social/blocks'

export const dynamic = 'force-dynamic'

async function notifyFollow(followeeId: string, followerId: string) {
  const follower = await prisma.socialProfile.findUnique({
    where: { user_id: followerId },
    select: { display_name: true, handle: true },
  })
  if (!follower) return
  await sendPushToUser(followeeId, 'custom', {
    title: `${follower.display_name} followed you`,
    body: `Open Community to see their posts.`,
    data: { type: 'custom', event: 'social_follow', url: `/user/${follower.handle}` },
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    let followeeId: string | null = body.userId || null

    if (!followeeId && typeof body.handle === 'string') {
      const handle = body.handle.toLowerCase().replace(/^@/, '')
      const profile = await prisma.socialProfile.findUnique({
        where: { handle },
        select: { user_id: true },
      })
      followeeId = profile?.user_id || null
    }
    if (!followeeId) {
      return NextResponse.json({ error: 'handle or userId required' }, { status: 400 })
    }
    if (followeeId === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Refuse follow when either side has blocked the other.
    const block = await isBlocked(user.id, followeeId)
    if (block.blocked) {
      return NextResponse.json({ error: 'Profile not available' }, { status: 404 })
    }

    const key = { follower_id: user.id, followee_id: followeeId }
    const existing = await prisma.socialFollow.findUnique({
      where: { follower_id_followee_id: key },
    }).catch(() => null)

    let active: boolean
    if (existing) {
      await prisma.socialFollow.delete({ where: { id: existing.id } })
      active = false
    } else {
      await prisma.socialFollow.create({ data: key })
      active = true
      // Fire-and-forget follow notification (only on new follow, not unfollow).
      void notifyFollow(followeeId, user.id).catch(err => console.warn('[follow] notify failed:', err))
    }

    const followers = await prisma.socialFollow.count({ where: { followee_id: followeeId } })
    return NextResponse.json({ active, followers })
  } catch (err) {
    console.error('[social/follow] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
