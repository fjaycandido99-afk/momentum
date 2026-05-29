/**
 * Test trigger for the Coach Memory contextual-callback system.
 *
 * Runs the FULL pipeline end-to-end against the authenticated user:
 * generates an AI callback message → queues a ScheduledAlert →
 * immediately fires it via sendPushToUser → returns the generated
 * title/body plus the push-service delivery result.
 *
 * Auth: standard Supabase session — any signed-in user can fire one
 *       at THEMSELVES. No admin gate, no cross-user delivery.
 *
 * Usage:
 *   GET /api/notifications/test-callback?type=journal_callback
 *     &summary=Wrote+about+my+morning+walk
 *
 *   type    — journal_callback | quote_callback | session_callback | mood_callback
 *             (defaults to journal_callback)
 *   summary — optional custom summary; sensible default per type
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { queueCallback, type CallbackType } from '@/lib/contextual-callbacks'
import { sendPushToUser } from '@/lib/push-service'
import { mapAlertTypeToNotificationType } from '@/lib/alert-service'
import { sendAPNsNotification, isAPNsConfigured } from '@/lib/apns'

export const dynamic = 'force-dynamic'

const DEFAULT_SUMMARIES: Record<CallbackType, string> = {
  journal_callback: 'Wrote a journal entry: "Today I want to be more intentional about how I spend my evening."',
  quote_callback: 'Saved quote: "The obstacle is the way." — Marcus Aurelius',
  session_callback: 'Completed Morning Prime session today',
  mood_callback: 'Logged a heavy mood today: "low"',
}

const VALID_TYPES: CallbackType[] = ['journal_callback', 'quote_callback', 'session_callback', 'mood_callback']

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const typeParam = (url.searchParams.get('type') || 'journal_callback') as CallbackType
    const type: CallbackType = VALID_TYPES.includes(typeParam) ? typeParam : 'journal_callback'
    const summary = url.searchParams.get('summary') || DEFAULT_SUMMARIES[type]

    // 1) Queue the callback — this generates the AI message, dedupes
    //    any existing one, creates a ScheduledAlert. We let it
    //    schedule for the normal next-morning slot.
    await queueCallback(user.id, type, {
      summary,
      intensity: type === 'mood_callback' ? 'low' : 'normal',
    })

    // 2) Grab the just-queued alert (most recent ai_callback for this
    //    user) so we can read the AI-generated title/body.
    const alert = await prisma.scheduledAlert.findFirst({
      where: { user_id: user.id, alert_type_id: 'ai_callback' },
      orderBy: { created_at: 'desc' },
    })
    if (!alert) {
      return NextResponse.json(
        { error: 'queueCallback did not produce an alert — check server logs' },
        { status: 500 },
      )
    }

    // Diagnostic: how many push subscriptions does this user have?
    // Helps us tell "no push arrived" apart from "push sent but device
    // didn't receive" — if subs is 0, the device never registered.
    const subs = await prisma.pushSubscription.findMany({
      where: { user_id: user.id },
      select: { id: true, platform: true, native_token: true, endpoint: true, coach_checkin_alerts: true, motivational_nudge_alerts: true },
    })
    const subSummary = subs.map(s => ({
      id: s.id.slice(0, 8),
      platform: s.platform,
      has_native_token: !!s.native_token,
      has_web_endpoint: !!s.endpoint,
      coach_checkin_alerts: s.coach_checkin_alerts,
    }))

    // 3) Fire it RIGHT NOW via the push service. Bypasses the cron
    //    + scheduled_at + quiet-hours check by design (this is a test
    //    trigger). Mark the alert as sent so the cron doesn't deliver
    //    a duplicate in the morning.
    const notificationType = mapAlertTypeToNotificationType('ai_callback')
    const result = await sendPushToUser(user.id, notificationType, {
      title: alert.title,
      body: alert.body,
      data: { type: notificationType, ...(alert.data as object) },
    })

    await prisma.scheduledAlert.update({
      where: { id: alert.id },
      data: {
        status: result.success ? 'sent' : 'failed',
        processed_at: new Date(),
        attempts: { increment: 1 },
        last_error: result.success ? null : 'Test trigger push failed',
      },
    })

    // 4) Direct APNs probe — fires the same notification straight at
    //    every iOS native token, returning the raw APNs status code +
    //    reason for each. This is what tells us WHY the push above
    //    failed (BadDeviceToken / TooManyRequests / BadCertificate /
    //    DeviceTokenNotForTopic etc.) — sendPushToUser only returns
    //    counts. Run only when sendPushToUser reported a failure so
    //    we don't double-deliver when things are healthy.
    let apnsProbe: Array<{ token_prefix: string; status: number; reason?: string }> | undefined
    if (!result.success) {
      apnsProbe = []
      if (!isAPNsConfigured()) {
        apnsProbe.push({ token_prefix: '(none)', status: -1, reason: 'APNs not configured (env vars missing)' })
      } else {
        for (const sub of subs) {
          if (sub.platform !== 'ios' || !sub.native_token) continue
          try {
            const apnsResult = await sendAPNsNotification(sub.native_token, {
              title: alert.title,
              body: alert.body,
            })
            apnsProbe.push({
              token_prefix: sub.native_token.slice(0, 12) + '…',
              status: apnsResult.statusCode,
              reason: apnsResult.reason,
            })
          } catch (err) {
            apnsProbe.push({
              token_prefix: sub.native_token.slice(0, 12) + '…',
              status: -1,
              reason: err instanceof Error ? err.message : 'unknown',
            })
          }
        }
      }
    }

    return NextResponse.json({
      ok: result.success,
      type,
      summary,
      generated: { title: alert.title, body: alert.body },
      scheduled_for: alert.scheduled_at,
      mapped_notification_type: notificationType,
      subscriptions: subSummary,
      push_result: result,
      apns_probe: apnsProbe,
    })
  } catch (err) {
    console.error('[test-callback] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
