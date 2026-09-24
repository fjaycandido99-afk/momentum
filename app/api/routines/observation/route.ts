/**
 * GET /api/routines/observation — one line a week, or nothing.
 *
 * Computed when somebody OPENS their review, and cached on the routine for
 * that week. This is the whole reason the feature is affordable: a cron that
 * wrote everybody a line every Monday would be one model call per user per
 * week whether they read it or not, and most of them would not. Here, a
 * person who never looks costs nothing and a person who looks ten times
 * costs one call.
 *
 * The model is given COUNTS ONLY and forbidden from explaining them — and
 * `validateObservation` refuses a percentage, a causal claim, a prediction, a
 * score and praise outright, because a rule that only lives in a prompt holds
 * most of the time. See lib/routines/observation for the argument.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { aiGate } from '@/lib/ai/gate'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { parseModelJson } from '@/lib/ai/json'
import { localDay } from '@/lib/assessment/service'
import { lastLocalDays, reviewRuns } from '@/lib/routines/review'
import {
  OBSERVATION_SYSTEM_PROMPT,
  buildObservationPrompt,
  toObservation,
  weekKey,
  worthObserving,
} from '@/lib/routines/observation'

export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 7

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`routine-observation:${user.id}`, { limit: 10, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Slow down' }, { status: 429 })

    const [routine, prefs] = await Promise.all([
      prisma.routine.findUnique({
        where: { user_id: user.id },
        select: { id: true, label: true, days: true, observation: true, observation_week: true },
      }),
      prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { timezone: true },
      }),
    ])
    if (!routine) return NextResponse.json({ observation: null })

    const today = localDay(prefs?.timezone ?? null)
    const week = weekKey(today)

    // Already written this week. Free, and the line stays stable rather than
    // changing every time they open the page.
    if (routine.observation_week === week) {
      return NextResponse.json({ observation: routine.observation ?? null, cached: true })
    }

    const window = lastLocalDays(today, WINDOW_DAYS)
    const runs = window.length
      ? await prisma.routineRun.findMany({
          where: { routine_id: routine.id, local_day: { in: window } },
          select: { local_day: true, minimum: true, steps_total: true, steps_done: true, completed_at: true },
        })
      : []

    const review = reviewRuns(runs, today, WINDOW_DAYS)

    // Not enough of a week to say anything about it. Recorded as silence for
    // this week so it is not asked again every time they open the page.
    if (!worthObserving(review)) {
      await prisma.routine.update({
        where: { id: routine.id },
        data: { observation: null, observation_week: week },
      })
      return NextResponse.json({ observation: null })
    }

    const era = await prisma.era.findFirst({
      where: { user_id: user.id, status: 'active' },
      orderBy: { created_at: 'desc' },
      select: { title: true },
    })

    const gate = await aiGate(user.id, 'routine_observation')
    if (!gate.ok) return gate.response

    const completion = await getGroq('routine-observation').chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: OBSERVATION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildObservationPrompt({
            review,
            routineLabel: routine.label,
            days: routine.days,
            eraTitle: era?.title ?? null,
          }),
        },
      ],
      max_tokens: 500,
      // Low: this is a sentence about counts, and the interesting part is
      // which fact it picks, not how it decorates it.
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    const parsed = parseModelJson<{ line?: unknown }>(raw)

    if (!parsed) {
      await gate.refund()
      console.error('[routine-observation] unparseable response', { length: raw.length })
      return NextResponse.json({ observation: null, retryable: true })
    }

    const line = toObservation(parsed)

    if (!line) {
      // Either the model chose silence — which the prompt offers and which
      // is often the right answer — or it broke a rule. Both end the same
      // way: nothing is shown. Refunded only for a broken rule, since
      // silence was a correct answer.
      const refused = typeof parsed.line === 'string' && parsed.line.trim().length > 0
      if (refused) {
        await gate.refund()
        console.error('[routine-observation] refused', { line: parsed.line })
      }
      await prisma.routine.update({
        where: { id: routine.id },
        data: { observation: null, observation_week: week },
      })
      return NextResponse.json({ observation: null })
    }

    await prisma.routine.update({
      where: { id: routine.id },
      data: { observation: line, observation_week: week },
    })

    return NextResponse.json({ observation: line })
  } catch (error) {
    console.error('Routine observation error:', error)
    // One line is never worth an error state.
    return NextResponse.json({ observation: null })
  }
}
