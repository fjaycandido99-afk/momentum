import { prisma } from '@/lib/prisma'
import { computeRead, type AxisId, type Read, type ScoredAnswer } from './axes'
import { ITEMS_BY_ID, RE_ASK_AFTER_DAYS, pickNextItem, type AssessmentItem } from './items'

/**
 * Server-side Daily Read helpers. Everything here is arithmetic over rows —
 * no model is involved in producing a lean, which is why the daily item can
 * stay free for everyone without costing Groq or ElevenLabs anything.
 */

/** YYYY-MM-DD in the user's own timezone. Never the server's. */
export function localDay(timezone: string | null | undefined, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

export interface AssessmentState {
  read: Read
  /** Item ids still inside their re-ask cooldown. */
  onCooldown: Set<string>
  /** Item ids ordered by least-recently-answered, for when all are cooling. */
  staleFirst: string[]
  /** Whether this user has already answered an item today, in their own day. */
  answeredToday: boolean
}

export async function loadState(userId: string, timezone: string | null): Promise<AssessmentState> {
  const rows = await prisma.assessmentAnswer.findMany({
    where: { user_id: userId },
    select: { item_id: true, axis: true, direction: true, score: true, local_day: true, created_at: true },
    orderBy: { created_at: 'desc' },
  })

  const answers: ScoredAnswer[] = rows.map(r => ({
    axis: r.axis as AxisId,
    direction: (r.direction >= 0 ? 1 : -1) as 1 | -1,
    score: r.score,
  }))

  const cooldownStart = Date.now() - RE_ASK_AFTER_DAYS * 24 * 60 * 60 * 1000
  const onCooldown = new Set(
    rows.filter(r => r.created_at.getTime() >= cooldownStart).map(r => r.item_id),
  )

  // Rows arrive newest-first, so the FIRST time an item appears is its most
  // recent answer. Reversing that order gives least-recently-answered first,
  // which is the order to re-ask in once everything is cooling down.
  const mostRecent = new Map<string, number>()
  for (const r of rows) {
    if (!mostRecent.has(r.item_id)) mostRecent.set(r.item_id, r.created_at.getTime())
  }
  const staleFirst = [...mostRecent.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id)

  const today = localDay(timezone)
  const answeredToday = rows.some(r => r.local_day === today)

  return { read: computeRead(answers), onCooldown, staleFirst, answeredToday }
}

/**
 * The next item to put in front of this user, or null if they have already
 * answered today. This is the single guard that stops the hero card and the
 * Spark popup from both asking on the same day — each stands the other down
 * by writing the day's row.
 */
export function nextItemFor(state: AssessmentState): AssessmentItem | null {
  if (state.answeredToday) return null
  return pickNextItem(state.onCooldown, state.read.coverage, state.staleFirst)
}

/**
 * Record an answer.
 *
 * `axis` and `direction` come from the item bank at write time and are stored
 * on the row, so a later reword can't retroactively change what someone said.
 * Returns false if the item id isn't one of ours or the score is out of range
 * — both mean a malformed client, not a server fault.
 */
export async function recordAnswer(
  userId: string,
  timezone: string | null,
  itemId: string,
  score: number,
): Promise<boolean> {
  const item = ITEMS_BY_ID.get(itemId)
  if (!item) return false
  if (!Number.isInteger(score) || score < 1 || score > 5) return false

  await prisma.assessmentAnswer.create({
    data: {
      user_id: userId,
      item_id: item.id,
      axis: item.axis,
      direction: item.direction,
      score,
      local_day: localDay(timezone),
    },
  })
  return true
}
