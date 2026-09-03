import { prisma } from '@/lib/prisma'

/**
 * Clean up expired audio cache entries that contain date-based keys.
 * Date-based cache keys follow the patterns:
 *   calm-{type}-{YYYY-MM-DD}-{tone}
 *   voice-{type}-{YYYY-MM-DD}-{tone}
 * Entries older than maxAgeDays are deleted to prevent unbounded growth.
 *
 * PRESERVED (not deleted):
 *   library-{type}-s{index}-{tone}  — pre-recorded voice library (permanent)
 *
 * Chat reply audio (chat-{tone}-{hash}) is handled separately below on a
 * longer window — see cleanupChatVoiceCache.
 */
export async function cleanupExpiredAudioCache(maxAgeDays = 3): Promise<{ deleted: number }> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

  try {
    // Delete date-based cache entries older than maxAgeDays
    // Date-based keys start with "calm-" or "voice-" prefixes
    // Static/fallback keys use different patterns (e.g. "breathing-s0-calm")
    // Library keys ("library-*") are NOT matched — they persist permanently
    const result = await prisma.audioCache.deleteMany({
      where: {
        AND: [
          {
            OR: [
              { cache_key: { startsWith: 'calm-' } },
              { cache_key: { startsWith: 'voice-' } },
            ],
          },
          {
            created_at: {
              lt: cutoffDate,
            },
          },
        ],
      },
    })

    console.log(`[Cache Cleanup] Deleted ${result.count} expired audio cache entries (older than ${maxAgeDays} days)`)
    return { deleted: result.count }
  } catch (error) {
    console.error('[Cache Cleanup] Error:', error)
    return { deleted: 0 }
  }
}

/**
 * Clean up cached chat reply audio (chat-{tone}-{hash}).
 *
 * These are base64 MP3 blobs stored in Postgres, and unlike the daily
 * guide's date-keyed entries they have no natural expiry — the key is a
 * hash of the reply text, so nothing ever supersedes them. Left alone
 * they accumulate forever, and rows this large are expensive to store
 * and to read past.
 *
 * The window is deliberately longer than the 3 days used for guide audio.
 * The whole point of this cache is that AI replies repeat across users
 * ("What comes up when you sit with that?"), and every eviction of a
 * still-popular line costs ElevenLabs characters to regenerate. Thirty
 * days keeps the genuinely repeated ones cheap while letting one-off
 * replies fall out.
 */
export async function cleanupChatVoiceCache(maxAgeDays = 30): Promise<{ deleted: number }> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

  try {
    const result = await prisma.audioCache.deleteMany({
      where: {
        cache_key: { startsWith: 'chat-' },
        created_at: { lt: cutoffDate },
      },
    })
    console.log(`[Chat Voice Cleanup] Deleted ${result.count} cached replies older than ${maxAgeDays} days`)
    return { deleted: result.count }
  } catch (error) {
    console.error('[Chat Voice Cleanup] Error:', error)
    return { deleted: 0 }
  }
}

/**
 * Clean up old AiUsageDaily rows.
 *
 * One row per user, per feature, per day, written by the free-tier meter.
 * Only "today" is ever read for enforcement, so anything older is history.
 * Kept for 35 days rather than a few, so a full month of usage is still
 * available to look at before deciding what the free allowances should
 * actually be — that data does not exist yet and will be worth having.
 */
export async function cleanupAiUsage(maxAgeDays = 35): Promise<{ deleted: number }> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - maxAgeDays)
  // `day` is a YYYY-MM-DD string in the user's timezone, so compare it as
  // a string rather than trusting a Date round-trip through zones.
  const cutoffKey = cutoff.toISOString().slice(0, 10)

  try {
    const result = await prisma.aiUsageDaily.deleteMany({
      where: { day: { lt: cutoffKey } },
    })
    console.log(`[AI Usage Cleanup] Deleted ${result.count} usage rows older than ${cutoffKey}`)
    return { deleted: result.count }
  } catch (error) {
    console.error('[AI Usage Cleanup] Error:', error)
    return { deleted: 0 }
  }
}
