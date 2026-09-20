import { prisma } from '@/lib/prisma'
import {
  findPatterns,
  type GuideMood,
  type MoodLevel,
  type PatternInput,
  type PatternReport,
  type PromiseRecord,
} from './rules'

/**
 * Loads one person's history for the pattern engine.
 *
 * The promise TEXT is never read: the query asks Postgres for
 * `length(text)`, so the words stay in the database. Everything else here is
 * a timestamp, a flag or a tapped value.
 *
 * Lifetime history, bounded to a window so the query stays small: patterns
 * across several eras are the interesting ones ("you always fade on
 * Thursdays"), and a single 30-day era rarely clears the thresholds alone.
 */

const WINDOW_DAYS = 180

const MOODS: MoodLevel[] = ['awful', 'low', 'okay', 'good', 'great']
const GUIDE_MOODS: GuideMood[] = ['low', 'medium', 'high']

interface PromiseRow {
  local_day: string
  created_at: Date
  kept: boolean | null
  checked_at: Date | null
  source: string
  len: number | null
}

/** Local hour and weekday of an instant, in the user's own timezone. */
function localParts(at: Date, timezone: string | null): { hour: number; weekday: number; day: string } {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: 'numeric',
      hour12: false,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = fmt.formatToParts(at)
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return {
      hour: Number(get('hour')) % 24,
      weekday: Math.max(0, weekdays.indexOf(get('weekday'))),
      day: `${get('year')}-${get('month')}-${get('day')}`,
    }
  } catch {
    return { hour: at.getUTCHours(), weekday: at.getUTCDay(), day: at.toISOString().slice(0, 10) }
  }
}

export async function loadPatterns(userId: string): Promise<PatternReport> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000)

  const [prefs, promiseRows, guideRows] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { timezone: true } }),
    // length(text), never text: the words never leave Postgres.
    prisma.$queryRaw<PromiseRow[]>`
      SELECT local_day, created_at, kept, checked_at, source, length(text) AS len
      FROM "EraPromise"
      WHERE user_id = ${userId} AND created_at >= ${since}
      ORDER BY local_day ASC`,
    prisma.dailyGuide.findMany({
      where: { user_id: userId, date: { gte: since } },
      select: { date: true, journal_mood: true, mood_before: true, mood_after: true },
      orderBy: { date: 'asc' },
    }),
  ])

  const tz = prefs?.timezone ?? null

  const promises: PromiseRecord[] = promiseRows.map(r => {
    const local = localParts(r.created_at, tz)
    return {
      day: r.local_day,
      hour: local.hour,
      // The weekday of the day the promise BELONGS to, not of the instant it
      // was typed — a promise made just after midnight is still that day's.
      weekday: weekdayOfDay(r.local_day),
      kept: r.kept,
      answeredSameDay: r.checked_at === null ? null : localParts(r.checked_at, tz).day === r.local_day,
      source: r.source === 'spoken' ? 'spoken' : 'typed',
      length: r.len ?? 0,
    }
  })

  const input: PatternInput = {
    promises,
    moods: guideRows
      .filter(g => g.journal_mood && MOODS.includes(g.journal_mood as MoodLevel))
      .map(g => ({ day: dayKey(g.date), mood: g.journal_mood as MoodLevel })),
    guideMoods: guideRows
      .filter(g =>
        g.mood_before && g.mood_after
        && GUIDE_MOODS.includes(g.mood_before as GuideMood)
        && GUIDE_MOODS.includes(g.mood_after as GuideMood))
      .map(g => ({
        day: dayKey(g.date),
        before: g.mood_before as GuideMood,
        after: g.mood_after as GuideMood,
      })),
    today: localParts(new Date(), tz).day,
  }

  return findPatterns(input)
}

/**
 * DailyGuide.date is `@db.Date`, so it arrives as UTC midnight. Reading it
 * with local date methods would land a day early in western zones, so the
 * key is taken from the ISO string.
 */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Weekday of a YYYY-MM-DD, by date arithmetic rather than a timezone. */
function weekdayOfDay(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return 0
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}
