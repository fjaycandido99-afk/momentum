/**
 * GET /api/portrait/:year — yearly portrait data.
 *
 * Aggregates a user's "you in YYYY" review from their Morning Minutes
 * and broader journaling. V1 returns:
 *   - minute_count       (how many days they showed up this year)
 *   - longest_streak     (best streak this year)
 *   - current_streak     (today-anchored streak; same one on home)
 *   - recent_minutes     (last 12 transcripts + AI responses, newest first)
 *   - dominant_moods     (top 3 moods of the year with %)
 *
 * This is the artifact the user has been building one minute at a time —
 * surfacing it so they can SEE the year they spent showing up.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { loadProfileWallStats } from '@/lib/profile-stats'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ year: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { year: rawYear } = await context.params
    const year = parseInt(rawYear, 10)
    if (!Number.isFinite(year) || year < 2020 || year > 2100) {
      return NextResponse.json({ error: 'invalid year' }, { status: 400 })
    }

    const start = new Date(Date.UTC(year, 0, 1))
    const end = new Date(Date.UTC(year + 1, 0, 1))

    // All days in the year where the user showed up (any journal field set
    // OR a Morning Minute logged).
    const rows = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: start, lt: end },
        OR: [
          { journal_win: { not: null } },
          { journal_gratitude: { not: null } },
          { journal_learned: { not: null } },
          { journal_intention: { not: null } },
          { journal_freetext: { not: null } },
          { morning_minute_transcript: { not: null } },
        ],
      },
      select: {
        date: true,
        journal_mood: true,
        morning_minute_transcript: true,
        morning_minute_response: true,
        morning_minute_at: true,
      },
      orderBy: { date: 'desc' },
    }).catch(() => [])

    const minuteCount = rows.filter(r => !!r.morning_minute_transcript).length

    // Longest streak walk — sort ascending then walk, tracking max.
    const showDays = new Set<string>()
    for (const r of rows) {
      showDays.add(new Date(r.date).toISOString().slice(0, 10))
    }
    const sortedDays = Array.from(showDays).sort()
    let longest = 0
    let run = 0
    let prev: Date | null = null
    for (const d of sortedDays) {
      const cur = new Date(d + 'T00:00:00Z')
      if (prev && cur.getTime() - prev.getTime() === 86_400_000) {
        run += 1
      } else {
        run = 1
      }
      if (run > longest) longest = run
      prev = cur
    }

    // Current streak comes from the same helper that drives the home card.
    const wall = await loadProfileWallStats(prisma, user.id)

    // Last 12 minutes with both transcript + response (skip rows that
    // only have other journal fields).
    const recentMinutes = rows
      .filter(r => !!r.morning_minute_transcript && !!r.morning_minute_response)
      .slice(0, 12)
      .map(r => ({
        date: r.date,
        at: r.morning_minute_at,
        transcript: r.morning_minute_transcript,
        response: r.morning_minute_response,
      }))

    // Dominant moods this year — top 3 with %.
    const moodTally: Record<string, number> = {}
    let moodTotal = 0
    for (const r of rows) {
      if (r.journal_mood) {
        moodTally[r.journal_mood] = (moodTally[r.journal_mood] || 0) + 1
        moodTotal += 1
      }
    }
    const dominantMoods = Object.entries(moodTally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([mood, count]) => ({
        mood,
        count,
        pct: moodTotal > 0 ? Math.round((count / moodTotal) * 100) : 0,
      }))

    return NextResponse.json({
      year,
      minute_count: minuteCount,
      show_days: showDays.size,
      longest_streak: longest,
      current_streak: wall.streak_days,
      recent_minutes: recentMinutes,
      dominant_moods: dominantMoods,
    })
  } catch (err) {
    console.error('[portrait GET] error:', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
