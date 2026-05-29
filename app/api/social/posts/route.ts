/**
 * POST /api/social/posts — create a community post.
 * GET  /api/social/posts — current user's own posts (paginated).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { ensureProfile } from '@/lib/social/handle'
import { detectCrisisLevel } from '@/lib/social/crisis-detect'
import { enrichPost } from '@/lib/social/post-enrichment'

export const dynamic = 'force-dynamic'

const MAX_BODY = 1200
// Per-user posting rate limit — deters spam + thread-flooding while
// staying generous enough that a normal user (multiple journal shares
// in one day) never hits it. Tuned for "normal" not "expert poster".
const POST_LIMIT_PER_HOUR = 10
const POST_LIMIT_PER_DAY = 40

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

    // Gate first share on Community Guidelines acceptance. Client
    // shows the modal before getting here, but enforce server-side
    // so the guideline acceptance can't be bypassed via raw fetch.
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { community_guidelines_accepted_at: true },
    })
    if (!prefs?.community_guidelines_accepted_at) {
      return NextResponse.json(
        { error: 'guidelines_required', message: 'Please review the Community Guidelines before posting.' },
        { status: 412 }, // 412 Precondition Failed
      )
    }

    // Rate limit — count posts authored in the last hour + day. Both
    // gates checked so a user can't drip 10 posts every hour all day.
    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const [hourCount, dayCount] = await Promise.all([
      prisma.socialPost.count({ where: { user_id: user.id, created_at: { gt: hourAgo } } }),
      prisma.socialPost.count({ where: { user_id: user.id, created_at: { gt: dayAgo } } }),
    ])
    if (hourCount >= POST_LIMIT_PER_HOUR || dayCount >= POST_LIMIT_PER_DAY) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: hourCount >= POST_LIMIT_PER_HOUR
            ? 'You\'ve posted a lot in the last hour. Take a beat and try again later.'
            : 'You\'ve hit today\'s posting limit. Tomorrow\'s a fresh start.',
        },
        { status: 429 },
      )
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

    // Single Groq call extracts essence + themes + echo so the card
    // has its full enrichment available on first render. All fields
    // nullable / fallback safely — failure here never blocks the post.
    const mindsetForAI = body.mindsetId || null
    const enrichment = await enrichPost(text, mindsetForAI)

    const post = await prisma.socialPost.create({
      data: {
        user_id: user.id,
        body: text,
        source_entry_id: body.sourceEntryId || null,
        anonymous: !!body.anonymous,
        mindset_id: mindsetForAI,
        mood: typeof body.mood === 'string' && body.mood.trim() ? body.mood.trim().toLowerCase().slice(0, 24) : null,
        reply_to_post_id: replyToPostId,
        crisis_level: crisisLevel,
        essence: enrichment.essence,
        themes: enrichment.themes,
        echo_quote: enrichment.echo_quote,
        echo_attribution: enrichment.echo_attribution,
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
