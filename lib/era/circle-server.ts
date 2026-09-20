import { prisma } from '@/lib/prisma'
import { localDay } from '@/lib/assessment/service'
import { computeStats, eraDayNumber } from './logic'
import { displayNameFrom } from '@/lib/user/display-name'
import {
  CIRCLE_MAX,
  shapeCircle,
  shapeTrending,
  type CircleMember,
  type CircleMemberInput,
  type TrendingEra,
} from './circle'

/**
 * Loads a user's circle, and Trending.
 *
 * The circle comes from EraReferral — the "Join this era" links (step 2) —
 * in both directions, so it's only ever people with a real connection. No
 * suggestions, no strangers, nothing inferred.
 */

/** Who's connected to me, and where they are in their own era. */
export async function loadCircle(userId: string): Promise<CircleMember[]> {
  const referrals = await prisma.eraReferral.findMany({
    where: { OR: [{ inviter_user_id: userId }, { invitee_user_id: userId }] },
    select: { inviter_user_id: true, invitee_user_id: true, created_at: true },
    orderBy: { created_at: 'desc' },
    take: CIRCLE_MAX * 2,
  })
  if (referrals.length === 0) return []

  // One row per person, keeping their most recent connection. Someone can be
  // both (they joined my era, I later joined theirs) — count them once.
  const links = new Map<string, { direction: 'joined_you' | 'you_joined'; joinedAt: Date }>()
  for (const r of referrals) {
    const other = r.inviter_user_id === userId ? r.invitee_user_id : r.inviter_user_id
    if (other === userId || links.has(other)) continue
    links.set(other, {
      direction: r.inviter_user_id === userId ? 'joined_you' : 'you_joined',
      joinedAt: r.created_at,
    })
  }
  const ids = [...links.keys()]
  if (ids.length === 0) return []

  const [people, eras] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, name: true, preferred_name: true,
        preferences: { select: { circle_visible: true, timezone: true } },
      },
    }),
    prisma.era.findMany({
      where: { user_id: { in: ids }, status: 'active' },
      select: {
        user_id: true,
        title: true,
        era_key: true,
        start_day: true,
        length_days: true,
        promises: { select: { local_day: true, kept: true } },
      },
    }),
  ])
  const eraByUser = new Map(eras.map(e => [e.user_id, e]))

  const members: CircleMemberInput[] = people.map(p => {
    const link = links.get(p.id)!
    const era = eraByUser.get(p.id)
    // Their day, in THEIR timezone — a circle spanning zones must not show
    // someone on day 5 as day 4 because of where the server is.
    const today = era ? localDay(p.preferences?.timezone ?? null) : ''
    return {
      userId: p.id,
      // The name they chose to be known by, if they set one — shapeCircle
      // still reduces a provider name to its first word.
      name: displayNameFrom(p) ?? p.name,
      direction: link.direction,
      joinedAt: link.joinedAt,
      era: era
        ? {
            title: era.title,
            key: era.era_key,
            day: Math.min(eraDayNumber(era.start_day, today), era.length_days),
            lengthDays: era.length_days,
            streak: computeStats(era.promises, today).promiseStreak,
          }
        : null,
      // Preferences may not exist yet (nothing set) — that's visible.
      visible: p.preferences?.circle_visible ?? true,
    }
  })

  return shapeCircle(members)
}

/**
 * Trending eras — only those with enough real people in them, so this is
 * usually an empty list and the section simply doesn't render.
 *
 * Cached briefly: it's the same answer for everyone, and it must not cost a
 * grouped scan on every home load. Hidden counts never leave the server:
 * shapeTrending drops them before the route sees them.
 */
let cache: { at: number; value: TrendingEra[] } | null = null
const CACHE_MS = 5 * 60 * 1000

export async function loadTrending(now: number = Date.now()): Promise<TrendingEra[]> {
  if (cache && now - cache.at < CACHE_MS) return cache.value
  const rows = await prisma.era.groupBy({
    by: ['era_key'],
    where: { status: 'active' },
    _count: { _all: true },
  })
  const value = shapeTrending(rows.map(r => ({ key: r.era_key, people: r._count._all })))
  cache = { at: now, value }
  return value
}
