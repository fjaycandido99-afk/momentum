/**
 * /api/routines — one routine per person, and its steps.
 *
 * GET  the routine with its steps in time order, plus the disciplines a step
 *      can point at (so the editor needs one request, not two)
 * PUT  the whole routine — label, days, and the full list of steps
 * DELETE  remove it
 *
 * PUT replaces the steps wholesale rather than patching them one at a time.
 * The editor holds a draft and saves once, there are at most eight of them,
 * and a partial save that left a routine half-edited would be worse than a
 * rewrite: somebody would be reminded at times they had already changed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import {
  MAX_ROUTINE_STEPS,
  ROUTINE_LIMITS,
  isRoutineStepKind,
  sortSteps,
  validateSteps,
  type StepLite,
} from '@/lib/routines/steps'

export const dynamic = 'force-dynamic'

const STEP_SELECT = {
  id: true,
  kind: true,
  ref: true,
  label: true,
  minimum: true,
  time: true,
  position: true,
} as const

/** Why a save was refused, in words a person can act on. */
const REFUSALS: Record<string, string> = {
  BAD_KIND: 'That kind of step does not exist',
  BAD_TIME: 'Every step needs a time like 07:30',
  MISSING_REF: 'Pick which discipline that step is',
  MISSING_LABEL: 'Give that step a name',
  TOO_MANY: `A routine holds ${MAX_ROUTINE_STEPS} steps`,
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [routine, practices] = await Promise.all([
      prisma.routine.findUnique({
        where: { user_id: user.id },
        select: {
          id: true,
          label: true,
          days: true,
          enabled: true,
          steps: { select: STEP_SELECT },
        },
      }),
      // What a 'practice' step can point at. Active only: a step aimed at a
      // paused discipline would remind somebody about something they had
      // deliberately stopped.
      prisma.practice.findMany({
        where: { user_id: user.id, status: 'active' },
        select: { id: true, label: true, minimum: true, days: true },
        orderBy: { created_at: 'asc' },
      }),
    ])

    return NextResponse.json({
      routine: routine ? { ...routine, steps: sortSteps(routine.steps) } : null,
      practices,
      max: MAX_ROUTINE_STEPS,
    })
  } catch (error) {
    console.error('Routines GET error:', error)
    return NextResponse.json({ error: 'Could not load your routine' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`routines:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Slow down' }, { status: 429 })

    const body = await request.json().catch(() => ({}))

    const label = typeof body?.label === 'string'
      ? body.label.trim().replace(/\s+/g, ' ').slice(0, ROUTINE_LIMITS.label)
      : ''
    if (!label) return NextResponse.json({ error: 'Give the routine a name' }, { status: 400 })

    // Weekdays, deduped and sorted. Empty means every day — the same
    // convention as Practice.days, so the two cannot come to mean different
    // things.
    const days: number[] = Array.isArray(body?.days)
      ? [...new Set(
          (body.days as unknown[]).filter(
            (d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6,
          ),
        )].sort((a, b) => a - b)
      : []

    const rawSteps: unknown[] = Array.isArray(body?.steps) ? body.steps : []
    const steps: StepLite[] = rawSteps.map((raw, i) => {
      const s = raw as Record<string, unknown>
      return {
        kind: isRoutineStepKind(s?.kind) ? s.kind : ('own' as StepLite['kind']),
        ref: typeof s?.ref === 'string' ? s.ref.trim().slice(0, 200) : null,
        label: typeof s?.label === 'string'
          ? s.label.trim().replace(/\s+/g, ' ').slice(0, ROUTINE_LIMITS.stepLabel) || null
          : null,
        time: typeof s?.time === 'string' ? s.time.trim() : '',
        position: i,
      }
    })

    // The kind is coerced above so a junk value cannot crash the map, but a
    // junk value must still be refused rather than silently become 'own'.
    for (const [i, raw] of rawSteps.entries()) {
      if (!isRoutineStepKind((raw as Record<string, unknown>)?.kind)) {
        return NextResponse.json({ error: REFUSALS.BAD_KIND, step: i }, { status: 400 })
      }
    }

    const problem = validateSteps(steps)
    if (problem) return NextResponse.json({ error: REFUSALS[problem] ?? 'That routine cannot be saved', problem }, { status: 400 })

    // A step may only point at one of THEIR active disciplines. Without this
    // an id from anywhere would be accepted and the editor would show a
    // discipline that is not theirs.
    const refs = steps.filter(s => s.kind === 'practice').map(s => s.ref!).filter(Boolean)
    if (refs.length > 0) {
      const owned = await prisma.practice.count({
        where: { id: { in: refs }, user_id: user.id, status: 'active' },
      })
      if (owned !== new Set(refs).size) {
        return NextResponse.json({ error: REFUSALS.MISSING_REF }, { status: 400 })
      }
    }

    // A minimum belongs to the discipline for a 'practice' step — written in
    // one place so the floor for reading cannot drift between the routine and
    // the record.
    const rows = steps.map((s, i) => ({
      kind: s.kind,
      ref: s.kind === 'practice' ? s.ref : null,
      label: s.label,
      minimum: s.kind === 'own' && typeof rawSteps[i] === 'object'
        ? (typeof (rawSteps[i] as Record<string, unknown>).minimum === 'string'
            ? ((rawSteps[i] as Record<string, unknown>).minimum as string).trim().slice(0, ROUTINE_LIMITS.stepLabel) || null
            : null)
        : null,
      time: s.time,
      position: i,
    }))

    // One transaction: the steps are replaced, so a failure part-way through
    // must not leave a routine with half its day missing.
    const routine = await prisma.$transaction(async tx => {
      const existing = await tx.routine.upsert({
        where: { user_id: user.id },
        create: { user_id: user.id, label, days },
        update: { label, days },
        select: { id: true },
      })
      await tx.routineStep.deleteMany({ where: { routine_id: existing.id } })
      if (rows.length > 0) {
        await tx.routineStep.createMany({
          data: rows.map(r => ({ ...r, routine_id: existing.id })),
        })
      }
      return tx.routine.findUnique({
        where: { id: existing.id },
        select: { id: true, label: true, days: true, enabled: true, steps: { select: STEP_SELECT } },
      })
    })

    return NextResponse.json({ routine: routine ? { ...routine, steps: sortSteps(routine.steps) } : null })
  } catch (error) {
    console.error('Routines PUT error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // The steps go with it — RoutineStep cascades on routine_id.
    await prisma.routine.deleteMany({ where: { user_id: user.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Routines DELETE error:', error)
    return NextResponse.json({ error: 'Could not remove that' }, { status: 500 })
  }
}
