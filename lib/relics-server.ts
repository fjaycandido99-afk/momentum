import { prisma } from '@/lib/prisma'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { byPrestige, cleanSelection, resolveRelics, type RelicsPayload } from '@/lib/relics'
import { cleanRelicNote } from '@/lib/relic-notes'
export type { RelicsPayload }

const BY_ID = new Map(ACHIEVEMENTS.map(a => [a.id, a]))

async function earnedFor(userId: string) {
  const rows = await prisma.userAchievement.findMany({
    where: { user_id: userId },
    select: { achievement_id: true, unlocked_at: true },
    orderBy: { unlocked_at: 'desc' },
  })
  return rows.flatMap(r => {
    const a = BY_ID.get(r.achievement_id)
    return a ? [{ id: a.id, title: a.title, rarity: a.rarity, unlockedAt: r.unlocked_at.toISOString() }] : []
  })
}

/** One read for the header and the sheet. Not polled — loaded once per open. */
export async function getRelics(userId: string): Promise<RelicsPayload> {
  const [earned, prefs] = await Promise.all([
    earnedFor(userId),
    prisma.userPreferences.findUnique({
      where: { user_id: userId },
      select: { relic_featured: true, relic_equipped: true, relics_in_circle: true },
    }),
  ])
  earned.sort(byPrestige)
  const shown = resolveRelics(
    { featured: prefs?.relic_featured ?? null, equipped: prefs?.relic_equipped ?? [] },
    earned,
  )
  return { earned, ...shown, inCircle: prefs?.relics_in_circle ?? false }
}

/** Show the worn coins in circles, or not. */
export async function setRelicsInCircle(userId: string, inCircle: boolean): Promise<RelicsPayload> {
  await prisma.userPreferences.upsert({
    where: { user_id: userId },
    update: { relics_in_circle: inCircle },
    create: { user_id: userId, relics_in_circle: inCircle },
  })
  return getRelics(userId)
}

/** Save their choice, keeping only coins they have actually earned. */
export async function saveRelics(userId: string, input: { featured: unknown; equipped: unknown }): Promise<RelicsPayload> {
  const earned = await earnedFor(userId)
  const clean = cleanSelection(input, new Set(earned.map(e => e.id)))
  await prisma.userPreferences.upsert({
    where: { user_id: userId },
    update: { relic_featured: clean.featured, relic_equipped: clean.equipped },
    create: { user_id: userId, relic_featured: clean.featured, relic_equipped: clean.equipped },
  })
  return getRelics(userId)
}

/**
 * Their one line on a coin (lib/relic-notes). Only on a coin they hold —
 * there is nothing to remember about one not yet earned. Empty clears it.
 */
export async function saveRelicNote(
  userId: string,
  achievementId: unknown,
  text: unknown,
): Promise<{ ok: true; note: string | null } | { ok: false; status: number; error: string }> {
  if (typeof achievementId !== 'string' || !achievementId) return { ok: false, status: 400, error: 'Which relic?' }
  const note = cleanRelicNote(text)
  const res = await prisma.userAchievement.updateMany({
    where: { user_id: userId, achievement_id: achievementId },
    data: { note, note_at: note ? new Date() : null },
  })
  if (res.count === 0) return { ok: false, status: 404, error: 'You haven’t earned that one yet' }
  return { ok: true, note }
}
