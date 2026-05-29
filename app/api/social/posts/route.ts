/**
 * POST /api/social/posts — create a community post.
 * GET  /api/social/posts — current user's own posts (paginated).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { ensureProfile } from '@/lib/social/handle'
import { detectCrisisLevel } from '@/lib/social/crisis-detect'

export const dynamic = 'force-dynamic'

const MAX_BODY = 1200

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const text: string = (body.body || '').trim()
    if (!text) return NextResponse.json({ error: 'body required' }, { status: 400 })
    if (text.length > MAX_BODY) {
      return NextResponse.json({ error: `body too long (max ${MAX_BODY})` }, { status: 400 })
    }

    // Ensure the user has a SocialProfile (handle gets minted lazily).
    await ensureProfile(user.id)

    // Crisis-keyword detection — duty of care. Either tier triggers an
    // inline resource banner; "urgent" also blocks comments and files
    // a high-priority report for human review. Doesn't block the post
    // itself — silencing someone in crisis is the opposite of helpful.
    const crisisLevel = detectCrisisLevel(text)

    // Validate optional reply target — must exist + not be hidden.
    let replyToPostId: string | null = null
    if (body.replyToPostId) {
      const parent = await prisma.socialPost.findUnique({
        where: { id: body.replyToPostId },
        select: { id: true, hidden: true },
      })
      if (parent && !parent.hidden) replyToPostId = parent.id
    }

    const post = await prisma.socialPost.create({
      data: {
        user_id: user.id,
        body: text,
        source_entry_id: body.sourceEntryId || null,
        anonymous: !!body.anonymous,
        mindset_id: body.mindsetId || null,
        mood: typeof body.mood === 'string' && body.mood.trim() ? body.mood.trim().toLowerCase().slice(0, 24) : null,
        reply_to_post_id: replyToPostId,
        crisis_level: crisisLevel,
      },
    })

    // Auto-file a moderation report so a human reviews crisis posts.
    if (crisisLevel) {
      await prisma.socialReport.create({
        data: {
          target_type: 'post',
          target_id: post.id,
          reporter_id: null, // null = auto-generated, not user-submitted
          reason: 'auto_crisis',
          notes: `Auto-detected crisis level: ${crisisLevel}`,
        },
      }).catch(err => console.warn('[social/posts] auto-report failed:', err))
    }

    return NextResponse.json({ post, crisis_level: crisisLevel })
  } catch (err) {
    console.error('[social/posts POST] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 20)))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posts = await (prisma as any).socialPost.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: limit,
    })

    return NextResponse.json({ posts })
  } catch (err) {
    console.error('[social/posts GET] error:', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
