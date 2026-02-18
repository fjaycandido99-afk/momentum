import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser, NotificationType, NotificationPayload } from '@/lib/push-service'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Send a push notification to the current authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      type = 'custom',
      title,
      body: messageBody,
    } = body

    // Validate notification type
    const validTypes: NotificationType[] = [
      'morning_reminder',
      'checkpoint',
      'evening_reminder',
      'streak_at_risk',
      'weekly_review',
      'daily_quote',
      'daily_affirmation',
      'motivational_nudge',
      'custom',
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      )
    }

    // Build custom payload if provided
    const customPayload: Partial<NotificationPayload> = {}
    if (title) customPayload.title = title
    if (messageBody) customPayload.body = messageBody

    // Always send to the authenticated user
    const userId = user.id
    const result = await sendPushToUser(userId, type, customPayload)

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      message: result.success
        ? `Notification sent to ${result.sent} device(s)`
        : 'No devices to send to or notifications disabled',
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
