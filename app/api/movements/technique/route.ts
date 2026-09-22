import { NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/auth/admin'
import {
  allTechnique,
  deleteTechnique,
  saveTechnique,
  techniqueFor,
} from '@/lib/movements/technique-server'
import {
  TECHNIQUE_ERRORS,
  validateTechnique,
  type TechniqueDraft,
} from '@/lib/movements/technique'

/**
 * Reviewed technique guidance.
 *
 * Reading is open to any signed-in reader — it's the same words for
 * everybody, and the whole point is that people see whose they are.
 * Writing is admin-only, and every rule is enforced in the pure layer so
 * this route cannot be the place a cue sneaks through.
 */

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')

  if (id) {
    const technique = await techniqueFor(id)
    return NextResponse.json({ technique })
  }

  return NextResponse.json({ technique: await allTechnique() })
}

export async function PUT(request: Request) {
  const admin = await currentAdmin()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.movementId !== 'string') {
    return NextResponse.json({ error: 'Which movement?' }, { status: 400 })
  }

  const draft: TechniqueDraft = {
    movementId: body.movementId,
    reviewedBy: String(body.reviewedBy ?? ''),
    reviewedOn: String(body.reviewedOn ?? ''),
    steps: Array.isArray(body.steps) ? body.steps.map(String) : [],
    cues: Array.isArray(body.cues) ? body.cues : [],
    mistakes: Array.isArray(body.mistakes) ? body.mistakes : [],
    callouts: Array.isArray(body.callouts) ? body.callouts : [],
  }

  const problem = validateTechnique(draft)
  if (problem) {
    // The reviewer's own words back, not a status code.
    return NextResponse.json({ error: TECHNIQUE_ERRORS[problem], code: problem }, { status: 400 })
  }

  const technique = await saveTechnique(draft)
  return NextResponse.json({ technique })
}

export async function DELETE(request: Request) {
  const admin = await currentAdmin()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Which movement?' }, { status: 400 })

  await deleteTechnique(id)
  return NextResponse.json({ ok: true })
}
