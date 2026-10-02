import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { checkAchievementsNow, type AwardedAchievement } from '@/lib/achievements-server'
import { cleanAudioSession, countsAsProof } from '@/lib/audio-sessions'

/**
 * Record one listening session on today's record (the user's own day).
 * Same item, same day: a guide is one row (finished once is enough); music
 * and motivation ADD their seconds, so three 15-minute sittings of Lo-Fi
 * read as 45 minutes, not three rows.
 */
export async function recordAudioSession(
  userId: string,
  raw: unknown,
): Promise<{ ok: true; newAchievements: AwardedAchievement[] } | { ok: false }> {
  const s = cleanAudioSession(raw)
  if (!s) return { ok: false }

  const prefs = await prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { timezone: true } })
  const day = localDay(prefs?.timezone ?? null)
  const where = { user_id_kind_item_id_local_day: { user_id: userId, kind: s.kind, item_id: s.itemId, local_day: day } }

  await prisma.audioSession.upsert({
    where,
    create: { user_id: userId, kind: s.kind, item_id: s.itemId, title: s.title, seconds: s.seconds, completed: s.completed, local_day: day },
    update: s.kind === 'guide'
      ? { completed: true, title: s.title }
      : { seconds: { increment: s.seconds }, title: s.title },
  })

  // A finished guide can make today a proof day — and that can earn a coin.
  const newAchievements = countsAsProof(s) ? await checkAchievementsNow(userId) : []
  return { ok: true, newAchievements }
}
