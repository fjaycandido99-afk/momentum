/* ============================================================================
   profile-stats — server-side computation for the public profile "wall"
   that the InkSpiral lives in. Single source of truth so the per-handle
   API and any future profile widgets stay consistent.

   Three signals derived from DailyGuide:

     entryCount  — total reflections written (drives the InkSpiral
                   strokes; computed in the route, just exposed via
                   the same lib for re-use elsewhere).
     streakDays  — current consecutive-day journaling streak. A day
                   counts if any journal field is set. Allowed to be
                   "rolling" — today is NOT required as long as the
                   streak doesn't have a gap > 1 day at the end.
     moodSpark   — last 7 calendar days of journal_mood, oldest first,
                   with null for any day the user didn't check in.
                   Renders as a 7-bar monochrome sparkline on profile.

   All three are cheap server queries; no caching needed at v1 scale.
   ============================================================================ */

import type { PrismaClient } from '@prisma/client'

const ENTRY_OR = [
  { journal_win: { not: null } },
  { journal_gratitude: { not: null } },
  { journal_learned: { not: null } },
  { journal_intention: { not: null } },
  { journal_freetext: { not: null } },
] as const

export type MoodLevel = 'awful' | 'low' | 'okay' | 'good' | 'great'

export interface ProfileWallStats {
  entry_count: number
  streak_days: number
  /** Last 7 days oldest→newest. null = no entry that day. */
  mood_spark: (MoodLevel | null)[]
}

/**
 * Returns YYYY-MM-DD for a Date in UTC. DailyGuide.date is stored as
 * @db.Date so it's already date-only; we normalize everywhere via this
 * helper to keep comparisons straight.
 */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Walks the user's journaled-day set backwards from today and counts
 * consecutive days. If TODAY has no entry yet, we still start the
 * walk from yesterday — that way a user who hasn't journaled yet today
 * but did yesterday + the day before keeps showing their streak (it
 * only "breaks" when they MISS a whole calendar day).
 */
function computeStreak(daysWithEntry: Set<string>): number {
  if (daysWithEntry.size === 0) return 0

  const today = new Date()
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // If today is not in the set, slide back one day so an in-progress
  // day doesn't break a real streak.
  if (!daysWithEntry.has(dayKey(cursor))) {
    cursor = new Date(cursor.getTime() - 86_400_000)
    if (!daysWithEntry.has(dayKey(cursor))) return 0
  }

  let streak = 0
  while (daysWithEntry.has(dayKey(cursor))) {
    streak += 1
    cursor = new Date(cursor.getTime() - 86_400_000)
    // Hard cap so a malformed dataset can't infinite-loop the request.
    if (streak > 3650) break
  }
  return streak
}

export async function loadProfileWallStats(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: PrismaClient | any,
  userId: string,
): Promise<ProfileWallStats> {
  // Single fetch — date + journal_mood + a presence flag per journal
  // field. Last 90 days is enough for both the streak walk (we'd give
  // up well before 90 consecutive days anyway) and the 7-day spark.
  const since = new Date()
  since.setDate(since.getDate() - 90)
  const rows = await prisma.dailyGuide.findMany({
    where: { user_id: userId, date: { gte: since } },
    select: {
      date: true,
      journal_mood: true,
      journal_win: true,
      journal_gratitude: true,
      journal_learned: true,
      journal_intention: true,
      journal_freetext: true,
    },
    orderBy: { date: 'desc' },
  }).catch(() => [])

  // Total entry_count is computed separately (counts ALL time, not just
  // the 90-day window). Keep it as a fast aggregate.
  const entryCount = await prisma.dailyGuide.count({
    where: { user_id: userId, OR: ENTRY_OR as unknown as object[] },
  }).catch(() => 0)

  const daysWithEntry = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of rows as any[]) {
    const hasJournal = !!(
      r.journal_win || r.journal_gratitude || r.journal_learned ||
      r.journal_intention || r.journal_freetext
    )
    if (hasJournal) daysWithEntry.add(dayKey(new Date(r.date)))
  }

  const streakDays = computeStreak(daysWithEntry)

  // Mood spark — last 7 calendar days oldest→newest.
  const moodByDay = new Map<string, MoodLevel | null>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of rows as any[]) {
    moodByDay.set(dayKey(new Date(r.date)), (r.journal_mood as MoodLevel | null) || null)
  }

  const spark: (MoodLevel | null)[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    spark.push(moodByDay.get(dayKey(d)) ?? null)
  }

  return {
    entry_count: entryCount,
    streak_days: streakDays,
    mood_spark: spark,
  }
}
