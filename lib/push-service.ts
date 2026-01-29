/**
 * Push Notification Delivery Service
 * Handles sending notifications to web push and native platforms
 */

import webPush from 'web-push'
import { prisma } from './prisma'
import { sendAPNsNotification, isAPNsConfigured } from './apns'
import { sendFCMNotification, isFCMConfigured } from './fcm'
import { getDayOfYearQuote } from './quotes'
import { getGroq, GROQ_MODEL } from './groq'

// Notification types that can be sent
export type NotificationType =
  | 'morning_reminder'
  | 'checkpoint'
  | 'evening_reminder'
  | 'streak_at_risk'
  | 'weekly_review'
  | 'insight'
  | 'daily_quote'
  | 'daily_affirmation'
  | 'motivational_nudge'
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
  insight: {
    title: 'Weekly Insight',
    body: 'See how your habits are impacting your wellbeing',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'weekly-insight',
    actions: [
      { action: 'open', title: 'View Insight' },
    ],
  },
  daily_quote: {
    title: 'Daily Quote',
    body: 'Your daily dose of inspiration',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'daily-quote',
    actions: [
      { action: 'open', title: 'Read More' },
    ],
  },
  daily_affirmation: {
    title: 'Daily Affirmation',
    body: 'Your personalized affirmation is ready',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'daily-affirmation',
    actions: [
      { action: 'open', title: 'View' },
    ],
  },
  motivational_nudge: {
    title: 'Midday Check-In',
    body: 'A quick moment of encouragement',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'motivational-nudge',
    actions: [
      { action: 'open', title: 'Open' },
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
    insight: 'insight_alerts',
    daily_quote: 'daily_quote_alerts',
    daily_affirmation: 'daily_affirmation_alerts',
    motivational_nudge: 'motivational_nudge_alerts',
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
        if (!isAPNsConfigured()) {
          console.warn('[APNs] APNs credentials not configured, skipping iOS push')
          failed++
          continue
        }

        const apnsResult = await sendAPNsNotification(subscription.native_token, {
          title: payload.title,
          body: payload.body,
          data: payload.data as Record<string, any>,
        })

        if (apnsResult.success) {
          sent++
        } else {
          failed++
          // 410 Gone or 400 BadDeviceToken — remove stale subscription
          if (apnsResult.statusCode === 410 || apnsResult.reason === 'BadDeviceToken') {
            await prisma.pushSubscription.delete({
              where: { id: subscription.id },
            }).catch(() => {})
          }
        }
      } else if (subscription.platform === 'android' && subscription.native_token) {
        // Android FCM notification
        if (!isFCMConfigured()) {
          console.warn('[FCM] Firebase credentials not configured, skipping Android push')
          failed++
          continue
        }

        const fcmResult = await sendFCMNotification(subscription.native_token, {
          title: payload.title,
          body: payload.body,
          data: payload.data
            ? Object.fromEntries(
                Object.entries(payload.data).map(([k, v]) => [k, String(v)])
              )
            : undefined,
        })

        if (fcmResult.success) {
          sent++
        } else {
          failed++
          // Token unregistered — remove stale subscription
          if (fcmResult.unregistered) {
            await prisma.pushSubscription.delete({
              where: { id: subscription.id },
            }).catch(() => {})
          }
        }
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
 * Send personalized morning reminders to all users
 * References yesterday's data for personalization
 */
export async function sendMorningReminders(): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { user_id: true },
    distinct: ['user_id'],
  })

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  let totalSent = 0
  let totalFailed = 0

  for (const { user_id } of subscriptions) {
    // Query yesterday's guide for personalization
    let body = 'Start your day with your morning flow'
    try {
      const yesterdayGuide = await prisma.dailyGuide.findUnique({
        where: {
          user_id_date: {
            user_id,
            date: yesterday,
          },
        },
        select: {
          mood_after: true,
          journal_win: true,
          morning_prime_done: true,
        },
      })

      if (yesterdayGuide?.mood_after === 'high') {
        body = 'You felt great yesterday! Start today with that energy.'
      } else if (yesterdayGuide?.journal_win) {
        body = 'You learned something yesterday. Build on it today.'
      } else if (yesterdayGuide?.morning_prime_done) {
        body = 'You showed up yesterday. Keep the momentum going!'
      }
    } catch {
      // Fall back to default
    }

    const result = await sendPushToUser(user_id, 'morning_reminder', { body })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Morning reminders: ${totalSent} sent, ${totalFailed} failed`)
}

/**
 * Send streak at risk notifications to users who haven't completed today's flow
 * Personalized with their current streak count
 */
export async function sendStreakAtRiskReminders(): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find users with active streaks who haven't been active today
  const atRiskUsers = await prisma.userPreferences.findMany({
    where: {
      current_streak: { gt: 0 },
      OR: [
        { last_active_date: { lt: today } },
        { last_active_date: null },
      ],
    },
    select: {
      user_id: true,
      current_streak: true,
    },
  })

  let totalSent = 0
  let totalFailed = 0

  for (const user of atRiskUsers) {
    const body = `You're on a ${user.current_streak}-day streak! Don't break it.`
    const result = await sendPushToUser(user.user_id, 'streak_at_risk', { body })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Streak reminders: ${totalSent} sent, ${totalFailed} failed`)
}

