/**
 * Builds the "memory" block the AI chat is given about the user.
 *
 * Two gates, in this order, and the order matters:
 *
 *   1. CONSENT — UserPreferences.ai_memory_enabled. Off by default, for
 *      every tier. A paying user is equally entitled to a companion that
 *      has not read their diary. No consent → empty memory, full stop.
 *   2. TIER — how far back it reads, per AI_MEMORY_DEPTH.
 *
 * Cost note: this is the query that would quietly get expensive. The
 * chat API is stateless, so a naive implementation re-reads the same
 * journal rows on every turn of a conversation — at eight turns that is
 * eight round trips pulling the same multi-KB free-text. Hence the
 * short-lived cache below: one build per user per conversation, near
 * enough. journal_freetext allows 5,000 characters, so entries are also
 * truncated before they ever reach a prompt.
 */

import { prisma } from '@/lib/prisma'
import { AI_MEMORY_DEPTH, type AiMemoryDepth } from '@/lib/subscription-constants'

/** Per-entry character cap. Enough to carry the gist, not a whole essay. */
const ENTRY_CHARS = 320
/** Per-saved-item character cap. */
const SAVED_CHARS = 180
/** How long a built block stays warm. Covers a conversation, not a day. */
const CACHE_TTL_MS = 10 * 60 * 1000

interface CacheEntry {
  block: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

function cacheKey(userId: string, tier: 'free' | 'premium'): string {
  return `${userId}:${tier}`
}

/** Drop a user's cached memory so the next turn rebuilds it. */
export function invalidateUserContext(userId: string): void {
  cache.delete(cacheKey(userId, 'free'))
  cache.delete(cacheKey(userId, 'premium'))
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export interface UserContextResult {
  /** Prompt-ready text. Empty string when there is nothing to say. */
  block: string
  /** False when the user has not consented — callers surface this in the UI. */
  consented: boolean
  /** True when consent is on but the user simply has no history yet. */
  empty: boolean
}

export async function buildUserContext(
  userId: string,
  tier: 'free' | 'premium'
): Promise<UserContextResult> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { user_id: userId },
    select: { ai_memory_enabled: true },
  })

  if (!prefs?.ai_memory_enabled) {
    return { block: '', consented: false, empty: true }
  }

  const key = cacheKey(userId, tier)
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) {
    return { block: hit.block, consented: true, empty: hit.block === '' }
  }

  const depth: AiMemoryDepth = AI_MEMORY_DEPTH[tier]
  const since = new Date()
  since.setDate(since.getDate() - depth.journalDays)

  const [entries, saved, goals] = await Promise.all([
    prisma.dailyGuide.findMany({
      where: {
        user_id: userId,
        date: { gte: since },
        OR: [
          { journal_win: { not: null } },
          { journal_gratitude: { not: null } },
          { journal_learned: { not: null } },
          { journal_freetext: { not: null } },
          { morning_minute_transcript: { not: null } },
        ],
      },
      select: {
        date: true,
        journal_mood: true,
        journal_win: true,
        journal_gratitude: true,
        journal_learned: true,
        journal_freetext: true,
        morning_minute_transcript: true,
      },
      orderBy: { date: 'desc' },
      take: depth.journalDays,
    }),
    prisma.favoriteContent.findMany({
      where: { user_id: userId, content_type: { in: ['quote', 'lesson', 'motivation'] } },
      select: { content_text: true, content_type: true },
      orderBy: { created_at: 'desc' },
      take: depth.savedItems,
    }),
    depth.goals
      ? prisma.goal.findMany({
          where: { user_id: userId, status: 'active' },
          select: { title: true, current_count: true, target_count: true },
          take: 5,
        })
      : Promise.resolve([]),
  ])

  const sections: string[] = []

  if (entries.length) {
    const lines = entries.map(e => {
      const parts = [
        e.journal_win && `win: ${e.journal_win}`,
        e.journal_gratitude && `grateful: ${e.journal_gratitude}`,
        e.journal_learned && `learned: ${e.journal_learned}`,
        e.journal_freetext && truncate(e.journal_freetext, ENTRY_CHARS),
        e.morning_minute_transcript && `said aloud: ${truncate(e.morning_minute_transcript, ENTRY_CHARS)}`,
      ].filter(Boolean)
      const mood = e.journal_mood ? ` (felt ${e.journal_mood})` : ''
      return `- ${isoDay(e.date)}${mood}: ${parts.join(' | ')}`
    })
    sections.push(
      depth.journalDays <= 1
        ? `What they wrote today:\n${lines.join('\n')}`
        : `What they've written recently (newest first):\n${lines.join('\n')}`
    )
  }

  if (saved.length) {
    const lines = saved.map(s => `- ${truncate(s.content_text, SAVED_CHARS)}`)
    sections.push(`Words they chose to save:\n${lines.join('\n')}`)
  }

  if (goals.length) {
    const lines = goals.map(g => `- ${g.title} (${g.current_count}/${g.target_count})`)
    sections.push(`What they're working toward:\n${lines.join('\n')}`)
  }

  if (depth.moodTrend && entries.length > 1) {
    const trend = entries
      .filter(e => e.journal_mood)
      .slice(0, 7)
      .reverse()
      .map(e => e.journal_mood)
      .join(' → ')
    if (trend) sections.push(`Recent mood: ${trend}`)
  }

  const block = sections.length
    ? [
        'CONTEXT — this person has allowed you to remember the following.',
        'Use it the way a friend would: notice a pattern, refer back to something',
        'they said, connect a saved quote to what they are feeling now. Never',
        'recite it back as a list, and never imply you are watching them.',
        '',
        sections.join('\n\n'),
      ].join('\n')
    : ''

  cache.set(key, { block, expiresAt: Date.now() + CACHE_TTL_MS })
  return { block, consented: true, empty: block === '' }
}
