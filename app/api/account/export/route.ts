/**
 * GET /api/account/export — everything we hold about the caller, as JSON.
 *
 * The privacy policy already promises this, twice:
 *   "Export — Request a portable copy of your data"
 *   "Data Portability — Receive your data in a structured, machine-readable format"
 * and for users in the EU it is a GDPR Article 20 obligation. There was no
 * endpoint. This is that endpoint.
 *
 * Deliberately available on EVERY tier. Getting your own writing out is a
 * right, not a feature — and a journal people cannot leave is a journal
 * people commit less to in the first place.
 *
 * Returns the whole archive regardless of the free tier's read window:
 * that window governs what the app displays, never whether you may have
 * a copy of what you wrote.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { ITEMS_BY_ID, itemLabel } from '@/lib/assessment/items'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Everything is scoped to user.id. No route param decides whose data
    // this is, so there is no way to ask for somebody else's.
    const [
      account, preferences, guides, favorites, goals, playlists, assessment, eras,
      wellness, missions, books, practices, practiceLogs, exerciseRuns, resetSessions,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, name: true, preferred_name: true, created_at: true },
      }),
      prisma.userPreferences.findUnique({ where: { user_id: user.id } }),
      prisma.dailyGuide.findMany({
        where: { user_id: user.id },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          journal_win: true,
          journal_gratitude: true,
          journal_learned: true,
          journal_intention: true,
          journal_freetext: true,
          journal_dream: true,
          journal_dream_interpretation: true,
          journal_conversation: true,
          journal_mood: true,
          journal_prompt: true,
          journal_tags: true,
          journal_ai_reflection: true,
          morning_minute_transcript: true,
          daily_intention: true,
          mood_before: true,
          mood_after: true,
          energy_level: true,
          day_type: true,
        },
      }),
      prisma.favoriteContent.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: 'asc' },
        select: { content_type: true, content_text: true, content_title: true, created_at: true },
      }),
      prisma.goal.findMany({ where: { user_id: user.id } }),
      prisma.playlist.findMany({ where: { user_id: user.id }, include: { items: true } }),
      // Daily Read. This is a record of how someone thinks, scored over time —
      // exactly the kind of personal data an export exists for, and it was
      // missed when the table was added because this list is enumerated by
      // hand. Anything new goes here too.
      prisma.assessmentAnswer.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: 'asc' },
        select: { item_id: true, axis: true, direction: true, score: true, local_day: true, created_at: true },
      }),
      // Eras and every promise made in them — the user's own words, every day.
      prisma.era.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: 'asc' },
        select: {
          title: true, era_key: true, change: true, why: true, length_days: true,
          start_day: true, status: true, ended_at: true, created_at: true,
          promises: {
            orderBy: { local_day: 'asc' },
            select: {
              local_day: true, text: true, source: true, coach_reply: true, kept: true, checked_at: true,
              // The check-in's one-tap answers (lib/era/reasons.ts).
              confidence: true, blocker: true, helper: true,
            },
          },
        },
      }),
      // Self-reported wellness check-ins. The most personal thing here after
      // the journal, so it belongs in the copy someone takes with them.
      prisma.wellnessCheckIn.findMany({
        where: { user_id: user.id },
        orderBy: { local_day: 'asc' },
        select: { local_day: true, mood: true, energy: true, stress: true, rested: true, tags: true },
      }),
      // Which day's mission they marked done.
      prisma.eraMission.findMany({
        where: { user_id: user.id },
        orderBy: { local_day: 'asc' },
        select: { local_day: true, day: true, completed_at: true },
      }),
      // Five tables that were missing, found by auditing this list against
      // the schema rather than trusting it. The comment above says "anything
      // new goes here too" and it had already stopped being true: what
      // somebody reads, the disciplines they keep, every day they logged one,
      // every exercise they ran and every time they came here to calm down
      // are all records of a person, and none of them could be exported.
      prisma.book.findMany({ where: { user_id: user.id }, orderBy: { created_at: 'asc' } }),
      prisma.practice.findMany({ where: { user_id: user.id }, orderBy: { created_at: 'asc' } }),
      prisma.practiceLog.findMany({
        where: { practice: { user_id: user.id } },
        orderBy: { local_day: 'asc' },
      }),
      prisma.exerciseRun.findMany({ where: { user_id: user.id }, orderBy: { created_at: 'asc' } }),
      prisma.resetSession.findMany({ where: { user_id: user.id }, orderBy: { created_at: 'asc' } }),
    ])

    const payload = {
      exported_at: new Date().toISOString(),
      format: 'voxu-export-v1',
      account,
      preferences,
      journal: guides,
      saved: favorites,
      goals,
      playlists,
      daily_read: assessment.map(a => ({
        ...a,
        // The stored row is just an id and a number; without the wording it
        // is not a meaningful export of what the person actually answered.
        statement: (() => { const it = ITEMS_BY_ID.get(a.item_id); return it ? itemLabel(it) : null })(),
      })),
      eras,
      era_missions: missions,
      wellness_checkins: wellness,
      books,
      practices,
      practice_logs: practiceLogs,
      exercise_runs: exerciseRuns,
      reset_sessions: resetSessions,
    }

    const filename = `voxu-export-${new Date().toISOString().slice(0, 10)}.json`

    // Content-Disposition so a browser saves it rather than rendering a
    // wall of JSON, which for a long-time user is megabytes of their own
    // diary dumped into a tab.
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Account export error:', error)
    return NextResponse.json({ error: 'Failed to build export' }, { status: 500 })
  }
}
