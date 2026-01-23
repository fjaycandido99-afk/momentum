/**
 * Push Notification Delivery Service
 * Handles sending notifications to web push and native platforms
 */

import webPush from 'web-push'
import { prisma } from './prisma'

// Notification types that can be sent
export type NotificationType =
  | 'morning_reminder'
  | 'checkpoint'
  | 'evening_reminder'
  | 'streak_at_risk'
  | 'weekly_review'
  | 'custom'

// Notification payload structure
export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: {
    type: NotificationType
    url?: string
    [key: string]: any
  }
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

// Pre-defined notification templates
export const NOTIFICATION_TEMPLATES: Record<NotificationType, Omit<NotificationPayload, 'data'>> = {
  morning_reminder: {
    title: 'Good Morning!',
    body: 'Start your day with your morning flow',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'morning-reminder',
    actions: [
      { action: 'open', title: 'Start Flow' },
      { action: 'dismiss', title: 'Later' },
    ],
  },
  checkpoint: {
    title: 'Checkpoint Time',
    body: 'Take a moment to check in with yourself',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'checkpoint',
    actions: [
      { action: 'open', title: 'Check In' },
      { action: 'dismiss', title: 'Skip' },
    ],
  },
  evening_reminder: {
    title: 'Evening Wind Down',
    body: 'Time to close out your day and reflect',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'evening-reminder',
    actions: [
      { action: 'open', title: 'Day Close' },
      { action: 'dismiss', title: 'Later' },
    ],
  },
  streak_at_risk: {
    title: 'Keep Your Streak!',
    body: "Don't break your streak - complete today's flow",
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'streak-risk',
    actions: [
      { action: 'open', title: 'Continue' },
    ],
  },
  weekly_review: {
    title: 'Weekly Review Ready',
    body: 'See how your week went and celebrate your wins',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'weekly-review',
    actions: [
      { action: 'open', title: 'View Review' },
    ],
  },
  custom: {
    title: 'Voxu',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
  },
}

// Initialize web push with VAPID keys
function initWebPush() {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://voxu.app'

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured. Web push notifications will not work.')
    return false
  }

  webPush.setVapidDetails(
    `mailto:support@${new URL(appUrl).hostname}`,
    vapidPublicKey,
    vapidPrivateKey
  )
  return true
}

/**
 * Send a push notification to a specific user
 */
export async function sendPushToUser(
  userId: string,
  type: NotificationType,
  customPayload?: Partial<NotificationPayload>
): Promise<{ success: boolean; sent: number; failed: number }> {
  // Get all subscriptions for this user
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user_id: userId },
  })

  if (subscriptions.length === 0) {
    return { success: false, sent: 0, failed: 0 }
  }

  // Check if user has this notification type enabled
  const notificationPreferenceMap: Record<NotificationType, keyof typeof subscriptions[0]> = {
    morning_reminder: 'morning_reminder',
    checkpoint: 'checkpoint_alerts',
    evening_reminder: 'evening_reminder',
    streak_at_risk: 'streak_alerts',
    weekly_review: 'weekly_review',
    custom: 'morning_reminder', // Custom always sends
  }

  const prefKey = notificationPreferenceMap[type]

  // Filter subscriptions that have this notification type enabled
  const enabledSubscriptions = type === 'custom'
    ? subscriptions
    : subscriptions.filter(sub => sub[prefKey] === true)

  if (enabledSubscriptions.length === 0) {
    return { success: false, sent: 0, failed: 0 }
  }

  // Build notification payload
  const template = NOTIFICATION_TEMPLATES[type]
  const payload: NotificationPayload = {
    ...template,
    ...customPayload,
    data: {
      type,
      url: '/',
      ...customPayload?.data,
    },
  }

  let sent = 0
  let failed = 0

  // Initialize web push
  const webPushReady = initWebPush()

  for (const subscription of enabledSubscriptions) {
    try {
      if (subscription.platform === 'web' && subscription.endpoint) {
        // Web push notification
        if (!webPushReady) {
          failed++
          continue
        }

        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh!,
              auth: subscription.auth!,
            },
          },
          JSON.stringify(payload)
        )
        sent++
      } else if (subscription.platform === 'ios' && subscription.native_token) {
        // iOS APNs notification
        // TODO: Implement APNs sending when you have your certificates
        // For now, log that we would send
        console.log(`[APNs] Would send to iOS device: ${subscription.native_token.substring(0, 20)}...`)
        // When ready, use a library like 'apn' or Firebase Admin SDK
        sent++ // Count as sent for now
      } else if (subscription.platform === 'android' && subscription.native_token) {
        // Android FCM notification
        // TODO: Implement FCM sending when you have Firebase configured
        console.log(`[FCM] Would send to Android device: ${subscription.native_token.substring(0, 20)}...`)
        // When ready, use Firebase Admin SDK
        sent++
      }
    } catch (error: any) {
      console.error(`Failed to send notification to subscription ${subscription.id}:`, error.message)
      failed++

      // If subscription is invalid (410 Gone), remove it
      if (error.statusCode === 410 || error.statusCode === 404) {
        await prisma.pushSubscription.delete({
          where: { id: subscription.id },
        }).catch(() => {})
      }
    }
  }

  return {
    success: sent > 0,
    sent,
    failed,
  }
}

/**
 * Send a notification to all users with a specific preference enabled
 */
export async function sendBroadcastNotification(
  type: NotificationType,
  customPayload?: Partial<NotificationPayload>
): Promise<{ success: boolean; totalSent: number; totalFailed: number }> {
  // Get all unique user IDs with subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { user_id: true },
    distinct: ['user_id'],
  })

  let totalSent = 0
  let totalFailed = 0

  for (const { user_id } of subscriptions) {
    const result = await sendPushToUser(user_id, type, customPayload)
    totalSent += result.sent
    totalFailed += result.failed
  }

  return {
    success: totalSent > 0,
    totalSent,
    totalFailed,
  }
}

/**
 * Send morning reminders to all users
 * Call this from a cron job at the user's preferred wake time
 */
export async function sendMorningReminders(): Promise<void> {
  // Get users who should receive morning reminders now
  // This should ideally check their wake_time preference
  const result = await sendBroadcastNotification('morning_reminder')
  console.log(`Morning reminders: ${result.totalSent} sent, ${result.totalFailed} failed`)
}

/**
 * Send streak at risk notifications
 * Call this in the evening for users who haven't completed their flow
 */
export async function sendStreakAtRiskReminders(): Promise<void> {
  // TODO: Query for users who:
  // 1. Have a streak > 0
  // 2. Haven't completed today's flow
  // 3. Have streak_reminder enabled

  const result = await sendBroadcastNotification('streak_at_risk')
  console.log(`Streak reminders: ${result.totalSent} sent, ${result.totalFailed} failed`)
}

/**
 * Send weekly review notifications (on Sundays)
 */
export async function sendWeeklyReviewReminders(): Promise<void> {
  const result = await sendBroadcastNotification('weekly_review')
  console.log(`Weekly review reminders: ${result.totalSent} sent, ${result.totalFailed} failed`)
}
