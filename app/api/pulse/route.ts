/**
 * GET /api/pulse — what matters right now, and what today holds.
 *
 * Gathers what the app already knows — the era's day loop, today's
 * disciplines, the routine's times — in the person's own timezone, and hands
 * it to the pure engine (lib/pulse/engine.ts). The client makes no decisions
 * of its own, so home, and later the widget and the nudge, cannot disagree.
 *
 * Fetched once when home opens, never on a timer.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { localMinutes } from '@/lib/era/wake'
import { loadEraToday } from '@/lib/era/service'
import { loadPractices } from '@/lib/practices/server'
import { runsOn } from '@/lib/routines/glance'
import { buildPulse, type PulseStep } from '@/lib/pulse/engine'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [era, practices, routine, prefs] = await Promise.all([
      loadEraToday(user.id).catch(() => null),
      loadPractices(user.id).catch(() => null),
      prisma.routine.findUnique({
        where: { user_id: user.id },
        select: {
          mode: true,
          days: true,
          enabled: true,
          steps: { select: { kind: true, ref: true, label: true, time: true, weight: true } },
        },
      }),
      prisma.userPreferences.findUnique({ where: { user_id: user.id }, select: { timezone: true } }),
    ])

    const tz = prefs?.timezone ?? null
    const day = localDay(tz)
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()

    // Only a timed routine that is on and runs today gives anything a time.
    const steps: PulseStep[] =
      routine && routine.enabled && routine.mode !== 'sequence' && runsOn(routine.days, weekday)
        ? routine.steps.map(s => ({
            kind: s.kind,
            ref: s.ref,
            label: s.label,
            time: s.time,
            weight: s.weight === 'optional' || s.weight === 'bad_day' ? s.weight : 'required',
          }))
        : []

    const pulse = buildPulse({
      now: localMinutes(tz),
      weekday,
      era: era && era.step !== 'complete'
        ? {
            loop: { step: era.loop.step, line: era.loop.line, advice: era.loop.advice },
            today: era.today ? { text: era.today.text, kept: era.today.kept } : null,
            mission: era.mission,
            missionDone: era.missionDone,
          }
        : null,
      practices: (practices?.practices ?? []).map(p => ({
        id: p.id,
        label: p.label,
        state: p.state,
        todaysMinimum: p.todaysMinimum,
        weakDay: p.weakDay,
      })),
      steps,
    })

    return NextResponse.json({ pulse })
  } catch (error) {
    console.error('[pulse] error:', error)
    return NextResponse.json({ pulse: null }, { status: 200 })
  }
}
