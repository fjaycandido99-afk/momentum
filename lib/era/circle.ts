import { ERA_PRESETS_BY_KEY } from './presets'

/**
 * Circles and Trending — the two social pieces of an era.
 *
 * A CIRCLE is the people actually connected to you: whoever started an era
 * through your "Join this era" link, and whoever's link you started yours
 * through (lib/era/share, EraReferral). It works from zero, because one real
 * person is enough for it to mean something.
 *
 * TRENDING is the opposite: a list of era counts is worthless — and a lie —
 * until the counts are real. So an era only appears once enough people are
 * actually in it, and until then the section doesn't exist. Voxu had 13 users
 * and no eras at all when this was built; "🔥 Locked In — 18.4K" was a mockup
 * and must never be printed as though it were a number.
 */

/**
 * How many people must be in an era before it can appear in Trending.
 *
 * Deliberately far above today's numbers. Lowering it to make the section
 * appear would be inventing an audience.
 */
export const TRENDING_MIN_PEOPLE = 50

/** What a circle can hold before it stops being a circle (and a cheap query). */
export const CIRCLE_MAX = 50

export interface TrendingEra {
  key: string
  title: string
  /** People in this era right now. Only ever a real count. */
  people: number
}

/**
 * Trending, from raw per-era counts. Presets only (a custom era's title is
 * the user's own words, and belongs to them), biggest first, and ties broken
 * alphabetically so the order never jitters between reloads.
 */
export function shapeTrending(counts: { key: string; people: number }[]): TrendingEra[] {
  return counts
    .filter(c => c.people >= TRENDING_MIN_PEOPLE && ERA_PRESETS_BY_KEY.has(c.key))
    .map(c => ({ key: c.key, title: ERA_PRESETS_BY_KEY.get(c.key)!.title, people: c.people }))
    .sort((a, b) => b.people - a.people || a.title.localeCompare(b.title))
}

export interface CircleMemberInput {
  userId: string
  name: string | null
  /** How they're connected: they joined through my link, or I joined through theirs. */
  direction: 'joined_you' | 'you_joined'
  joinedAt: Date
  /** Their era right now, if they have an active one. */
  era: { title: string; key: string; day: number; lengthDays: number; streak: number } | null
  /** False when they've chosen not to appear in circles. */
  visible: boolean
}

export interface CircleMember {
  name: string
  direction: 'joined_you' | 'you_joined'
  era: { title: string; key: string; day: number; lengthDays: number; streak: number } | null
}

/**
 * The circle, shaped for the client.
 *
 * Only ever: a first name, which era, how far in, and the promise streak.
 * Never the promise text, never a day-by-day record, never an email — what
 * someone promises themselves is between them and their coach, and the join
 * page says exactly this much before anyone joins.
 *
 * Someone still in their era comes before someone who has finished or
 * stopped, then whoever is furthest in, then most recently joined.
 */
export function shapeCircle(members: CircleMemberInput[]): CircleMember[] {
  return members
    .filter(m => m.visible)
    .sort((a, b) =>
      Number(!!b.era) - Number(!!a.era)
      || (b.era?.day ?? 0) - (a.era?.day ?? 0)
      || b.joinedAt.getTime() - a.joinedAt.getTime())
    .slice(0, CIRCLE_MAX)
    .map(m => ({
      name: firstName(m.name),
      direction: m.direction,
      era: m.era,
    }))
}

/** First name only — never the full name someone signed up with. */
export function firstName(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0]
  if (!first || first.includes('@')) return 'Someone'
  return first.slice(0, 24)
}

/** "3 in your circle" / "1 in your circle" — plain, and only ever the real number. */
export function circleLine(members: CircleMember[]): string {
  const inEra = members.filter(m => m.era).length
  if (members.length === 0) return 'Nobody has joined your era yet.'
  if (inEra === 0) return `${members.length} in your circle · nobody in an era right now`
  return `${members.length} in your circle · ${inEra} in an era`
}
