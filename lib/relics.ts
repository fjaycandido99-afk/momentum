import type { AchievementRarity } from './achievements'

/**
 * Relics — the achievement coins someone chooses to wear.
 *
 *   earned   every coin they have unlocked (the collection)
 *   equipped up to three they picked to represent them
 *   featured one of the equipped, shown in the Home header
 *
 * Only earned coins can be equipped; that is checked on every write, never
 * trusted from the client. With nothing chosen yet, the header wears their
 * rarest coin (newest first among equals), and nothing at all when they
 * have none — an empty slot would be the app asking for something.
 *
 * Pure.
 */

export const MAX_EQUIPPED = 3

/** What /api/relics returns. */
export interface RelicsPayload {
  /** Every coin they hold, rarest and newest first. */
  earned: { id: string; title: string; rarity: AchievementRarity; unlockedAt: string }[]
  featured: string | null
  equipped: string[]
}

export interface EarnedRelic {
  id: string
  rarity: AchievementRarity
  /** ISO time it was unlocked. */
  unlockedAt: string
}

const RANK: Record<AchievementRarity, number> = { legendary: 4, epic: 3, rare: 2, common: 1 }

/** Rarest first, then newest. */
export function byPrestige(a: EarnedRelic, b: EarnedRelic): number {
  return RANK[b.rarity] - RANK[a.rarity] || (a.unlockedAt < b.unlockedAt ? 1 : a.unlockedAt > b.unlockedAt ? -1 : 0)
}

/**
 * What they chose, made valid: only earned ids, no repeats, at most three,
 * and the featured coin always among the equipped (added to the front if it
 * wasn't). A featured id they haven't earned is dropped.
 */
export function cleanSelection(
  input: { featured: unknown; equipped: unknown },
  earnedIds: ReadonlySet<string>,
): { featured: string | null; equipped: string[] } {
  const list = Array.isArray(input.equipped) ? input.equipped : []
  let equipped = [...new Set(list.filter((x): x is string => typeof x === 'string' && earnedIds.has(x)))]
  const featured = typeof input.featured === 'string' && earnedIds.has(input.featured) ? input.featured : null
  if (featured && !equipped.includes(featured)) equipped = [featured, ...equipped]
  return { featured, equipped: equipped.slice(0, MAX_EQUIPPED) }
}

/**
 * What to show, from what's stored and what's earned. Stored ids are
 * re-checked against the earned list (a coin can't be un-earned today, but
 * the read must not trust the write). Falls back to their rarest coin.
 */
export function resolveRelics(
  stored: { featured: string | null; equipped: string[] },
  earned: readonly EarnedRelic[],
): { featured: string | null; equipped: string[] } {
  const ids = new Set(earned.map(e => e.id))
  const clean = cleanSelection(stored, ids)
  if (clean.equipped.length > 0) {
    return { featured: clean.featured ?? clean.equipped[0], equipped: clean.equipped }
  }
  const best = [...earned].sort(byPrestige)[0]
  return best ? { featured: best.id, equipped: [best.id] } : { featured: null, equipped: [] }
}

/**
 * The coin the header turns to on this app open: the one after the coin it
 * showed last time, through the equipped list — one flip per open, so all
 * three get seen without anything moving while they read.
 */
export function nextShown(equipped: readonly string[], lastShown: string | null, featured: string | null): string | null {
  if (equipped.length === 0) return null
  if (!lastShown || !equipped.includes(lastShown)) return featured && equipped.includes(featured) ? featured : equipped[0]
  return equipped[(equipped.indexOf(lastShown) + 1) % equipped.length]
}
