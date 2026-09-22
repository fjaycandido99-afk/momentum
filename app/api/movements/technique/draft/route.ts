import { NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/auth/admin'
import { createChatCompletion } from '@/lib/groq'
import { MOVEMENTS_BY_ID } from '@/lib/movements/library'
import { DRAFT_SYSTEM_PROMPT, draftUserPrompt, parseDraft } from '@/lib/movements/technique-draft'
import { saveDraft } from '@/lib/movements/technique-server'

/**
 * Draft technique notes for one movement.
 *
 * Admin-only, and it cannot publish: saveDraft writes `published: false`
 * and leaves the reviewer blank, so nothing here reaches a reader. The
 * point is to save a reviewer typing, not to replace them.
 */
export const maxDuration = 60

export async function POST(request: Request) {
  const admin = await currentAdmin()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const movementId = typeof body?.movementId === 'string' ? body.movementId : ''
  if (!MOVEMENTS_BY_ID.has(movementId)) {
    return NextResponse.json({ error: 'Which movement?' }, { status: 400 })
  }

  const user = draftUserPrompt(movementId)
  if (!user) return NextResponse.json({ error: 'Which movement?' }, { status: 400 })

  let text: string
  try {
    const completion = await createChatCompletion(
      {
        messages: [
          { role: 'system', content: DRAFT_SYSTEM_PROMPT },
          { role: 'user', content: user },
        ],
        temperature: 0.4,
        max_tokens: 900,
      },
      { endpoint: 'movement-technique-draft', userId: admin.id },
    )
    text = completion.choices?.[0]?.message?.content ?? ''
  } catch {
    return NextResponse.json({ error: 'The model did not answer. Try again.' }, { status: 502 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const result = parseDraft(movementId, text, today)
  if (!result) return NextResponse.json({ error: 'Which movement?' }, { status: 400 })

  if (result.rejected) {
    // Rejected drafts are never stored: a draft that breaks a rule would
    // sit there waiting to be published by someone skim-reading.
    return NextResponse.json({ error: result.rejected }, { status: 422 })
  }

  await saveDraft(movementId, result.draft)
  return NextResponse.json({ draft: result.draft })
}
