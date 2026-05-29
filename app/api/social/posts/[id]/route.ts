/**
 * GET /api/social/posts/:id — single post for the detail page.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isBlocked } from '@/lib/social/blocks'
import { detectRegion } from '@/lib/social/crisis-detect'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const p = await prisma.socialPost.findUnique({ where: { id } })
    if (!p || p.hidden) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    // Block check — 404 either way so the block is opaque to the
    // blocked party.
    const block = await isBlocked(user.id, p.user_id)
    if (block.blocked) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const author = await prisma.socialProfile.findUnique({
      where: { user_id: p.user_id },
      select: { handle: true, display_name: true },
    })

    const myReactions = await prisma.socialReaction.findMany({
      where: { user_id: user.id, post_id: id },
      select: { kind: true },
    })

    const isOwn = p.user_id === user.id
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { timezone: true },
    }).catch(() => null)
    const crisisRegion = detectRegion(prefs?.timezone ?? null)

    return NextResponse.json({
      crisis_region: crisisRegion,
      post: {
        id: p.id,
        body: p.body,
        essence: p.essence,
        themes: p.themes,
        echo_quote: p.echo_quote,
        echo_attribution: p.echo_attribution,
        lesson_title: p.lesson_title,
        lesson_body: p.lesson_body,
        voice_url: p.voice_url,
        voice_duration_sec: p.voice_duration_sec,
        mindset_id: p.mindset_id,
        source_entry_id: p.source_entry_id,
        anonymous: p.anonymous,
        created_at: p.created_at,
        reaction_count: p.reaction_count,
        comment_count: p.comment_count,
        crisis_level: p.crisis_level,
        is_own: isOwn,
        author: p.anonymous && !isOwn ? null : (author || { handle: 'user', display_name: 'Someone' }),
        my_reactions: myReactions.map(r => r.kind),
      },
    })
  } catch (err) {
    console.error('[posts/:id GET]', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