/**
 * Send personalized weekly review notifications
 * Includes stats from the past 7 days
 */
export async function sendWeeklyReviewReminders(): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { user_id: true },
    distinct: ['user_id'],
  })

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  weekAgo.setHours(0, 0, 0, 0)

  let totalSent = 0
  let totalFailed = 0

  for (const { user_id } of subscriptions) {
    let body = 'See how your week went and celebrate your wins'
    try {
      const weekGuides = await prisma.dailyGuide.findMany({
        where: {
          user_id,
          date: { gte: weekAgo },
        },
        select: {
          morning_prime_done: true,
        },
      })

      const completedDays = weekGuides.filter(g => g.morning_prime_done).length
      if (completedDays > 0) {
        body = `You completed ${completedDays}/7 days this week. See your review!`
      }
    } catch {
      // Fall back to default
    }

    const result = await sendPushToUser(user_id, 'weekly_review', { body })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Weekly review reminders: ${totalSent} sent, ${totalFailed} failed`)
}

/**
 * Send weekly insights based on 14 days of mood data
 * Calculates mood improvement on days with morning flow vs without
 */
export async function sendWeeklyInsights(): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { user_id: true },
    distinct: ['user_id'],
  })

  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  twoWeeksAgo.setHours(0, 0, 0, 0)

  let totalSent = 0
  let totalFailed = 0

  const moodOrder: Record<string, number> = { low: 1, medium: 2, high: 3 }

  for (const { user_id } of subscriptions) {
    let body = 'See how your habits are impacting your wellbeing'
    try {
      const guides = await prisma.dailyGuide.findMany({
        where: {
          user_id,
          date: { gte: twoWeeksAgo },
        },
        select: {
          morning_prime_done: true,
          mood_before: true,
          mood_after: true,
        },
      })

      // Calculate mood improvement with vs without morning flow
      let flowDaysMoodDelta = 0
      let flowDaysCount = 0
      let noFlowDaysMoodDelta = 0
      let noFlowDaysCount = 0

      for (const guide of guides) {
        if (guide.mood_before && guide.mood_after) {
          const before = moodOrder[guide.mood_before]
          const after = moodOrder[guide.mood_after]
          // Skip entries with unrecognized mood values
          if (before === undefined || after === undefined) continue
          const delta = after - before

          if (guide.morning_prime_done) {
            flowDaysMoodDelta += delta
            flowDaysCount++
          } else {
            noFlowDaysMoodDelta += delta
            noFlowDaysCount++
          }
        }
      }

      if (flowDaysCount >= 3 && noFlowDaysCount >= 1) {
        const avgFlowDelta = flowDaysMoodDelta / flowDaysCount
        const avgNoFlowDelta = noFlowDaysCount > 0 ? noFlowDaysMoodDelta / noFlowDaysCount : 0
        const improvement = avgFlowDelta - avgNoFlowDelta

        if (improvement > 0) {
          const percent = Math.round(improvement * 100 / 3) // Normalize to percentage of scale
          body = `Your mood is ${percent}% better on days you do the morning flow.`
        } else {
          body = `You've tracked ${guides.length} days. Keep going to unlock deeper insights.`
        }
      } else if (guides.length > 0) {
        body = `You've logged ${guides.length} days in 2 weeks. More data = better insights!`
      }
    } catch {
      // Fall back to default
    }

    const result = await sendPushToUser(user_id, 'insight', { body })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Weekly insights: ${totalSent} sent, ${totalFailed} failed`)
}

/**
 * Send daily quote notifications to all subscribed users
 * Same quote for everyone (deterministic by day of year)
 */
export async function sendDailyQuotes(): Promise<void> {
  const quote = getDayOfYearQuote()
  const body = `"${quote.text}" — ${quote.author}`

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { daily_quote_alerts: true },
    select: { user_id: true },
    distinct: ['user_id'],
  })

  let totalSent = 0
  let totalFailed = 0

  for (const { user_id } of subscriptions) {
    const result = await sendPushToUser(user_id, 'daily_quote', { body })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Daily quotes: ${totalSent} sent, ${totalFailed} failed`)
}

