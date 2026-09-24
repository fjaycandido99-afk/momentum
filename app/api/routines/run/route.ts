/**
 * POST /api/routines/run — starting, advancing and finishing a routine.
 *
 * It records the ROUTINE, never the habits inside it. A discipline keeps its
 * own record of whether you did it; this keeps whether you ran the day. That
 * distinction is the only reason both features can exist without duplicating
 * each other, and it is what will make Review honest: "5 of 7 days started"
 * counts these rows rather than inferring anything about anybody.
 *
 * One run per routine per local day. Starting it twice is the same day, not
 * two — so the write is an upsert on (routine, day) and re-entering a routine
 * you half-finished this morning continues it instead of splitting the record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { localDay } from '@/lib/assessment/service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`routine-run:${user.id}`, { limit: 60, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Slow down' }, { status: 429 })

    const body = await request.json().catch(() => ({}))

    const routine = await prisma.routine.findUnique({
      where: { user_id: user.id },
      select: { id: true },
    })
    if (!routine) return NextResponse.json({ error: 'No routine' }, { status: 404 })

    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { timezone: true },
    })
    const day = localDay(prefs?.timezone ?? null)

    const minimum = body?.minimum === true
    const stepsTotal = Number.isInteger(body?.stepsTotal) ? Math.max(0, body.stepsTotal) : 0
    const stepsDone = Number.isInteger(body?.stepsDone) ? Math.max(0, body.stepsDone) : 0
    const done = body?.done === true

    const run = await prisma.routineRun.upsert({
      where: { routine_id_local_day: { routine_id: routine.id, local_day: day } },
      create: {
        routine_id: routine.id,
        local_day: day,
        minimum,
        steps_total: stepsTotal,
        steps_done: stepsDone,
        completed_at: done ? new Date() : null,
      },
      update: {
        minimum,
        steps_total: stepsTotal,
        // `steps_done` is deliberately absent here — see below.
        completed_at: done ? new Date() : undefined,
      },
      select: { id: true, steps_done: true, steps_total: true, completed_at: true },
    })

    /**
     * Progress only ever goes UP.
     *
     * Re-opening a routine later in the day must not erase what it already
     * recorded, and a step passed twice is still one step done. So the upsert
     * leaves `steps_done` alone and it is raised here only when the new count
     * is higher. Prisma has no "greatest of" in an update, and a raw query
     * for one integer is not worth it.
     */
    if (stepsDone > run.steps_done) {
      const bumped = await prisma.routineRun.update({
        where: { id: run.id },
        data: { steps_done: stepsDone },
        select: { id: true, steps_done: true, steps_total: true, completed_at: true },
      })
      return NextResponse.json({ run: bumped })
    }

    return NextResponse.json({ run })
  } catch (error) {
    console.error('Routine run error:', error)
    // Never fail the routine over its own bookkeeping: somebody walking
    // through their morning must not be stopped by a write.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
