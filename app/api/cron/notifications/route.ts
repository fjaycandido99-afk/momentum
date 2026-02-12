import { NextRequest, NextResponse } from 'next/server'
import {
  sendMorningReminders,
  sendBedtimeReminders,
  sendStreakAtRiskReminders,
  sendWeeklyReviewReminders,
  sendWeeklyInsights,
  sendDailyQuotes,
  sendDailyAffirmations,
  sendMotivationalNudges,
  sendDailyMotivation,
  sendFeaturedMusic,
} from '@/lib/push-service'
import { cleanupExpiredAudioCache } from '@/lib/daily-guide/cache-cleanup'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Cron endpoint for scheduled push notifications
 *
 * Configure in vercel.json:
 * {
 *   "crons": [
 *     { "path": "/api/cron/notifications?type=morning", "schedule": "0 * * * *" },
 *     { "path": "/api/cron/notifications?type=bedtime", "schedule": "0 * * * *" },
 *     { "path": "/api/cron/notifications?type=streak", "schedule": "0 20 * * *" },
 *     { "path": "/api/cron/notifications?type=weekly", "schedule": "0 10 * * 0" },
 *     { "path": "/api/cron/notifications?type=insight", "schedule": "0 12 * * 3" },
 *     { "path": "/api/cron/notifications?type=daily_motivation", "schedule": "0 9 * * *" },
 *     { "path": "/api/cron/notifications?type=featured_music", "schedule": "0 17 * * *" },
 *     { "path": "/api/cron/notifications?type=cleanup", "schedule": "0 3 * * *" }
 *   ]
 * }
 *
 * Note: Morning and bedtime run hourly ("0 * * * *") to support user-specific reminder times.
 * The functions check each user's preferred time and only send if it matches the current hour.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (required in production)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    switch (type) {
      case 'morning':
        await sendMorningReminders()
        return NextResponse.json({ success: true, type: 'morning_reminders' })

      case 'bedtime':
        await sendBedtimeReminders()
        return NextResponse.json({ success: true, type: 'bedtime_reminders' })

      case 'streak':
        await sendStreakAtRiskReminders()
        return NextResponse.json({ success: true, type: 'streak_reminders' })

      case 'weekly':
        await sendWeeklyReviewReminders()
        return NextResponse.json({ success: true, type: 'weekly_review' })

      case 'insight':
        await sendWeeklyInsights()
        return NextResponse.json({ success: true, type: 'weekly_insights' })

      case 'cleanup':
        await cleanupExpiredAudioCache()
        return NextResponse.json({ success: true, type: 'cache_cleanup' })

      case 'daily_quote':
        await sendDailyQuotes()
        return NextResponse.json({ success: true, type: 'daily_quotes' })

      case 'daily_affirmation':
        await sendDailyAffirmations()
        return NextResponse.json({ success: true, type: 'daily_affirmations' })

      case 'motivational_nudge':
        await sendMotivationalNudges()
        return NextResponse.json({ success: true, type: 'motivational_nudges' })

      case 'daily_motivation':
        await sendDailyMotivation()
        return NextResponse.json({ success: true, type: 'daily_motivation' })

      case 'featured_music':
        await sendFeaturedMusic()
        return NextResponse.json({ success: true, type: 'featured_music' })

      case 'all':
        // Send all types (for testing)
        await sendMorningReminders()
        await sendBedtimeReminders()
        await sendStreakAtRiskReminders()
        await sendWeeklyReviewReminders()
        await sendWeeklyInsights()
        await sendDailyQuotes()
        await sendDailyAffirmations()
        await sendMotivationalNudges()
        await sendDailyMotivation()
        await sendFeaturedMusic()
        return NextResponse.json({ success: true, type: 'all' })

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: morning, bedtime, streak, weekly, insight, cleanup, daily_quote, daily_affirmation, motivational_nudge, daily_motivation, featured_music, or all' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Cron notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
