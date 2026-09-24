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
  isRoutineMode,
  isRoutineStepKind,
  isValidTime,
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
  in_minimum: true,
} as const

const ROUTINE_SELECT = {
  id: true,
  label: true,
  mode: true,
  start_time: true,
  days: true,
  enabled: true,
  steps: { select: STEP_SELECT },
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

/**
 * The routine as the client wants it: steps in the right order for its mode,
 * and `inMinimum` rather than the column's `in_minimum`.
 *
 * Sorted here rather than in the component so the order is decided once, by
 * the same function on both sides — in timed mode the clock decides, in
 * sequence mode position does.
 */
function wire(routine: {
  mode: string
  steps: { in_minimum: boolean; time: string | null; position: number }[]
}) {
  const mode = isRoutineMode(routine.mode) ? routine.mode : 'timed'
  return {
    ...routine,
    mode,
    steps: sortSteps(routine.steps, mode).map(({ in_minimum, ...step }) => ({
      ...step,
      inMinimum: in_minimum,
    })),
  }
}

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [routine, practices] = await Promise.all([
      prisma.routine.findUnique({ where: { user_id: user.id }, select: ROUTINE_SELECT }),
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
      routine: routine ? wire(routine) : null,
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
    const mode = isRoutineMode(body?.mode) ? body.mode : 'timed'

    // Only meaningful in sequence mode, where it is the one nudge to begin.
    // A timed routine's steps each carry their own time, so a start time
    // there would be a second, contradictory answer to the same question.
    const startTime = mode === 'sequence' && isValidTime(body?.startTime) ? body.startTime : null

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
        // Null in sequence mode: a step there happens when the one before
        // it is done, and storing a stale clock time would make switching
        // back to timed mode resurrect times nobody chose.
        time: mode === 'timed' && typeof s?.time === 'string' ? s.time.trim() : null,
        position: i,
        inMinimum: s?.inMinimum === true,
        minimum: typeof s?.minimum === 'string'
          ? s.minimum.trim().replace(/\s+/g, ' ').slice(0, ROUTINE_LIMITS.stepLabel) || null
          : null,
      }
    })

    // The kind is coerced above so a junk value cannot crash the map, but a
    // junk value must still be refused rather than silently become 'own'.
    for (const [i, raw] of rawSteps.entries()) {
      if (!isRoutineStepKind((raw as Record<string, unknown>)?.kind)) {
        return NextResponse.json({ error: REFUSALS.BAD_KIND, step: i }, { status: 400 })
      }
    }

    const problem = validateSteps(steps, mode)
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

    const rows = steps.map((s, i) => ({
      kind: s.kind,
      ref: s.kind === 'practice' ? s.ref : null,
      label: s.label,
      // A minimum is only ever stored for a step of their OWN. A step
      // pointing at a discipline reads that discipline's floor, so "5 pages"
      // is written in one place and cannot drift between the routine and the
      // record.
      minimum: s.kind === 'own' ? s.minimum ?? null : null,
      time: s.time,
      position: i,
      in_minimum: s.inMinimum === true,
    }))

    // One transaction: the steps are replaced, so a failure part-way through
    // must not leave a routine with half its day missing.
    const routine = await prisma.$transaction(async tx => {
      const existing = await tx.routine.upsert({
        where: { user_id: user.id },
        create: { user_id: user.id, label, days, mode, start_time: startTime },
        update: { label, days, mode, start_time: startTime },
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
        select: ROUTINE_SELECT,
      })
    })

    return NextResponse.json({ routine: routine ? wire(routine) : null })
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
