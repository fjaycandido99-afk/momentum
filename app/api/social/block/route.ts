/**
 * POST   /api/social/block    — toggle block on a user (by handle OR userId)
 * GET    /api/social/block    — list users I've blocked (for /settings/blocks)
 *
 * Blocking is one-way (A blocks B). Both directions exclude each other
 * from feeds + actions via lib/social/blocks.ts. When you block someone:
 *   - Any existing follow in EITHER direction is dropped automatically.
 *   - Their existing reactions on your posts stay (rewriting history is
 *     worse than the data; they just can't react going forward).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    let targetId: string | null = body.userId || null
    if (!targetId && typeof body.handle === 'string') {
      const handle = body.handle.toLowerCase().replace(/^@/, '')
      const profile = await prisma.socialProfile.findUnique({
        where: { handle },
        select: { user_id: true },
      })
      targetId = profile?.user_id || null
    }
    if (!targetId) return NextResponse.json({ error: 'handle or userId required' }, { status: 400 })
    if (targetId === user.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
    }

    const existing = await prisma.socialBlock.findUnique({
      where: { blocker_id_blocked_id: { blocker_id: user.id, blocked_id: targetId } },
    }).catch(() => null)

    let active: boolean
    if (existing) {
      // Toggle off — unblock.
      await prisma.socialBlock.delete({ where: { id: existing.id } })
      active = false
    } else {
      // Block. Also drop any follow in either direction so a former
      // follower can't keep tracking the blocker's activity via their
      // Following feed.
      await prisma.socialBlock.create({
        data: { blocker_id: user.id, blocked_id: targetId },
      })
      await prisma.socialFollow.deleteMany({
        where: {
          OR: [
            { follower_id: user.id, followee_id: targetId },
            { follower_id: targetId, followee_id: user.id },
          ],
        },
      }).catch(() => {})
      active = true
    }

    return NextResponse.json({ active })
  } catch (err) {
    console.error('[social/block POST]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const blocks = await prisma.socialBlock.findMany({
      where: { blocker_id: user.id },
      orderBy: { created_at: 'desc' },
    })
    const profiles = blocks.length > 0
      ? await prisma.socialProfile.findMany({
          where: { user_id: { in: blocks.map(b => b.blocked_id) } },
          select: { user_id: true, handle: true, display_name: true },
        })
      : []
    const byUser = new Map(profiles.map(p => [p.user_id, { handle: p.handle, display_name: p.display_name }]))

    return NextResponse.json({
      blocks: blocks.map(b => ({
        id: b.id,
        user_id: b.blocked_id,
        created_at: b.created_at,
        profile: byUser.get(b.blocked_id) || { handle: 'user', display_name: 'Unknown user' },
      })),
    })
  } catch (err) {
    console.error('[social/block GET]', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
