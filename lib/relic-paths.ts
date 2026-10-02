import { ACHIEVEMENTS, type Achievement, type AchievementCondition } from './achievements'

/**
 * Relic paths and chains — how the coins relate.
 *
 * A CHAIN is one goal at rising thresholds: Getting Started (3-day streak) →
 * Week Warrior (7) → … → Year of Growth (365). It is derived from the
 * conditions themselves — same kind of goal, ordered by its number — never a
 * hand-kept list, so a new coin at a new threshold joins its chain on its
 * own. A one-off (Midnight Owl) has no chain.
 *
 * Pure.
 */

/** The goal a condition counts, without its threshold — or null for one-offs. */
export function seriesKey(c: AchievementCondition): string | null {
  switch (c.type) {
    case 'streak': return 'streak'
    case 'count': return `count:${c.action}`
    case 'xp_total': return 'xp'
    case 'level': return 'level'
    case 'consecutive_days': return `consecutive:${c.action}`
    case 'era': return `era:${c.metric}`
    case 'practice': return `practice:${c.metric}`
    case 'record': return `record:${c.metric}`
    default: return null
  }
}

/** The number a condition asks for. */
export function threshold(c: AchievementCondition): number {
  switch (c.type) {
    case 'streak': return c.days
    case 'consecutive_days': return c.days
    case 'count': return c.count
    case 'xp_total': return c.amount
    case 'level': return c.level
    case 'era': return c.count
    case 'practice': return c.count
    case 'record': return c.count
    default: return 0
  }
}

/**
 * The chain an achievement belongs to, lowest threshold first — or just
 * itself when it stands alone. Retired coins are left out unless `include`
 * names them (someone who holds one still sees it in place).
 */
export function chainFor(id: string, include: ReadonlySet<string> = new Set(), list: readonly Achievement[] = ACHIEVEMENTS): Achievement[] {
  const a = list.find(x => x.id === id)
  if (!a) return []
  const key = seriesKey(a.condition)
  if (!key) return [a]
  const chain = list
    .filter(x => (!x.retired || include.has(x.id)) && seriesKey(x.condition) === key)
    .sort((x, y) => threshold(x.condition) - threshold(y.condition))
  // Two coins with the same goal and number (a duplicate badge) collapse to
  // the one asked about, so the chain never shows a step twice.
  const seen = new Map<number, Achievement>()
  for (const x of chain) {
    const t = threshold(x.condition)
    if (!seen.has(t) || x.id === id) seen.set(t, x)
  }
  return [...seen.values()].sort((x, y) => threshold(x.condition) - threshold(y.condition))
}

export interface ProgressItem {
  id: string
  unlocked: boolean
  progress?: { current: number; target: number } | null
}

/**
 * The locked relics closest to unlocking — the ones with real progress,
 * nearest first by share of the way there. Never a guessed number: an
 * achievement without measurable progress isn't listed.
 */
export function nearest<T extends ProgressItem>(items: readonly T[], limit = 3): T[] {
  return items
    .filter(i => !i.unlocked && i.progress && i.progress.current > 0 && i.progress.current < i.progress.target)
    .sort((a, b) => b.progress!.current / b.progress!.target - a.progress!.current / a.progress!.target)
    .slice(0, limit)
}

/** "2 away", "1 day away" — how much is left, in the goal's own unit. */
export function remainingLabel(a: Achievement, p: { current: number; target: number }): string {
  const left = p.target - p.current
  const c = a.condition
  const unit =
    c.type === 'streak' || c.type === 'consecutive_days' ? 'day'
    : c.type === 'record' && c.metric === 'proof_days' ? 'day'
    : c.type === 'xp_total' ? 'XP'
    : c.type === 'level' ? 'level'
    : c.type === 'count' && c.action === 'listening_minutes' ? 'minute'
    : null
  if (unit === 'XP') return `${left.toLocaleString()} XP away`
  if (unit) return `${left} ${unit}${left === 1 ? '' : 's'} away`
  return `${left} away`
}

/**
 * Secret relics: a clue instead of the requirement. The surprise is the
 * point, but "Keep going to find it" gave nobody anything to look for.
 * Clues point at the behaviour without naming the rule.
 */
export const SECRET_CLUES: Record<string, string> = {
  midnight_owl: 'Some doors only open at one minute of the night.',
  perfect_week: 'Not more effort. Every part of the day, seven days running.',
  midnight_listener: 'The small hours sound different. Listen to them.',
}
