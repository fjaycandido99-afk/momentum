/**
 * GET /api/routines/today — the one line home shows, or nothing.
 *
 * Computed on the server because the answer depends on the person's timezone,
 * which lives in UserPreferences, and on their disciplines' names. The client
 * gets a label and a phrase; it makes no decisions of its own, so home and
 * /training can never disagree about what the next step is.
 *
 * Three small queries and no run of its own: home already fetches a lot, and
 * this is one line on it.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { localMinutes } from '@/lib/era/wake'
import { routineGlance } from '@/lib/routines/glance'
import { isRoutineMode, isRoutineStepKind } from '@/lib/routines/steps'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [routine, prefs] = await Promise.all([
      prisma.routine.findUnique({
        where: { user_id: user.id },
        select: {
          id: true,
          label: true,
          mode: true,
          start_time: true,
          days: true,
          enabled: true,
          steps: { select: { kind: true, ref: true, label: true, time: true, position: true } },
        },
      }),
      prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { timezone: true },
      }),
    ])

    // Nothing to say, and nothing more to ask the database for.
    if (!routine || routine.steps.length === 0 || !routine.enabled) {
      return NextResponse.json({ glance: null })
    }

    const tz = prefs?.timezone ?? null
    const day = localDay(tz)
    // The weekday OF that local day, taken from the day string itself rather
    // than from a second clock read — the two could otherwise straddle
    // midnight and disagree.
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()

    // Only what a discipline step needs to read as itself.
    const refs = routine.steps.map(s => s.ref).filter((r): r is string => !!r)
    const practices = refs.length
      ? await prisma.practice.findMany({
          where: { id: { in: refs }, user_id: user.id },
          select: { id: true, label: true },
        })
      : []

    const run = await prisma.routineRun.findUnique({
      where: { routine_id_local_day: { routine_id: routine.id, local_day: day } },
      select: { steps_total: true, steps_done: true, completed_at: true },
    })

    const glance = routineGlance({
      routine: {
        label: routine.label,
        mode: isRoutineMode(routine.mode) ? routine.mode : 'timed',
        start_time: routine.start_time,
        days: routine.days,
        enabled: routine.enabled,
        // A row whose kind is not one we know is dropped rather than cast
        // into one: it would otherwise read as "Something of your own" on
        // home, which is a name the person never gave it.
        steps: routine.steps.flatMap(s =>
          isRoutineStepKind(s.kind) ? [{ ...s, kind: s.kind }] : [],
        ),
      },
      now: localMinutes(tz),
      weekday,
      run: run
        ? { steps_total: run.steps_total, steps_done: run.steps_done, completed: !!run.completed_at }
        : null,
      practiceLabels: Object.fromEntries(practices.map(p => [p.id, p.label])),
    })

    return NextResponse.json({ glance })
  } catch (error) {
    console.error('Routine today error:', error)
    // One line on home is never worth an error state.
    return NextResponse.json({ glance: null })
  }
}
