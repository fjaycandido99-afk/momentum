/**
 * POST /api/routines/voice — the notifications, in their coach's voice.
 *
 * Called after a save, never during one: the routine must be saved and
 * reminding them whether or not this succeeds. A step whose cue is refused
 * keeps the kind's own line, which is what every routine had before this
 * existed, so failure here is invisible rather than broken.
 *
 * Written once and stored, because it HAS to be: notifications are scheduled
 * on the device by Capacitor and fire offline, so nothing can call a model
 * when one goes off.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { aiGate } from '@/lib/ai/gate'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { parseModelJson } from '@/lib/ai/json'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import {
  VOICE_SYSTEM_PROMPT,
  buildVoicePrompt,
  toCues,
  type VoiceStep,
} from '@/lib/routines/voice'
import {
  STEP_KINDS,
  isRoutineMode,
  isRoutineStepKind,
  normalSteps,
  sortSteps,
  stepWeight,
} from '@/lib/routines/steps'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`routine-voice:${user.id}`, { limit: 6, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Slow down' }, { status: 429 })

    const routine = await prisma.routine.findUnique({
      where: { user_id: user.id },
      select: {
        id: true,
        mode: true,
        steps: {
          select: { id: true, kind: true, ref: true, label: true, time: true, position: true, weight: true },
        },
      },
    })
    if (!routine || routine.steps.length === 0) {
      return NextResponse.json({ error: 'No routine' }, { status: 404 })
    }

    const mode = isRoutineMode(routine.mode) ? routine.mode : 'timed'

    // Only the steps that will actually send a notification. Voicing an
    // optional or bad-days-only step would be a model call for a line that
    // never reaches anybody.
    //
    // The kind and weight are narrowed here rather than cast later, so the
    // rest of this route works with the same types the pure modules do.
    const known = routine.steps.flatMap(s =>
      isRoutineStepKind(s.kind) ? [{ ...s, kind: s.kind, weight: stepWeight(s.weight) }] : [],
    )
    const rows = sortSteps(
      normalSteps(known, mode).filter(s => s.weight === 'required'),
      mode,
    )
    if (rows.length === 0) return NextResponse.json({ voiced: 0 })

    // The disciplines' own names, so a cue is written about "Push Pull Legs"
    // and not about "A discipline".
    const refs = rows.map(s => s.ref).filter((r): r is string => !!r)
    const [practices, era, mindset] = await Promise.all([
      refs.length
        ? prisma.practice.findMany({
            where: { id: { in: refs }, user_id: user.id },
            select: { id: true, label: true },
          })
        : Promise.resolve([]),
      prisma.era.findFirst({
        where: { user_id: user.id, status: 'active' },
        orderBy: { created_at: 'desc' },
        select: { title: true },
      }),
      getUserMindset(user.id).catch(() => null),
    ])
    const byId = new Map(practices.map(p => [p.id, p.label]))

    const steps: VoiceStep[] = rows.map(s => ({
      kind: s.kind,
      title: s.label?.trim() || (s.ref ? byId.get(s.ref) : undefined) || STEP_KINDS[s.kind].label,
      time: s.time ?? null,
    }))

    const gate = await aiGate(user.id, 'routine_draft')
    if (!gate.ok) return gate.response

    const completion = await getGroq('routine-voice').chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        // The mindset's voice, through the same builder every other AI
        // surface uses — so the notification sounds like the coach they
        // chose rather than like a second, unrelated app.
        { role: 'system', content: buildMindsetSystemPrompt(VOICE_SYSTEM_PROMPT, mindset) },
        { role: 'user', content: buildVoicePrompt(steps, era?.title ?? null) },
      ],
      max_tokens: 700,
      // Higher than the draft: this is the one place voice is the point.
      temperature: 0.7,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    const parsed = parseModelJson<{ cues?: unknown }>(raw)

    if (!parsed) {
      await gate.refund()
      console.error('[routine-voice] unparseable response', { length: raw.length })
      return NextResponse.json({ voiced: 0, retryable: true })
    }

    const kept = toCues(parsed, steps)

    if (kept.length === 0) {
      // Every line broke a rule. Refunded, and the routine keeps the lines
      // it already had.
      await gate.refund()
      console.error('[routine-voice] all cues refused', { steps: steps.length })
      return NextResponse.json({ voiced: 0 })
    }

    // Only the ones that survived. A step left out keeps `cue` null, which
    // means the kind's own line.
    await prisma.$transaction(
      kept.map(({ index, cue }) =>
        prisma.routineStep.update({ where: { id: rows[index].id }, data: { cue } }),
      ),
    )

    return NextResponse.json({ voiced: kept.length, of: steps.length })
  } catch (error) {
    console.error('Routine voice error:', error)
    // Never fail the routine over its own wording.
    return NextResponse.json({ voiced: 0 }, { status: 200 })
  }
}
