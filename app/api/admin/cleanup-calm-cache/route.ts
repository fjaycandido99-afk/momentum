import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// One-time cleanup: delete old calm-tone cached audio so new calm voice is served
// Does NOT touch library-*-calm (new seeded audio) or other tones
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: Record<string, number> = {}

    // 1. Delete old calm-voice route cache: calm-{type}-calm-v{variant}
    // These keys start with "calm-" (e.g. calm-breathing-calm-v0)
    // Safe: library keys start with "library-" and calm_the_storm starts with "library-calm_the_storm"
    const calmVoiceCache = await prisma.audioCache.deleteMany({
      where: {
        AND: [
          { cache_key: { startsWith: 'calm-' } },
          { cache_key: { not: { startsWith: 'calm_the_storm' } } },
        ],
      },
    })
    results.calmVoiceCacheDeleted = calmVoiceCache.count

    // 2. Delete old preview cache (v1 only — v2 will regenerate with new voice)
    const previewCache = await prisma.audioCache.deleteMany({
      where: { cache_key: 'tone-preview-v1-calm' },
    })
    results.previewCacheDeleted = previewCache.count

    // 3. Clear per-user DailyGuide audio fields for calm-tone users
    const calmUsers = await prisma.userPreferences.findMany({
      where: { guide_tone: 'calm' },
      select: { user_id: true },
    })
    const calmUserIds = calmUsers.map(u => u.user_id)

    let dailyGuideCount = 0
    if (calmUserIds.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const dailyGuideCleared = await prisma.dailyGuide.updateMany({
        where: {
          user_id: { in: calmUserIds },
          date: { gte: today },
        },
        data: {
          breathing_audio: null,
          affirmation_audio: null,
          gratitude_audio: null,
          sleep_audio: null,
          grounding_audio: null,
          stress_relief_audio: null,
          focus_meditation_audio: null,
          self_compassion_audio: null,
          confidence_audio: null,
          bedtime_story_audio: null,
          midday_reset_audio: null,
          wind_down_audio: null,
          work_prime_audio: null,
          off_prime_audio: null,
          recovery_prime_audio: null,
          work_close_audio: null,
          off_close_audio: null,
          recovery_close_audio: null,
        },
      })
      dailyGuideCount = dailyGuideCleared.count
    }

    results.dailyGuideUsersCleared = dailyGuideCount
    results.calmUsersFound = calmUserIds.length

    return NextResponse.json({
      success: true,
      message: 'Old calm-tone cache cleared. New seeded library-*-calm entries preserved.',
      results,
    })
  } catch (error) {
    console.error('Cleanup calm cache error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
