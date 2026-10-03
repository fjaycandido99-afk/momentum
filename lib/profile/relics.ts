import { CATEGORY_LABELS, type AchievementCategory } from '@/lib/achievements'

/**
 * The profile's relic views — pure.
 *
 * Recent: the last coins earned, newest first, by their real unlock time.
 * Collection: earned of total per category, from the same visible list the
 * Progress grid uses (retired coins count only for those who hold them), so
 * the two screens can never disagree. Counts only — no score, no summary of
 * who someone is from what they hold.
 */

export interface HeldStatus {
  id: string
  category: AchievementCategory
  unlocked: boolean
  unlockedAt: string | null
}

export const RECENT_COUNT = 3

export function recentRelics<T extends HeldStatus>(all: readonly T[], n: number = RECENT_COUNT): T[] {
  return all
    .filter(a => a.unlocked && a.unlockedAt)
    .sort((a, b) => (b.unlockedAt! > a.unlockedAt! ? 1 : b.unlockedAt! < a.unlockedAt! ? -1 : a.id.localeCompare(b.id)))
    .slice(0, n)
}

export interface CategoryCount {
  category: AchievementCategory
  label: string
  earned: number
  total: number
}

/** In the grid's category order; categories with nothing in them are left out. */
export function collectionByCategory(all: readonly HeldStatus[]): CategoryCount[] {
  return (Object.keys(CATEGORY_LABELS) as AchievementCategory[])
    .map(category => {
      const rows = all.filter(a => a.category === category)
      return { category, label: CATEGORY_LABELS[category], earned: rows.filter(a => a.unlocked).length, total: rows.length }
    })
    .filter(c => c.total > 0)
}
