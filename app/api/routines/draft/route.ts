/**
 * POST /api/routines/draft — their day, described, turned into a routine.
 *
 * The era templates cover eight days; this covers everybody else's. It
 * returns a DRAFT and saves nothing: the editor opens on it, they look at
 * their own day, and Voxu only starts sending notifications once they press
 * Save. A routine that appeared and began reminding them would be the app
 * deciding their morning for them.
 *
 * Nothing the model says is believed. lib/routines/ai-draft rebuilds every
 * field from a closed list — kinds from ROUTINE_STEP_KINDS, refs from THEIR
 * active disciplines, times through isValidTime — and the result goes through
 * `validateSteps`, the same function the editor and PUT use, so a draft that
 * could not have been built by hand can never arrive from here.
 *
 * Follows the book-summary route: no response_format (the serving model is a
 * reasoning model and the provider's JSON validator rejects the whole
 * response), tolerant parsing, and the quota refunded whenever the failure
 * is ours rather than theirs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { aiGate } from '@/lib/ai/gate'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { parseModelJson } from '@/lib/ai/json'
import {
  DRAFT_LIMITS,
  DRAFT_SYSTEM_PROMPT,
  buildDraftPrompt,
  draftSummary,
  toDraft,
  type DraftResponse,
} from '@/lib/routines/ai-draft'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`routine-draft:${user.id}`, { limit: 6, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Slow down' }, { status: 429 })

    const body = await request.json().catch(() => ({}))
    const description = typeof body?.description === 'string'
      ? body.description.trim().slice(0, DRAFT_LIMITS.description)
      : ''

    // Checked BEFORE the quota is spent: "make me a routine" with nothing
    // said is not a request a model can answer, and it must not cost a free
    // user their one draft for the day.
    if (description.length < 10) {
      return NextResponse.json(
        { error: 'Tell Voxu a little about your day first', reason: 'too_short' },
        { status: 400 },
      )
    }

    const [practices, era] = await Promise.all([
      prisma.practice.findMany({
        where: { user_id: user.id, status: 'active' },
        select: { id: true, label: true },
        orderBy: { created_at: 'asc' },
      }),
      prisma.era.findFirst({
        where: { user_id: user.id, status: 'active' },
        orderBy: { created_at: 'desc' },
        select: { title: true },
      }),
    ])

    const input = { description, practices, eraTitle: era?.title ?? null }

    const gate = await aiGate(user.id, 'routine_draft')
    if (!gate.ok) return gate.response

    const completion = await getGroq('routine-draft').chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: DRAFT_SYSTEM_PROMPT },
        { role: 'user', content: buildDraftPrompt(input) },
      ],
      // Room to reason and still answer: a tight budget on this model
      // returns empty content rather than a short answer.
      max_tokens: 900,
      // Low, deliberately. This is a transcription of what somebody said
      // about their day into a fixed shape — there is nothing here for
      // invention to improve.
      temperature: 0.2,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    const parsed = parseModelJson<DraftResponse>(raw)

    if (!parsed) {
      await gate.refund()
      console.error('[routine-draft] unparseable response', { length: raw.length })
      return NextResponse.json({ error: 'Voxu could not read that back', retryable: true }, { status: 502 })
    }

    const result = toDraft(parsed, input)

    if ('problem' in result) {
      // Every field was rebuilt and nothing survived. Refunded: the prompt
      // not holding is our problem, not the person's, and they still have
      // no routine to show for it.
      await gate.refund()
      console.error('[routine-draft] refused', { problem: result.problem })
      return NextResponse.json(
        {
          error: 'Voxu could not turn that into a day. Try naming the times, or build it by hand.',
          problem: result.problem,
        },
        { status: 422 },
      )
    }

    return NextResponse.json({
      draft: result.draft,
      summary: draftSummary(result.draft),
      quota: { remaining: gate.quota.remaining, limit: gate.quota.limit },
    })
  } catch (error) {
    console.error('Routine draft error:', error)
    return NextResponse.json({ error: 'Could not build that' }, { status: 500 })
  }
}
