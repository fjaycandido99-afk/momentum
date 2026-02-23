import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push-service'
import {
  getEffectiveSettings,
  isInQuietWindow,
  getCurrentHHMM,
  checkCooldown,
  mapAlertTypeToNotificationType,
  calculateNextRun,
} from '@/lib/alert-service'

export const dynamic = 'force-dynamic'

const BATCH_SIZE = 50
const EXPIRY_WINDOW_HOURS = 24

// GET - Process scheduled alert queue (called by Vercel cron)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    let processed = 0
    let sent = 0
    let failed = 0
    let rescheduled = 0
    let expired = 0

    // 1. Expire overdue alerts
    const expiryCutoff = new Date(now.getTime() - EXPIRY_WINDOW_HOURS * 60 * 60 * 1000)
    const expiredResult = await prisma.scheduledAlert.updateMany({
      where: {
        status: { in: ['pending', 'queued'] },
        expires_at: { lte: now },
        scheduled_at: { lte: expiryCutoff },
      },
      data: { status: 'failed', last_error: 'Expired' },
    })
    expired = expiredResult.count

    // 2. Fetch due alerts ordered by priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
    const dueAlerts = await prisma.scheduledAlert.findMany({
      where: {
        status: { in: ['pending', 'queued'] },
        scheduled_at: { lte: now },
      },
      include: {
        alert_type: true,
      },
      orderBy: [{ priority: 'asc' }, { scheduled_at: 'asc' }],
      take: BATCH_SIZE,
    })

    // 3. Process each alert
    for (const alert of dueAlerts) {
      processed++

      try {
        // Mark as queued
        await prisma.scheduledAlert.update({
          where: { id: alert.id },
          data: { status: 'queued' },
        })

        // Check user settings
        const settings = await getEffectiveSettings(alert.user_id, alert.alert_type_id)

        // If alert type was deleted or user disabled it
        if (!settings || !settings.enabled) {
          await prisma.scheduledAlert.update({
            where: { id: alert.id },
            data: { status: 'cancelled', last_error: 'User disabled or type removed' },
          })
          continue
        }

        // Quiet hours check — reschedule if in quiet window (urgent bypasses)
        if (settings.priority !== 'urgent') {
          const currentTime = getCurrentHHMM()
          if (isInQuietWindow(currentTime, settings.quietStart, settings.quietEnd)) {
            // Reschedule to after quiet window ends
            if (settings.quietEnd) {
              const [h, m] = settings.quietEnd.split(':').map(Number)
              const rescheduleDate = new Date(now)
              rescheduleDate.setHours(h, m, 0, 0)
              if (rescheduleDate <= now) {
                rescheduleDate.setDate(rescheduleDate.getDate() + 1)
              }
              await prisma.scheduledAlert.update({
                where: { id: alert.id },
                data: { status: 'pending', scheduled_at: rescheduleDate },
              })
              rescheduled++
            }
            continue
          }
        }

        // Cooldown check — reschedule past cooldown
        if (settings.cooldownMinutes > 0) {
          const inCooldown = await checkCooldown(alert.user_id, alert.alert_type_id, settings.cooldownMinutes)
          if (inCooldown) {
            const rescheduleDate = new Date(now.getTime() + settings.cooldownMinutes * 60 * 1000)
            await prisma.scheduledAlert.update({
              where: { id: alert.id },
              data: { status: 'pending', scheduled_at: rescheduleDate },
            })
            rescheduled++
            continue
          }
        }

        // Send via push service
        const notificationType = mapAlertTypeToNotificationType(alert.alert_type_id)
        const result = await sendPushToUser(alert.user_id, notificationType, {
          title: alert.title,
          body: alert.body,
          data: { type: notificationType, ...(alert.data as object) },
        })

        // Write to history
        await prisma.alertHistory.create({
          data: {
            user_id: alert.user_id,
            alert_type_id: alert.alert_type_id,
            scheduled_alert_id: alert.id,
            priority: alert.priority,
            channel: alert.channel,
            status: result.success ? 'sent' : 'failed',
            title: alert.title,
            body: alert.body,
            data: alert.data || {},
            error_message: result.success ? null : 'Push delivery failed',
          },
        })

        if (result.success) {
          sent++

          // Handle recurrence
          if (alert.recurrence) {
            const nextRun = calculateNextRun(
              alert.recurrence,
              alert.recurrence_rule,
              alert.scheduled_at
            )
            if (nextRun) {
              await prisma.scheduledAlert.update({
                where: { id: alert.id },
                data: {
                  status: 'pending',
                  scheduled_at: nextRun,
                  next_run_at: calculateNextRun(alert.recurrence, alert.recurrence_rule, nextRun),
                  processed_at: now,
                  attempts: { increment: 1 },
                },
              })
            } else {
              await prisma.scheduledAlert.update({
                where: { id: alert.id },
                data: { status: 'sent', processed_at: now, attempts: { increment: 1 } },
              })
            }
          } else {
            await prisma.scheduledAlert.update({
              where: { id: alert.id },
              data: { status: 'sent', processed_at: now, attempts: { increment: 1 } },
            })
          }
        } else {
          failed++

          // Retry with exponential backoff
          const newAttempts = alert.attempts + 1
          if (newAttempts < alert.max_attempts) {
            const backoffMs = Math.pow(2, newAttempts) * 60 * 1000 // 2, 4, 8 min...
            await prisma.scheduledAlert.update({
              where: { id: alert.id },
              data: {
                status: 'pending',
                scheduled_at: new Date(now.getTime() + backoffMs),
                attempts: newAttempts,
                last_error: 'Push delivery failed, retrying',
              },
            })
            rescheduled++
          } else {
            await prisma.scheduledAlert.update({
              where: { id: alert.id },
              data: {
                status: 'failed',
                attempts: newAttempts,
                last_error: 'Max attempts reached',
                processed_at: now,
              },
            })
          }
        }
      } catch (err) {
        console.error(`Error processing alert ${alert.id}:`, err)
        failed++

        await prisma.scheduledAlert.update({
          where: { id: alert.id },
          data: {
            status: 'failed',
            last_error: err instanceof Error ? err.message : 'Unknown error',
            attempts: { increment: 1 },
          },
        }).catch(() => {})
      }
    }

    console.log(`Alert cron: ${processed} processed, ${sent} sent, ${failed} failed, ${rescheduled} rescheduled, ${expired} expired`)

    return NextResponse.json({ processed, sent, failed, rescheduled, expired })
  } catch (error) {
    console.error('Cron alerts error:', error)
    return NextResponse.json({ error: 'Failed to process alerts' }, { status: 500 })
  }
}