/**
 * Send personalized daily affirmation notifications
 * Generates AI affirmation via Groq and caches on DailyGuide
 */
export async function sendDailyAffirmations(): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { daily_affirmation_alerts: true },
    select: { user_id: true },
    distinct: ['user_id'],
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalSent = 0
  let totalFailed = 0

  for (const { user_id } of subscriptions) {
    try {
      // Check for cached affirmation
      const guide = await prisma.dailyGuide.findUnique({
        where: { user_id_date: { user_id, date: today } },
        select: {
          ai_affirmation: true,
          day_type: true,
          energy_level: true,
          mood_before: true,
        },
      })

      let affirmation = guide?.ai_affirmation

      if (!affirmation) {
        // Generate new affirmation via Groq
        const context = [
          guide?.day_type ? `Day type: ${guide.day_type}` : null,
          guide?.energy_level ? `Energy: ${guide.energy_level}` : null,
          guide?.mood_before ? `Current mood: ${guide.mood_before}` : null,
        ].filter(Boolean).join('. ')

        const completion = await getGroq().chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a personal wellness coach. Generate a single, short, powerful daily affirmation (1-2 sentences max). It should be personal ("I am...", "I choose...", "Today I..."), warm, and actionable. No quotes, no attribution. ${context ? `Context: ${context}` : ''}`,
            },
            {
              role: 'user',
              content: 'Generate my daily affirmation.',
            },
          ],
          max_tokens: 60,
          temperature: 0.8,
        })

        affirmation = completion.choices[0]?.message?.content?.trim() || 'I am capable, I am growing, and today matters.'

        // Cache on DailyGuide
        await prisma.dailyGuide.upsert({
          where: { user_id_date: { user_id, date: today } },
          update: { ai_affirmation: affirmation },
          create: {
            user_id,
            date: today,
            day_type: 'work',
            ai_affirmation: affirmation,
          },
        })
      }

      const result = await sendPushToUser(user_id, 'daily_affirmation', { body: affirmation })
      totalSent += result.sent
      totalFailed += result.failed
    } catch (error) {
      console.error(`Failed to send affirmation to user ${user_id}:`, error)
      totalFailed++
    }
  }

  console.log(`Daily affirmations: ${totalSent} sent, ${totalFailed} failed`)
}

/**
 * Send motivational nudge notifications based on user's streak and activity
 * Contextual midday encouragement
 */
export async function sendMotivationalNudges(): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { motivational_nudge_alerts: true },
    select: { user_id: true },
    distinct: ['user_id'],
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalSent = 0
  let totalFailed = 0

  for (const { user_id } of subscriptions) {
    let body = "A 2-minute check-in can shift your whole day. Ready?"

    try {
      // Check streak and today's activity
      const [prefs, todayGuide] = await Promise.all([
        prisma.userPreferences.findUnique({
          where: { user_id },
          select: { current_streak: true },
        }),
        prisma.dailyGuide.findUnique({
          where: { user_id_date: { user_id, date: today } },
          select: { morning_prime_done: true },
        }),
      ])

      if (prefs?.current_streak && prefs.current_streak > 1) {
        body = `You're on a ${prefs.current_streak}-day streak! Keep the momentum going.`
      } else if (todayGuide?.morning_prime_done) {
        body = "Great morning flow today! How are you feeling this afternoon?"
      }
    } catch {
      // Fall back to default
    }

    const result = await sendPushToUser(user_id, 'motivational_nudge', { body })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Motivational nudges: ${totalSent} sent, ${totalFailed} failed`)
}
