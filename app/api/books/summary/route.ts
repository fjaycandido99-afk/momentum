/**
 * POST /api/books/summary — what Voxu says about the book you're reading.
 *
 * The point is not the summary; a summary of Atomic Habits is a search away.
 * The point is the second field: "you are nine days into Discipline Era, and
 * here is the one idea in this book that serves that." Nothing else can say
 * it, because nothing else knows the era.
 *
 * Two guards, both because a confident summary of the wrong book is worse
 * than no summary:
 *   - GROUNDED. Requires a resolved title AND author (isGrounded), which
 *     come from /api/books/search. A bare typed string is not enough: hand a
 *     model "Atomik Habbits" and it writes something.
 *   - VALIDATED. lib/books/summary refuses chapter breakdowns, quotes,
 *     prescriptions, claims to have read it, and borrowed authority — and
 *     honours the model's own `unknown` escape rather than retrying it into
 *     an answer.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { aiGate } from '@/lib/ai/gate'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { loadEraToday } from '@/lib/era/service'
import { isGrounded } from '@/lib/books/lookup'
import {
  SUMMARY_SYSTEM_PROMPT,
  buildSummaryPrompt,
  toSummary,
  validateSummary,
  type SummaryDraft,
} from '@/lib/books/summary'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = rateLimit(`books-summary:${user.id}`, { limit: 10, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const author = typeof body?.author === 'string' ? body.author.trim() : ''

    // Validated BEFORE the quota is spent — an ungrounded request must not
    // cost a free user their one summary for the day.
    if (!isGrounded({ title, author })) {
      return NextResponse.json(
        {
          error: 'A title and author are required',
          // Named so the UI can say the useful thing: pick the book from the
          // list rather than just typing it.
          reason: 'ungrounded',
        },
        { status: 400 },
      )
    }

    const gate = await aiGate(user.id, 'book_summary')
    if (!gate.ok) return gate.response

    const era = await loadEraToday(user.id).catch(() => null)

    const completion = await getGroq('book-summary').chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildSummaryPrompt({
            title,
            author,
            eraTitle: era?.title ?? null,
            eraDay: era?.day ?? null,
            eraIntent: era?.change ?? null,
          }),
        },
      ],
      // Room to think and still answer: the serving model spends tokens
      // reasoning before it writes, and a tight budget here returns empty
      // content rather than a short answer. See journal-conversation.
      max_tokens: 700,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    let draft: SummaryDraft
    try {
      draft = JSON.parse(raw)
    } catch {
      // Our failure, not theirs — give the allowance back. On a feature with
      // one a day, a bad roll here would otherwise cost a free user their
      // summary until tomorrow.
      await gate.refund()
      console.error('[book-summary] unparseable response', { title, length: raw.length })
      return NextResponse.json({ error: 'Voxu could not read that back', retryable: true }, { status: 502 })
    }

    const problem = validateSummary(draft)

    if (problem === 'UNKNOWN_BOOK') {
      // Not an error. The model was asked to say so when it does not know a
      // book, and saying so is the honest answer — shown as itself.
      return NextResponse.json({
        unknown: true,
        quota: { remaining: gate.quota.remaining, limit: gate.quota.limit },
      })
    }

    if (problem) {
      // A rule was broken. Refuse rather than show it: every one of these
      // rules exists because the version that breaks it is worse than
      // nothing. Logged so the rate is visible in the AI call log.
      //
      // Refunded, unlike UNKNOWN_BOOK above: the model breaking a content
      // rule is our problem to solve, and charging somebody for it is
      // charging them for our prompt not holding.
      await gate.refund()
      console.error('[book-summary] refused', { title, problem })
      return NextResponse.json({ error: 'Voxu had nothing useful to say about that', problem }, { status: 422 })
    }

    return NextResponse.json({
      book: { title, author },
      summary: toSummary(draft),
      era: era ? { title: era.title, day: era.day } : null,
      quota: { remaining: gate.quota.remaining, limit: gate.quota.limit },
    })
  } catch (error) {
    console.error('Book summary error:', error)
    return NextResponse.json({ error: 'Voxu could not do that just now', retryable: true }, { status: 503 })
  }
}
