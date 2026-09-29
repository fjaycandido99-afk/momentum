/**
 * What the search on Explore can find, and how it ranks a query.
 *
 * Three kinds of thing, all of them real destinations or real audio:
 *   - pages     — the places the old header menu led to, plus the era's own
 *   - soundscapes and guided sessions — played in place, through the same
 *     handlers the shelves use, so premium locks and the paywall still apply.
 *
 * Exercises are deliberately absent: nothing in the app can open a SPECIFIC
 * exercise yet (Training shows today's), and a result that opens the wrong
 * one is worse than no result.
 *
 * Pure — the ranking is tested.
 */

import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'
import { VOICE_GUIDES } from '@/components/home/home-types'

export type SearchKind = 'page' | 'soundscape' | 'guide'

export interface SearchItem {
  kind: SearchKind
  id: string
  title: string
  subtitle: string
  /** For pages. */
  href?: string
  /** Extra words people might type that aren't in the title. */
  keywords: string[]
}

export const PAGES: SearchItem[] = [
  { kind: 'page', id: 'journal', title: 'Journal', subtitle: 'Write, or talk it through with your coach', href: '/journal', keywords: ['write', 'chat', 'coach', 'dream', 'diary', 'reflect'] },
  { kind: 'page', id: 'era', title: 'Your era', subtitle: 'The 30 days, day by day', href: '/era', keywords: ['promise', 'mission', 'streak', '30 days'] },
  { kind: 'page', id: 'training', title: 'Training', subtitle: "Today's exercise, disciplines and routine", href: '/training', keywords: ['exercise', 'discipline', 'routine', 'practice', 'gym', 'workout'] },
  { kind: 'page', id: 'progress', title: 'Progress', subtitle: 'Streaks, listening time and journal stats', href: '/progress', keywords: ['stats', 'streak', 'xp', 'level'] },
  { kind: 'page', id: 'proof', title: 'Proof', subtitle: 'The year you cannot lose', href: '/proof', keywords: ['year', 'record', 'history', 'calendar'] },
  { kind: 'page', id: 'saved', title: 'Saved', subtitle: 'Everything you hearted', href: '/saved', keywords: ['favorites', 'favourites', 'heart', 'liked'] },
  { kind: 'page', id: 'daily-read', title: 'Daily Read', subtitle: 'One tap a day, and it learns how you tick', href: '/daily-read', keywords: ['question', 'quiz', 'personality'] },
  { kind: 'page', id: 'reset', title: 'Not feeling it', subtitle: 'A way back in for a hard day', href: '/reset', keywords: ['sad', 'anxious', 'overwhelmed', 'reset', 'help', 'low'] },
  { kind: 'page', id: 'coach-voice', title: 'Coach voice', subtitle: 'How your coach speaks to you', href: '/mindset-selection', keywords: ['mindset', 'stoic', 'voice', 'personality', 'tone'] },
  { kind: 'page', id: 'settings', title: 'Settings', subtitle: 'Notifications, schedule, account', href: '/settings', keywords: ['notifications', 'reminders', 'account', 'subscription', 'premium'] },
]

export function allSearchItems(): SearchItem[] {
  return [
    ...PAGES,
    ...SOUNDSCAPE_ITEMS.map(s => ({
      kind: 'soundscape' as const,
      id: s.id,
      title: s.label,
      subtitle: `Soundscape · ${s.subtitle}`,
      keywords: ['soundscape', 'ambient', 'sound', 'noise', 'background'],
    })),
    ...VOICE_GUIDES.map(g => ({
      kind: 'guide' as const,
      id: g.id,
      title: g.name,
      subtitle: `Guided session · ${g.tagline}`,
      keywords: ['guided', 'session', 'meditation', 'voice', 'breathe'],
    })),
  ]
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim()

/**
 * Score one item for a query. 0 means no match. Title matches beat subtitle
 * matches beat keyword matches; a match at the start of a word beats one in
 * the middle, so "sle" finds Sleep before "Stress relief".
 */
export function scoreItem(item: SearchItem, query: string): number {
  const q = norm(query)
  if (!q) return 0
  const title = norm(item.title)
  const words = q.split(/\s+/).filter(Boolean)
  let total = 0
  for (const w of words) {
    let best = 0
    if (title === w) best = 100
    else if (title.startsWith(w)) best = 80
    else if (title.split(/\s+/).some(t => t.startsWith(w))) best = 70
    else if (title.includes(w)) best = 50
    else if (norm(item.subtitle).split(/[\s·,]+/).some(t => t.startsWith(w))) best = 30
    else if (item.keywords.some(k => norm(k).startsWith(w))) best = 20
    if (best === 0) return 0 // every word must match something
    total += best
  }
  return total
}

export function searchHome(query: string, items: SearchItem[] = allSearchItems(), limit = 20): SearchItem[] {
  return items
    .map((item, i) => ({ item, score: scoreItem(item, query), i }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map(r => r.item)
}
