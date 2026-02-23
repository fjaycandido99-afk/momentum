import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push-service'
import { isPremiumUser } from '@/lib/subscription-check'
import {
  getEffectiveSettings,
  isInQuietWindow,
  getCurrentHHMM,
  checkCooldown,
  mapAlertTypeToNotificationType,
} from '@/lib/alert-service'

export const dynamic = 'force-dynamic'

// POST - Core send pipeline
export async function POST(request: NextRequest) {
  try {
    // Dual auth: CRON_SECRET (server) or Supabase user auth (self only)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

    let userId: string

    if (isCronAuth) {
      const body = await request.json()
      if (!body.user_id) {
        return NextResponse.json({ error: 'user_id required for server auth' }, { status: 400 })
      }
      if (!body.alert_type_id) {
        return NextResponse.json({ error: 'alert_type_id required' }, { status: 400 })
      }
      userId = body.user_id
      return await processSend(userId, body)
    } else {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const body = await request.json()
      if (!body.alert_type_id) {
        return NextResponse.json({ error: 'alert_type_id required' }, { status: 400 })
      }
      userId = user.id
      return await processSend(userId, body)
    }
  } catch (error) {
    console.error('Send alert error:', error)
    return NextResponse.json({ error: 'Failed to send alert' }, { status: 500 })
  }
}

async function processSend(
  userId: string,
  body: { alert_type_id: string; title?: string; body?: string; data?: any }
) {
  const { alert_type_id, title, body: bodyText, data } = body

  // 1. Get effective settings
  const settings = await getEffectiveSettings(userId, alert_type_id)
  if (!settings) {
    return NextResponse.json({ error: 'Unknown alert type' }, { status: 404 })
  }

  // 2. Check premium
  if (settings.premiumOnly) {
    const premium = await isPremiumUser(userId)
    if (!premium) {
      return NextResponse.json(
        { success: false, skipped_reason: 'premium_required' },
        { status: 403 }
      )
    }
  }

  // 3. Check user enabled
  if (!settings.enabled) {
    return NextResponse.json(
      { success: false, skipped_reason: 'user_disabled' },
      { status: 200 }
    )
  }

  // 4. Check quiet hours (urgent bypasses)
  if (settings.priority !== 'urgent') {
    const currentTime = getCurrentHHMM()
    if (isInQuietWindow(currentTime, settings.quietStart, settings.quietEnd)) {
      return NextResponse.json(
        { success: false, skipped_reason: 'quiet_hours' },
        { status: 200 }
      )
    }
  }

  // 5. Check cooldown
  const inCooldown = await checkCooldown(userId, alert_type_id, settings.cooldownMinutes)
  if (inCooldown) {
    return NextResponse.json(
      { success: false, skipped_reason: 'cooldown' },
      { status: 200 }
    )
  }

  // 6. Send via push service
  const notificationType = mapAlertTypeToNotificationType(alert_type_id)
  const alertTitle = title || settings.alertType.label
  const alertBody = bodyText || settings.alertType.description || ''

  const result = await sendPushToUser(userId, notificationType, {
    title: alertTitle,
    body: alertBody,
    data: { type: notificationType, ...data },
  })

  // 7. Write to alert_history
  const history = await prisma.alertHistory.create({
    data: {
      user_id: userId,
      alert_type_id,
      priority: settings.priority,
      channel: settings.channel,
      status: result.success ? 'sent' : 'failed',
      title: alertTitle,
      body: alertBody,
      data: data || {},
      error_message: result.success ? null : 'No subscriptions or all failed',
    },
  })

  return NextResponse.json({
    success: result.success,
    sent: result.sent,
    failed: result.failed,
    history_id: history.id,
  })
}
