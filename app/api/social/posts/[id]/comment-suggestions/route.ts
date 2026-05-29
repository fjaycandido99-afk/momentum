/**
 * GET /api/social/posts/:id/comment-suggestions
 *
 * Returns 3 short empathetic comment openers tailored to the post,
 * so people respond instead of just scrolling. Compassion-leaning
 * tone — "I've been here" / "thank you for sharing" / "this hit"
 * — never advice or correction.
 *
 * On-demand (called when comment composer opens). Cached client-side
 * for the session. Owner of the post doesn't see suggestions on
 * their own post — that'd be weird.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createChatCompletion, GROQ_FALLBACK_MODEL } from '@/lib/groq'

export const dynamic = 'force-dynamic'

interface Suggestion { text: string }

const FALLBACK: Suggestion[] = [
  { text: "I've been here. Thank you for putting words to it." },
  { text: 'Sending you strength.' },
  { text: 'This resonates.' },
]

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const post = await prisma.socialPost.findUnique({
      where: { id },
      select: { body: true, user_id: true, hidden: true, crisis_level: true },
    })
    if (!post || post.hidden) return NextResponse.json({ suggestions: FALLBACK })
    // Crisis posts: don't AI-generate random openers — could land wrong.
    // Hard-code a single safe + warm response to nudge the user.
    if (post.crisis_level === 'urgent') {
      return NextResponse.json({
        suggestions: [
          { text: 'I see you. Please reach out to one of the lines pinned above this post.' },
          { text: 'You are not alone in this.' },
        ],
      })
    }
    // Don't show the post author suggestions to comment on their own
    // post — they'd be talking to themselves.
    if (post.user_id === user.id) return NextResponse.json({ suggestions: [] })

    try {
      const system =
        'You read a personal journal reflection someone has shared publicly. ' +
        'Generate exactly 3 short comment openers (each under 80 chars) the reader could send back. ' +
        'Tone: compassionate, witnessing, never advice or correction. ' +
        'Reference the actual content lightly so it does not feel canned. ' +
        'Return ONLY valid JSON: {"suggestions": [{"text": "..."}, {"text": "..."}, {"text": "..."}]}'
      const result = await createChatCompletion({
        model: GROQ_FALLBACK_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: post.body.slice(0, 1200) },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 220,
        temperature: 0.7,
      })
      const raw = (result.choices[0]?.message?.content || '').trim()
      const parsed = JSON.parse(raw) as { suggestions?: Array<{ text?: string }> }
      const cleaned: Suggestion[] = (parsed.suggestions || [])
        .map(s => ({ text: String(s.text || '').trim() }))
        .filter(s => s.text.length >= 4 && s.text.length <= 140)
        .slice(0, 3)
      if (cleaned.length === 0) return NextResponse.json({ suggestions: FALLBACK })
      return NextResponse.json({ suggestions: cleaned })
    } catch (err) {
      console.warn('[comment-suggestions] AI failed, falling back:', err)
      return NextResponse.json({ suggestions: FALLBACK })
    }
  } catch (err) {
    console.error('[comment-suggestions]', err)
    return NextResponse.json({ suggestions: FALLBACK })
  }
}
