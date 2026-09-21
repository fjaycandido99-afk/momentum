import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { isResetState, parseLevel } from './states'

/**
 * Nervous-System mode, written down.
 *
 * Two rules, both about consent:
 *  - The STATE and whether they finished are behavioural, so they are always
 *    recorded. That is the only signal the app has that the era was the
 *    wrong ask that day, and it is what will eventually let the coach ease
 *    off instead of pushing into a bad week.
 *  - The 1–5 before/after are self-reported state, the same class of data as
 *    a wellness check-in, so they are only stored with wellness consent.
 *    Without it the person still sees their own before and after on screen;
 *    it just isn't kept. An off switch that quietly stores the numbers
 *    anyway is not an off switch.
 */

export async function startReset(
  userId: string,
  state: unknown,
  before: unknown,
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  if (!isResetState(state)) return { ok: false, reason: 'Unknown state' }

  const prefs = await prisma.userPreferences.findUnique({
    where: { user_id: userId },
    select: { timezone: true, wellness_enabled: true },
  })

  const row = await prisma.resetSession.create({
    data: {
      user_id: userId,
      state,
      local_day: localDay(prefs?.timezone ?? null),
      before: prefs?.wellness_enabled ? parseLevel(before) : null,
    },
    select: { id: true },
  })
  return { ok: true, id: row.id }
}

export async function finishReset(
  userId: string,
  id: unknown,
  after: unknown,
  completed: boolean,
): Promise<{ ok: boolean }> {
  if (typeof id !== 'string') return { ok: false }

  const prefs = await prisma.userPreferences.findUnique({
    where: { user_id: userId },
    select: { wellness_enabled: true },
  })
  const level = prefs?.wellness_enabled ? parseLevel(after) : null

  const result = await prisma.resetSession.updateMany({
    where: { id, user_id: userId },
    data: {
      // Never walks a finished session back to unfinished: reopening the
      // screen must not erase that they did it.
      ...(completed ? { completed: true } : {}),
      ...(level !== null ? { after: level } : {}),
    },
  })
  return { ok: result.count > 0 }
}

/**
 * How many times they came here lately, for the ops dashboard and — later —
 * for the coach. A count, never a diagnosis.
 */
export async function recentResetCount(userId: string, sinceDay: string): Promise<number> {
  return prisma.resetSession.count({
    where: { user_id: userId, local_day: { gte: sinceDay } },
  })
}
