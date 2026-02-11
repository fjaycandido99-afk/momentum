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
