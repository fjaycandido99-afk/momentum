import { NextRequest, NextResponse } from 'next/server'
import {
  sendMorningReminders,
  sendStreakAtRiskReminders,
  sendWeeklyReviewReminders,
} from '@/lib/push-service'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Cron endpoint for scheduled push notifications
 *
 * Configure in vercel.json:
 * {
 *   "crons": [
 *     { "path": "/api/cron/notifications?type=morning", "schedule": "0 7 * * *" },
 *     { "path": "/api/cron/notifications?type=streak", "schedule": "0 20 * * *" },
 *     { "path": "/api/cron/notifications?type=weekly", "schedule": "0 10 * * 0" }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended for production)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    switch (type) {
      case 'morning':
        await sendMorningReminders()
        return NextResponse.json({ success: true, type: 'morning_reminders' })

      case 'streak':
        await sendStreakAtRiskReminders()
        return NextResponse.json({ success: true, type: 'streak_reminders' })

      case 'weekly':
        await sendWeeklyReviewReminders()
        return NextResponse.json({ success: true, type: 'weekly_review' })

      case 'all':
        // Send all types (for testing)
        await sendMorningReminders()
        await sendStreakAtRiskReminders()
        await sendWeeklyReviewReminders()
        return NextResponse.json({ success: true, type: 'all' })

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: morning, streak, weekly, or all' },
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
