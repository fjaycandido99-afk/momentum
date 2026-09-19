import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_QUOTES, getDailyMindsetQuote, quoteDateSeed, type MindsetQuote } from '@/lib/mindset/quotes'
import { programFor } from './programs'

/**
 * The rest of the app leaning toward the user's era — motivation videos,
 * music, the daily quote, the Journal, the voice guide and soundscape
 * shelves.
 *
 * One rule throughout: the era's pick comes FIRST, nothing is hidden. An
 * era is a direction to lean, not a filter on what someone is allowed to
 * find.
 */

/**
 * Today's quote in the user's mindset, drawn from the era's themes when it
 * has some (Comeback → resilience and growth, Stoic Mode → wisdom). With no
 * era, or no quote that fits, it IS getDailyMindsetQuote — same seed — so
 * the daily-quote push and every screen keep showing one quote a day.
 */
export function eraQuote(mindset: MindsetId, dateStr: string, categories: string[] | undefined): MindsetQuote | null {
  const all = MINDSET_QUOTES[mindset] ?? []
  const themed = categories?.length ? all.filter(q => q.category && categories.includes(q.category)) : []
  if (themed.length === 0) return getDailyMindsetQuote(mindset, dateStr)
  return themed[quoteDateSeed(dateStr) % themed.length]
}

/** Move the item with `id` to the front; everything else keeps its order. */
export function eraFirst<T extends { id: string }>(items: readonly T[], id: string | null | undefined): T[] {
  if (!id) return [...items]
  const pick = items.find(i => i.id === id)
  return pick ? [pick, ...items.filter(i => i.id !== id)] : [...items]
}

/** Tonight's Journal prompt for the era: "Day 12 of Locked In. Where did…" */
export function eraJournalPrompt(era: { key: string; title: string; day: number }): string {
  return `Day ${era.day} of ${era.title}. ${programFor(era.key).journalQuestion}`
}
