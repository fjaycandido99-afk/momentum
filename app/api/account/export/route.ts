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
import { ITEMS_BY_ID } from '@/lib/assessment/items'

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
    const [account, preferences, guides, favorites, goals, routines, playlists, assessment] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, name: true, created_at: true },
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
      prisma.routine.findMany({ where: { user_id: user.id }, include: { steps: true } }),
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
    ])

    const payload = {
      exported_at: new Date().toISOString(),
      format: 'voxu-export-v1',
      account,
      preferences,
      journal: guides,
      saved: favorites,
      goals,
      routines,
      playlists,
      daily_read: assessment.map(a => ({
        ...a,
        // The stored row is just an id and a number; without the wording it
        // is not a meaningful export of what the person actually answered.
        statement: ITEMS_BY_ID.get(a.item_id)?.text ?? null,
      })),
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
