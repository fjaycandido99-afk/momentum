/**
 * GET /api/social/posts/:id — single post for the detail page.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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

    const author = await prisma.socialProfile.findUnique({
      where: { user_id: p.user_id },
      select: { handle: true, display_name: true },
    })

    const myReactions = await prisma.socialReaction.findMany({
      where: { user_id: user.id, post_id: id },
      select: { kind: true },
    })

    const isOwn = p.user_id === user.id

    return NextResponse.json({
      post: {
        id: p.id,
        body: p.body,
        mindset_id: p.mindset_id,
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
