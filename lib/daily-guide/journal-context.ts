import { prisma } from '@/lib/prisma'

export interface JournalEntry {
  journal_win: string | null
  journal_gratitude: string | null
  journal_learned: string | null
  journal_freetext: string | null
  journal_mood: string | null
  journal_tags?: string[]
  date: Date
}

/**
 * Fetch recent journal entries for a user.
 * Shared utility to avoid duplicating the same query across 6+ API routes.
 */
export async function getRecentJournals(
  userId: string,
  days: number = 3,
  limit: number = 5
): Promise<JournalEntry[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  return prisma.dailyGuide.findMany({
    where: {
      user_id: userId,
      date: { gte: since },
      OR: [
        { journal_win: { not: null } },
        { journal_gratitude: { not: null } },
        { journal_learned: { not: null } },
        { journal_freetext: { not: null } },
      ],
    },
    select: {
      journal_win: true,
      journal_gratitude: true,
      journal_learned: true,
      journal_freetext: true,
      journal_mood: true,
      journal_tags: true,
      date: true,
    },
    orderBy: { date: 'desc' },
    take: limit,
  })
}

/**
 * Format journal entries into an AI context string.
 * Used by affirmation, morning-briefing, letter-to-self, coach, etc.
 */
export function formatJournalContext(journals: JournalEntry[], maxChars: number = 80): string {
  return journals
    .map(j => {
      const parts: string[] = []
      if (j.journal_win) parts.push(`Win: "${j.journal_win.substring(0, maxChars)}"`)
      if (j.journal_gratitude) parts.push(`Grateful: "${j.journal_gratitude.substring(0, maxChars)}"`)
      if (j.journal_learned) parts.push(`Learned: "${j.journal_learned.substring(0, maxChars)}"`)
      if (j.journal_mood) parts.push(`Mood: ${j.journal_mood}`)
      return parts.join('; ')
    })
    .filter(Boolean)
    .join('\n')
}
