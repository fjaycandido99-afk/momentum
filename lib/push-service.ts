/**
 * Push Notification Delivery Service
 * Handles sending notifications to web push and native platforms
 */

import webPush from 'web-push'
import { prisma } from './prisma'
import { sendAPNsNotification, isAPNsConfigured } from './apns'
import { sendFCMNotification, isFCMConfigured } from './fcm'
import { getDayOfYearQuote } from './quotes'
import { getDailyMindsetQuote } from '@/lib/mindset/quotes'
import type { MindsetId } from '@/lib/mindset/types'
import { getDateString } from '@/lib/daily-guide/day-type'
import { getGroq, GROQ_MODEL } from './groq'
import { MINDSET_JOURNAL_PROMPTS } from '@/lib/mindset/journal-prompts'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { pickExercise } from '@/lib/exercises/select'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import { getDailyAffirmation } from '@/lib/mindset/affirmations'
import { getCoachName, MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { getJourney } from '@/lib/journey'
import { isPremiumUser } from './subscription-check'
import { isLocalHour } from './timezone-utils'
import { loadState, localDay } from '@/lib/assessment/service'
import { MIN_ANSWERS_FOR_READ } from '@/lib/assessment/axes'
import { eraDayNumber } from '@/lib/era/logic'
import { isDueOn, nightNudge } from '@/lib/practices/logic'
import { findIntervention, interventionPush } from '@/lib/practices/intervention'
import { parsePlan, planFor, slotForToday } from '@/lib/practices/plan'
import { loadEraToday } from '@/lib/era/service'
import { eraQuote } from '@/lib/era/content'
import { programFor } from '@/lib/era/programs'
import { isInWakeWindow, localMinutes, parseWakeTime } from '@/lib/era/wake'
import { comebackDue, comebackMessage, completionMessage } from '@/lib/era/nudges'
import { eraName } from '@/lib/era/presets'
import { loadWakeCall } from '@/lib/era/wake-server'

// Notification types that can be sent
import { shouldSendNotification, logNotificationSent } from './notification-gate'

export type NotificationType =
  | 'morning_reminder'
  | 'checkpoint'
  | 'evening_reminder'
  | 'bedtime_reminder'
  | 'streak_at_risk'
  | 'weekly_review'
  | 'insight'
  | 'daily_quote'
  | 'daily_affirmation'
  | 'motivational_nudge'
  | 'daily_motivation'
  | 'midday_reset'
  | 'wind_down'

  | 'coach_checkin'
  | 'coach_accountability'
  | 'win_back'
  | 'feature_discovery'
  | 'daily_read'
  | 'era_checkin'
  // "You said thirty minutes. Did it happen?" — one ask, late, only when a
  // practice that was due today has no answer (lib/practices).
  | 'practice_checkin'
  // The morning heads-up on a weekday they have a real history of missing.
  // Offers the floor; never warns.
  | 'practice_heads_up'
  | 'exercise_nudge'
  | 'era_wake'
  | 'era_join'
  | 'era_complete'
  | 'era_comeback'
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
  win_back: {
    title: 'Your space is still here',
    body: 'A quiet moment is waiting whenever you are.',
    tag: 'win_back',
  },
  feature_discovery: {
    title: 'Something new to try',
    body: 'There\'s a corner of Voxu you haven\'t explored yet.',
    tag: 'feature_discovery',
  },
  morning_reminder: {
    title: 'Good Morning!',
    body: 'Start your day with your morning flow',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'morning-reminder',
    actions: [
      { action: 'open', title: 'Start Flow' },
      { action: 'dismiss', title: 'Later' },
    ],
  },
  midday_reset: {
    title: 'Midday Reset',
    body: 'Two minutes to recharge, affirm and refocus.',
    icon: '/icon-192.png',
    badge: '/apple-touch-icon.png',
    tag: 'midday-reset',
    actions: [
      { action: 'open', title: 'Play' },
      { action: 'dismiss', title: 'Later' },
    ],
  },
  wind_down: {
    title: 'Wind Down',
    body: 'Close the day out before it closes you out.',
    icon: '/icon-192.png',
    badge: '/apple-touch-icon.png',
    tag: 'wind-down',
    actions: [
      { action: 'open', title: 'Play' },
      { action: 'dismiss', title: 'Later' },
    ],
  },
  checkpoint: {
    title: 'Checkpoint Time',
    body: 'Take a moment to check in with yourself',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'checkpoint',
    actions: [
      { action: 'open', title: 'Check In' },
      { action: 'dismiss', title: 'Skip' },
    ],
  },
  evening_reminder: {
    title: 'Evening Wind Down',
    body: 'Time to close out your day and reflect',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'evening-reminder',
    actions: [
      { action: 'open', title: 'Day Close' },
      { action: 'dismiss', title: 'Later' },
    ],
  },
  bedtime_reminder: {
    title: 'Time for Rest',
    body: 'Get 8 hours of sleep for a great tomorrow',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'bedtime-reminder',
    actions: [
      { action: 'dismiss', title: 'Got it' },
    ],
  },
  streak_at_risk: {
    title: 'Keep Your Streak!',
    body: "Don't break your streak - complete today's flow",
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'streak-risk',
    actions: [
      { action: 'open', title: 'Continue' },
    ],
  },
  weekly_review: {
    title: 'Weekly Review Ready',
    body: 'See how your week went and celebrate your wins',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'weekly-review',
    actions: [
      { action: 'open', title: 'View Review' },
    ],
  },
  insight: {
    title: 'Weekly Insight',
    body: 'See how your habits are impacting your wellbeing',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'weekly-insight',
    actions: [
      { action: 'open', title: 'View Insight' },
    ],
  },
  daily_quote: {
    title: 'Daily Quote',
    body: 'Your daily dose of inspiration',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'daily-quote',
    actions: [
      { action: 'open', title: 'Read More' },
    ],
  },
  daily_affirmation: {
    title: 'Daily Affirmation',
    body: 'Your personalized affirmation is ready',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'daily-affirmation',
    actions: [
      { action: 'open', title: 'View' },
    ],
  },
  practice_heads_up: {
    title: 'Today might be a hard one',
    body: 'The minimum still counts.',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'practice-heads-up',
    actions: [
      { action: 'open', title: 'See it' },
    ],
  },
  exercise_nudge: {
    // Overridden per send with the actual exercise and its length — this is
    // the fallback if a pick ever fails, and it still says something true.
    title: 'Two minutes, if you have them',
    body: 'Your one exercise for today is waiting.',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'exercise-nudge',
    actions: [
      { action: 'open', title: 'Do it' },
    ],
  },
  practice_checkin: {
    title: 'Did it happen?',
    body: 'One tap on the practice you set.',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'practice-checkin',
    actions: [
      { action: 'open', title: 'Answer' },
    ],
  },
  era_checkin: {
    title: 'Did you keep your promise?',
    body: 'One tap to check in.',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'era-checkin',
    actions: [
      { action: 'open', title: 'Check in' },
    ],
  },
  era_complete: {
    title: 'You finished it',
    body: 'Thirty days of promises. See what they added up to.',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'era-complete',
    actions: [
      { action: 'open', title: 'See it' },
    ],
  },
  era_comeback: {
    title: 'Your era is still open',
    body: 'Make today’s promise small enough that you keep it.',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'era-comeback',
    actions: [
      { action: 'open', title: 'Open Voxu' },
    ],
  },
  era_join: {
    title: 'Someone joined your era',
    body: 'They started day 1 from your link.',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'era-join',
    actions: [
      { action: 'open', title: 'See' },
    ],
  },
  era_wake: {
    title: 'Get up.',
    body: 'Your coach left you a wake-up call.',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'era-wake',
    actions: [
      { action: 'open', title: 'Listen' },
    ],
  },
  daily_read: {
    title: 'Daily Read',
    body: 'One question, one tap — it builds a picture of how you tick.',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'daily-read',
    actions: [
      { action: 'open', title: 'Answer' },
      { action: 'dismiss', title: 'Later' },
    ],
  },
  motivational_nudge: {
    title: 'Midday Check-In',
    body: 'A quick moment of encouragement',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'motivational-nudge',
    actions: [
      { action: 'open', title: 'Open' },
    ],
  },
  daily_motivation: {
    title: "Today's Motivation",
    body: 'Fresh motivation videos are ready for you',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'daily-motivation',
    actions: [
      { action: 'open', title: 'Watch Now' },
      { action: 'dismiss', title: 'Later' },
    ],
  },
coach_checkin: {
    title: 'Coach Check-In',
    body: 'Your coach has a midday message for you',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'coach-checkin',
    actions: [
      { action: 'open', title: 'Open Coach' },
      { action: 'dismiss', title: 'Later' },
    ],
  },
  coach_accountability: {
    title: 'Evening Accountability',
    body: 'Time to review your goals and commitments',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
    tag: 'coach-accountability',
    actions: [
      { action: 'open', title: 'Review Goals' },
      { action: 'dismiss', title: 'Later' },
    ],
  },
  custom: {
    title: 'Voxu',
    body: 'You have a new notification',
    icon: '/icon-192.svg',
    badge: '/apple-touch-icon.png',
  },
}

// Initialize web push with VAPID keys.
// Must never throw — if the keys are malformed, web push is disabled but
// native (APNs/FCM) push must still work. A bad VAPID key used to take down
// the entire pipeline: setVapidDetails threw → sendPushToUser died → iOS
// pushes silently dropped despite APNs being perfectly configured.
function initWebPush(): boolean {
  const rawPub = process.env.VAPID_PUBLIC_KEY
  const rawPriv = process.env.VAPID_PRIVATE_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://voxu.app'

  if (!rawPub || !rawPriv) {
    console.warn('[Web push] VAPID keys not configured — web push disabled (native unaffected).')
    return false
  }

  // web-push requires URL-safe base64 WITHOUT padding. Sanitize any common
  // pasting mistakes (= padding, + and / from standard base64).
  const sanitize = (s: string) => s.trim().replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  try {
    webPush.setVapidDetails(
      `mailto:support@${new URL(appUrl).hostname}`,
      sanitize(rawPub),
      sanitize(rawPriv),
    )
    return true
  } catch (e) {
    console.error('[Web push] VAPID setup failed — web push disabled, native push continues:', (e as Error).message)
    return false
  }
}

/**
 * Send a push notification to a specific user
 */
// Default deep-link per type — points each push at its most relevant screen
// instead of the home feed. A per-send customPayload.data.url still overrides.
// Exported so a gate test can assert every one of these is a real page:
// nothing else checks, and a push that opens a 404 looks like the app
// being broken rather than the URL being wrong.
export const DEFAULT_URL_BY_TYPE: Record<NotificationType, string> = {
  // ?session= so the card that opens is the one the notification was about.
  // Without it /daily-guide picks a segment from the clock, so a Midday
  // Reset push opened at 6pm landed on Wind Down.
  morning_reminder: '/?session=morning_prime',
  checkpoint: '/',
  evening_reminder: '/?session=wind_down',
  bedtime_reminder: '/?session=bedtime_story',
  midday_reset: '/?session=midday_reset',
  wind_down: '/?session=wind_down',
  streak_at_risk: '/',
  weekly_review: '/journal?review=1',
  insight: '/journal?review=1',
  daily_quote: '/',
  daily_affirmation: '/?session=morning_prime',
  daily_read: '/',
  era_checkin: '/',
  practice_checkin: '/training',
  practice_heads_up: '/training',
  exercise_nudge: '/training',
  era_wake: '/era/wake',
  era_join: '/',
  era_complete: '/',
  era_comeback: '/',
  motivational_nudge: '/',
  daily_motivation: '/',
  coach_checkin: '/coach',
  coach_accountability: '/coach',
  win_back: '/',
  feature_discovery: '/',
  custom: '/',
}

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
    bedtime_reminder: 'evening_reminder', // Uses evening_reminder preference
    streak_at_risk: 'streak_alerts',
    win_back: 'streak_alerts',
    feature_discovery: 'motivational_nudge_alerts',
    weekly_review: 'weekly_review',
    insight: 'insight_alerts',
    midday_reset: 'checkpoint_alerts', // segment nudges ride the checkpoint pref
    wind_down: 'checkpoint_alerts',
    daily_quote: 'daily_quote_alerts',
    daily_affirmation: 'daily_affirmation_alerts',
    motivational_nudge: 'motivational_nudge_alerts',
    daily_read: 'motivational_nudge_alerts',
    // Rides the evening preference: it is the evening check-in, and a new
    // PushSubscription column would need a migration for no extra control.
    era_checkin: 'evening_reminder',
    // The same evening switch as the era check-in: the same kind of ask, at
    // the same end of the day, and a new column would buy no extra control.
    practice_checkin: 'evening_reminder',
    // A morning message, so it rides the morning switch — somebody who
    // turned mornings off should not get one.
    practice_heads_up: 'morning_reminder',
    // Content WE chose to send, so it rides the nudge switch rather than a
    // time the user set — somebody who turned nudges off gets none.
    exercise_nudge: 'motivational_nudge_alerts',
    // Listed for the type map only: the wake-up call has its own switch
    // (UserPreferences.wake_call_enabled) and skips this filter below.
    era_wake: 'morning_reminder',
    era_join: 'motivational_nudge_alerts',
    // Finishing is the loudest moment in the loop — it rides the streak
    // preference, the one people keep on for things they earned.
    era_complete: 'streak_alerts',
    era_comeback: 'streak_alerts',
    daily_motivation: 'daily_motivation_alerts',
coach_checkin: 'coach_checkin_alerts',
    coach_accountability: 'coach_accountability_alerts',
    custom: 'morning_reminder', // Custom always sends
  }

  const prefKey = notificationPreferenceMap[type]

  // Filter subscriptions that have this notification type enabled
  // The wake-up call is something the user switched on and gave a time to,
  // on its own control; a morning-reminder toggle mustn't silently veto it.
  const enabledSubscriptions = type === 'custom' || type === 'era_wake'
    ? subscriptions
    : subscriptions.filter(sub => sub[prefKey] === true)

  if (enabledSubscriptions.length === 0) {
    return { success: false, sent: 0, failed: 0 }
  }

  // Send gate — quiet hours, dedupe, and a daily cap so a user is never
  // bombarded across the 12 notification types (high-priority bypasses cap).
  const gate = await shouldSendNotification(userId, type)
  if (!gate.allow) {
    return { success: false, sent: 0, failed: 0 }
  }

  // Build notification payload
  const template = NOTIFICATION_TEMPLATES[type]
  const payload: NotificationPayload = {
    ...template,
    ...customPayload,
    data: {
      type,
      url: DEFAULT_URL_BY_TYPE[type] || '/',
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

  // Record the send so the gate can throttle subsequent pushes today.
  if (sent > 0) await logNotificationSent(userId, type)

  return {
    success: sent > 0,
    sent,
    failed,
  }
}

/**
 * Filter user IDs to only those whose local time matches the target hour.
 * Uses timezone from UserPreferences. Falls back to UTC if not set.
 */
async function filterUsersByLocalHour(userIds: string[], targetHour: number): Promise<string[]> {
  if (userIds.length === 0) return []

  const prefs = await prisma.userPreferences.findMany({
    where: { user_id: { in: userIds } },
    select: { user_id: true, timezone: true },
  })

  const tzMap = new Map(prefs.map(p => [p.user_id, p.timezone]))

  return userIds.filter(uid => {
    const tz = tzMap.get(uid) || null
    return isLocalHour(tz, targetHour)
  })
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
 * Send personalized morning reminders to users
 * Respects user's daily_reminder and reminder_time preferences
 * Should be called hourly to match user-specific reminder times
 */
export async function sendMorningReminders(): Promise<void> {
  // Find users who have daily_reminder enabled
  const usersToNotify = await prisma.userPreferences.findMany({
    where: {
      daily_reminder: true,
    },
    select: {
      user_id: true,
      reminder_time: true,
      timezone: true,
      wake_call_enabled: true,
    },
  })

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  let totalSent = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (const { user_id, reminder_time, timezone, wake_call_enabled } of usersToNotify) {
    // Parse reminder_time (format: "HH:MM")
    const [reminderHour] = (reminder_time || '07:00').split(':').map(Number)

    // Check if user's LOCAL hour matches their reminder hour
    if (!isLocalHour(timezone, reminderHour)) {
      totalSkipped++
      continue
    }

    // Check if user has push subscription
    const hasSubscription = await prisma.pushSubscription.findFirst({
      where: { user_id },
      select: { id: true },
    })

    if (!hasSubscription) {
      totalSkipped++
      continue
    }

    // Someone in an era gets their era's morning instead: the promise is the
    // morning ritual now, and this is the push that asks for it. Same time,
    // same preference, same lane — just about the thing they chose.
    try {
      const era = await loadEraToday(user_id)
      if (era && (era.step === 'promise' || era.step === 'check_yesterday')) {
        // Their wake-up call asks for the promise already (sendEraWakeCalls);
        // a second push saying the same thing in text is just noise.
        if (wake_call_enabled) {
          totalSkipped++
          continue
        }
        const body = era.step === 'check_yesterday'
          ? "Did you keep yesterday's promise? Then make today's."
          : era.mission
            ? `What are you promising yourself today? Today's mission: ${era.mission}`
            : 'What are you promising yourself today?'
        const result = await sendPushToUser(user_id, 'morning_reminder', {
          title: `${era.title} · Day ${era.day}`,
          body,
          data: { type: 'morning_reminder', url: '/' },
        })
        totalSent += result.sent
        totalFailed += result.failed
        continue
      }

      // Today's promise already exists — often written the night before, for
      // a morning too busy to decide anything. Asking "what are you
      // promising?" would be asking for something they already gave.
      if (era && era.step === 'check' && era.today) {
        const promise = era.today.text.length > 90 ? `${era.today.text.slice(0, 87)}…` : era.today.text
        const result = await sendPushToUser(user_id, 'morning_reminder', {
          title: `${era.title} · Day ${era.day}`,
          body: `"${promise}" — that's today. Go keep it.`,
          data: { type: 'morning_reminder', url: '/' },
        })
        totalSent += result.sent
        totalFailed += result.failed
        continue
      }
    } catch {
      // Fall through to the regular morning reminder.
    }

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

  console.log(`Morning reminders: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped (wrong time or no subscription)`)
}

/**
 * Send bedtime reminders to users
 * Respects user's bedtime_reminder_enabled and wake_time preferences
 * Bedtime is calculated as 8 hours before wake_time
 * Should be called hourly to match user-specific bedtime
 */
export async function sendBedtimeReminders(): Promise<void> {
  // Find users who have bedtime_reminder_enabled
  const usersToNotify = await prisma.userPreferences.findMany({
    where: {
      bedtime_reminder_enabled: true,
    },
    select: {
      user_id: true,
      wake_time: true,
      bedtime_reminder_time: true,
      timezone: true,
    },
  })

  let totalSent = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (const { user_id, wake_time, bedtime_reminder_time, timezone } of usersToNotify) {
    const [wakeHour] = (wake_time || '07:00').split(':').map(Number)

    // An explicit bedtime the user set wins. Otherwise keep the original
    // derivation (wake time minus 8h) so nobody's existing reminder moves
    // just because this setting appeared.
    let bedtimeHour: number
    if (bedtime_reminder_time) {
      const [h] = bedtime_reminder_time.split(':').map(Number)
      bedtimeHour = Number.isFinite(h) ? h : 23
    } else {
      bedtimeHour = wakeHour - 8
      if (bedtimeHour < 0) bedtimeHour += 24
    }

    // Check if user's LOCAL hour matches their bedtime hour
    if (!isLocalHour(timezone, bedtimeHour)) {
      totalSkipped++
      continue
    }

    // Check if user has push subscription
    const hasSubscription = await prisma.pushSubscription.findFirst({
      where: { user_id },
      select: { id: true },
    })

    if (!hasSubscription) {
      totalSkipped++
      continue
    }

    // Format wake time for display
    const wakeHourDisplay = wakeHour % 12 || 12
    const wakePeriod = wakeHour >= 12 ? 'PM' : 'AM'
    const body = `Wind down for bed. 8 hours of sleep means waking refreshed at ${wakeHourDisplay}:00 ${wakePeriod}.`

    const result = await sendPushToUser(user_id, 'bedtime_reminder', { body })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Bedtime reminders: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped (wrong time or no subscription)`)
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
      mindset: true,
    },
  })

  // Filter to users whose local time is 8 PM
  const allUserIds = atRiskUsers.map(u => u.user_id)
  const eligibleUserIds = await filterUsersByLocalHour(allUserIds, 20)
  const eligibleSet = new Set(eligibleUserIds)

  let totalSent = 0
  let totalFailed = 0

  for (const user of atRiskUsers) {
    if (!eligibleSet.has(user.user_id)) continue

    // Frame it as the journey arc (matches the Progress page), not a bare count.
    const mindset = (user.mindset as MindsetId) || undefined
    const j = getJourney(mindset, mindset ? MINDSET_CONFIGS[mindset]?.name : undefined, user.current_streak)
    let body = `Day ${user.current_streak} · ${j.stage}. Keep it alive — even one small moment tonight counts.`
    if (j.nextStage && j.daysToNext != null && j.daysToNext <= 2) {
      body = `Day ${user.current_streak} — you're ${j.daysToNext === 1 ? '1 day' : `${j.daysToNext} days`} from ${j.nextStage}. Don't stop now.`
    }

    const result = await sendPushToUser(user.user_id, 'streak_at_risk', {
      title: 'Your streak is at risk',
      body,
      data: { type: 'streak_at_risk', url: '/progress' },
    })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Streak reminders: ${totalSent} sent, ${totalFailed} failed (journey-framed)`)
}

/**
 * Send personalized weekly review notifications
 * Includes stats from the past 7 days
 */
// Win-back ladder — re-engage lapsed users at day 3 / 7 / 14 / 30 of absence.
// Warm, escalating, no-guilt copy; each rung fires once (keyed off the exact
// number of days since last_active_date). Delivered ~6pm local via
// filterUsersByLocalHour; the send gate handles quiet hours + dedupe, and
// win_back is high-priority so the daily cap won't suppress it. Run hourly
// (the function self-filters to the user's local hour).
const WIN_BACK_RUNGS: Record<number, { title: string; body: string; url: string }> = {
  3: { title: 'Your streak is paused, not gone', body: 'A 2-minute reset is all it takes to pick back up.', url: '/' },
  7: { title: 'Your spot is still here', body: 'One small win today? Start with a quick Morning Prime.', url: '/' },
  14: { title: 'Your mind deserves a moment', body: 'Come breathe with us — even a minute counts.', url: '/' },
  30: { title: "Still here whenever you're ready", body: 'Your space is exactly as you left it.', url: '/' },
}

export async function sendWinBackReminders(): Promise<void> {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const oldest = new Date(now - 31 * dayMs)
  const newest = new Date(now - 3 * dayMs)

  const lapsed = await prisma.userPreferences.findMany({
    where: { last_active_date: { gte: oldest, lte: newest } },
    select: { user_id: true, last_active_date: true },
  })

  // Deliver around 6pm local — same pattern the other timed sends use.
  const eligible = new Set(await filterUsersByLocalHour(lapsed.map(u => u.user_id), 18))

  let totalSent = 0
  let totalFailed = 0
  let matched = 0

  for (const u of lapsed) {
    if (!eligible.has(u.user_id) || !u.last_active_date) continue
    const daysSince = Math.floor((now - u.last_active_date.getTime()) / dayMs)
    const rung = WIN_BACK_RUNGS[daysSince]
    if (!rung) continue // only fire ON a rung day (3 / 7 / 14 / 30)
    matched++
    const result = await sendPushToUser(u.user_id, 'win_back', {
      title: rung.title,
      body: rung.body,
      data: { type: 'win_back', url: rung.url },
    })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Win-back: ${matched} on a rung, ${totalSent} sent, ${totalFailed} failed`)
}

// Feature-discovery pushes — the outside-app twin of the in-app Discover
// spotlight. For ACTIVE users (engaged in the last 7 days; lapsed users get
// win-back instead), surface ONE feature they haven't used yet, at most once
// a week. Low-priority (yields to everything via the gate). The weekly cadence
// is enforced from the send log, so this only runs once db:push exists — it
// fails CLOSED rather than risk spamming without cadence control.
const DISCOVERY_COOLDOWN_DAYS = 7
const DISCOVERY_FEATURES: Array<{ feature: string; title: string; body: string; url: string }> = [
  { feature: 'coach', title: 'Meet your AI Coach', body: 'Personalized check-ins to keep you on track. Say hello.', url: '/coach' },
  { feature: 'journal', title: 'Try journaling', body: 'Reflect in seconds — guided, free, or just chat it out.', url: '/journal' },
  { feature: 'soundscapes', title: 'Mix a soundscape', body: 'Layer ambient sounds for deep focus and calm.', url: '/' },
  { feature: 'guided', title: 'A voice-led session', body: 'Breathing and focus sessions, guided start to finish.', url: '/' },
  { feature: 'saved_content', title: 'Save what resonates', body: 'Keep your favorite quotes & reflections in one place.', url: '/saved' },
  { feature: 'music', title: 'Focus music', body: 'Set the mood with lo-fi, piano, ambient and more.', url: '/' },
]

export async function sendFeatureDiscovery(): Promise<void> {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  // Active users only (engaged in the last 7 days).
  const active = await prisma.userPreferences.findMany({
    where: { last_active_date: { gte: new Date(now - 7 * dayMs) } },
    select: { user_id: true },
  })
  if (active.length === 0) return

  // Deliver around noon local.
  const eligibleHourIds = await filterUsersByLocalHour(active.map(u => u.user_id), 12)
  if (eligibleHourIds.length === 0) return

  // Weekly cadence — exclude anyone nudged within the cooldown. Needs the send
  // log; if it's unavailable (pre-db:push) SKIP entirely rather than spam.
  let recentlyNudged: Set<string>
  try {
    const recent = await prisma.notificationSendLog.findMany({
      where: {
        user_id: { in: eligibleHourIds },
        type: 'feature_discovery',
        sent_at: { gte: new Date(now - DISCOVERY_COOLDOWN_DAYS * dayMs) },
      },
      select: { user_id: true },
    })
    recentlyNudged = new Set(recent.map(r => r.user_id))
  } catch {
    return // no send log yet — don't run without cadence control
  }

  const candidates = eligibleHourIds.filter(id => !recentlyNudged.has(id))
  if (candidates.length === 0) return

  // What each candidate has already used.
  const events = await prisma.featureEvent.findMany({
    where: { user_id: { in: candidates } },
    select: { user_id: true, feature: true },
  })
  const usedByUser = new Map<string, Set<string>>()
  for (const e of events) {
    if (!usedByUser.has(e.user_id)) usedByUser.set(e.user_id, new Set())
    usedByUser.get(e.user_id)!.add(e.feature)
  }

  let totalSent = 0
  let totalFailed = 0

  for (const userId of candidates) {
    const used = usedByUser.get(userId) || new Set<string>()
    const unused = DISCOVERY_FEATURES.filter(f => !used.has(f.feature))
    if (unused.length === 0) continue // tried everything — nothing to promote
    // Stable within a day, varies by user.
    const pick = unused[(Math.floor(now / dayMs) + userId.length) % unused.length]
    const result = await sendPushToUser(userId, 'feature_discovery', {
      title: pick.title,
      body: pick.body,
      data: { type: 'feature_discovery', url: pick.url },
    })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Feature discovery: ${candidates.length} candidates, ${totalSent} sent, ${totalFailed} failed`)
}

export async function sendWeeklyReviewReminders(): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { user_id: true },
    distinct: ['user_id'],
  })

  // Filter to users whose local time is 10 AM (Sunday morning review)
  const allUserIds = subscriptions.map(s => s.user_id)
  const eligibleUserIds = await filterUsersByLocalHour(allUserIds, 10)
  const eligibleSet = new Set(eligibleUserIds)

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  weekAgo.setHours(0, 0, 0, 0)

  let totalSent = 0
  let totalFailed = 0

  for (const { user_id } of subscriptions) {
    if (!eligibleSet.has(user_id)) continue
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

  // Filter to users whose local time is 12 PM (midday Wednesday insight)
  const allUserIds = subscriptions.map(s => s.user_id)
  const eligibleUserIds = await filterUsersByLocalHour(allUserIds, 12)
  const eligibleSet = new Set(eligibleUserIds)

  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  twoWeeksAgo.setHours(0, 0, 0, 0)

  let totalSent = 0
  let totalFailed = 0

  const moodOrder: Record<string, number> = { low: 1, medium: 2, high: 3 }

  for (const { user_id } of subscriptions) {
    if (!eligibleSet.has(user_id)) continue
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
// The user's local date ("YYYY-MM-DD") for a given moment, matching
// getDateString's format so the push lines up with the in-app selection.
function localDateForTz(tz: string | null, date: Date = new Date()): string {
  try {
    if (tz) return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  } catch { /* bad tz — fall through */ }
  return getDateString(date)
}

// Moods (from the in-app mood pickers) that warrant a gentle "fresh start" nudge.
const LOW_MOODS = new Set(['awful', 'low'])

// Build a continuity nudge from yesterday's entry — the "coach remembers you"
// follow-up, delivered as the morning push. Returns null when there's nothing
// to follow up on, so the caller falls back to the daily quote.
function buildYesterdayNudge(guide: {
  daily_intention?: string | null
  journal_intention?: string | null
  journal_mood?: string | null
} | null): { title: string; body: string } | null {
  if (!guide) return null

  const intention = (guide.daily_intention || guide.journal_intention || '').trim()
  if (intention) {
    const short = intention.length > 70 ? intention.slice(0, 67).trimEnd() + '…' : intention
    return { title: 'Yesterday’s intention', body: `You set out to “${short}.” How did it go?` }
  }

  if (guide.journal_mood && LOW_MOODS.has(guide.journal_mood)) {
    return { title: 'A fresh start', body: 'Yesterday felt heavy. Two minutes to reset and start today clear?' }
  }

  // Deliberately NO generic "you reflected yesterday" tier any more.
  //
  // It used to return "Pick up where you left off" for anyone who had
  // written anything at all, and since this nudge takes priority over the
  // daily quote, the effect was backwards: the more someone journalled,
  // the less often they ever saw a quote. The most engaged users got
  // boilerplate and everyone else got the real thing.
  //
  // The two tiers above stay because they are genuinely better than a
  // quote — they reference the user's own intention or a hard day. A
  // generic prompt is not, so it now falls through and the quote wins.
  return null
}

export async function sendDailyQuotes(): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { daily_quote_alerts: true },
    select: { user_id: true },
    distinct: ['user_id'],
  })

  // Filter to users whose local time is 8 AM
  const allUserIds = subscriptions.map(s => s.user_id)
  const eligibleUserIds = await filterUsersByLocalHour(allUserIds, 8)
  if (eligibleUserIds.length === 0) return

  // Per-user mindset + timezone so the pushed quote matches their in-app one.
  const prefs = await prisma.userPreferences.findMany({
    where: { user_id: { in: eligibleUserIds } },
    select: { user_id: true, mindset: true, timezone: true },
  })
  const prefMap = new Map(prefs.map(p => [p.user_id, p]))

  let totalSent = 0
  let totalFailed = 0

  // Pull yesterday's entry per user for the "coach remembers you" follow-up.
  type YesterdayGuide = NonNullable<Parameters<typeof buildYesterdayNudge>[0]>
  const yMap = new Map<string, YesterdayGuide>()
  await Promise.all(eligibleUserIds.map(async (user_id) => {
    const tz = prefMap.get(user_id)?.timezone || null
    const yDate = localDateForTz(tz, new Date(Date.now() - 86400000))
    try {
      const guide = await prisma.dailyGuide.findUnique({
        where: { user_id_date: { user_id, date: yDate } },
        // Only what the nudge still reads. This used to also pull
        // journal_freetext (up to 5,000 chars) plus four more text columns
        // for every user in the 8am window, to decide something it no
        // longer decides — a lot of egress for nothing.
        select: {
          daily_intention: true, journal_intention: true, journal_mood: true,
        },
      })
      if (guide) yMap.set(user_id, guide)
    } catch { /* no yesterday entry — falls back to the quote */ }
  }))

  // Anyone in an era gets the era-themed quote — the same one home shows
  // (lib/era/content eraQuote), so the push and the app still agree.
  const activeEras = await prisma.era.findMany({
    where: { user_id: { in: eligibleUserIds }, status: 'active' },
    select: { user_id: true, era_key: true },
  })
  const eraKeyByUser = new Map(activeEras.map(e => [e.user_id, e.era_key]))

  let nudged = 0
  for (const user_id of eligibleUserIds) {
    const p = prefMap.get(user_id)

    // Lead with a continuity follow-up; fall back to the daily quote.
    const nudge = buildYesterdayNudge(yMap.get(user_id) || null)
    let payload: { title?: string; body: string }
    if (nudge) {
      payload = { title: nudge.title, body: nudge.body }
      nudged++
    } else {
      const dateStr = localDateForTz(p?.timezone || null)
      const eraKey = eraKeyByUser.get(user_id)
      const quote = eraQuote(
        (p?.mindset as MindsetId) || 'stoic',
        dateStr,
        eraKey ? programFor(eraKey).quoteCategories : undefined,
      ) || getDayOfYearQuote()
      payload = { body: `"${quote.text}" — ${quote.author}` }
    }

    // daily_quote already deep-links to '/' (home), where the follow-up card lives.
    const result = await sendPushToUser(user_id, 'daily_quote', payload)
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Daily quotes: ${totalSent} sent, ${totalFailed} failed (${eligibleUserIds.length} in 8AM window; ${nudged} continuity follow-ups)`)
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

  // Filter to users whose local time is 7 AM
  const allUserIds = subscriptions.map(s => s.user_id)
  const eligibleUserIds = await filterUsersByLocalHour(allUserIds, 7)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalSent = 0
  let totalFailed = 0

  const todayStr = today.toISOString().split('T')[0]

  for (const user_id of eligibleUserIds) {
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
        const mindset = await getUserMindset(user_id)

        // Try AI generation with mindset injection
        try {
          const context = [
            guide?.day_type ? `Day type: ${guide.day_type}` : null,
            guide?.energy_level ? `Energy: ${guide.energy_level}` : null,
            guide?.mood_before ? `Current mood: ${guide.mood_before}` : null,
          ].filter(Boolean).join('. ')

          const basePrompt = `You are a personal wellness coach. Generate a single, short, powerful daily affirmation (1-2 sentences max). It should be personal ("I am...", "I choose...", "Today I..."), warm, and actionable. No quotes, no attribution. ${context ? `Context: ${context}` : ''}`

          const completion = await getGroq('lib').chat.completions.create({
            model: GROQ_MODEL,
            messages: [
              { role: 'system', content: buildMindsetSystemPrompt(basePrompt, mindset) },
              { role: 'user', content: 'Generate my daily affirmation.' },
            ],
            max_tokens: 60,
            temperature: 0.8,
          })

          affirmation = completion.choices[0]?.message?.content?.trim()
        } catch {
          // AI failed, fall through to static pool
        }

        // Fallback: path-based static affirmation
        if (!affirmation) {
          affirmation = getDailyAffirmation(mindset, todayStr)
        }

        // Cache on DailyGuide
        await prisma.dailyGuide.upsert({
          where: { user_id_date: { user_id, date: today } },
          update: { ai_affirmation: affirmation },
          create: { user_id, date: today, day_type: 'work', ai_affirmation: affirmation },
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

  console.log(`Daily affirmations: ${totalSent} sent, ${totalFailed} failed (${eligibleUserIds.length}/${allUserIds.length} in 7AM window)`)
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

  // Filter to users whose local time is 2 PM
  const allUserIds = subscriptions.map(s => s.user_id)
  const eligibleUserIds = await filterUsersByLocalHour(allUserIds, 14)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalSent = 0
  let totalFailed = 0

  for (const user_id of eligibleUserIds) {
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

// Topic names and taglines for motivation notifications
const MOTIVATION_TOPICS = ['Discipline', 'Focus', 'Mindset', 'Courage', 'Resilience', 'Hustle', 'Confidence']
const MOTIVATION_TAGLINES: Record<string, string> = {
  Discipline: 'Master yourself first',
  Focus: 'Eliminate distractions',
  Mindset: 'Your thoughts shape reality',
  Courage: 'Face your fears',
  Resilience: 'You are unbreakable',
  Hustle: 'Outwork everyone',
  Confidence: 'Believe in yourself',
}

/**
 * Send daily motivation topic notifications
 * Features today's rotating topic with personalized context
 */
export async function sendDailyMotivation(): Promise<void> {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
  const todayTopic = MOTIVATION_TOPICS[dayOfYear % MOTIVATION_TOPICS.length]
  const tagline = MOTIVATION_TAGLINES[todayTopic] || ''

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { daily_motivation_alerts: true },
    select: { user_id: true },
    distinct: ['user_id'],
  })

  // Filter to users whose local time is 9 AM
  const allUserIds = subscriptions.map(s => s.user_id)
  const eligibleUserIds = await filterUsersByLocalHour(allUserIds, 9)

  let totalSent = 0
  let totalFailed = 0

  for (const user_id of eligibleUserIds) {
    let body = `Today's theme: ${todayTopic}. ${tagline}. New videos waiting for you.`

    try {
      // Check if user has watched motivation recently for personalization
      const prefs = await prisma.userPreferences.findUnique({
        where: { user_id },
        select: { current_streak: true },
      })

      if (prefs?.current_streak && prefs.current_streak > 2) {
        body = `${todayTopic}: ${tagline}. Keep your ${prefs.current_streak}-day streak fueled.`
      }
    } catch {
      // Fall back to default
    }

    const result = await sendPushToUser(user_id, 'daily_motivation', {
      title: `${todayTopic} Day`,
      body,
      data: { type: 'daily_motivation', url: '/' },
    })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Daily motivation: ${totalSent} sent, ${totalFailed} failed`)
}

/**
 * Send evening reminder notifications with mindset-specific journal prompts
 * Uses the evening_reminder preference (no new schema needed)
 */
/**
 * Users (of those given) who made an era promise today, in their own day.
 *
 * Their evening already has a push that is about THEM — the 8pm "did you
 * keep your promise?" — so the generic 9pm evening pushes stand down for
 * them. One evening touch that matters beats three that don't.
 */
async function usersWithEraPromiseToday(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set()
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000)
  const [rows, prefs] = await Promise.all([
    prisma.eraPromise.findMany({
      where: { user_id: { in: userIds }, created_at: { gte: since } },
      select: { user_id: true, local_day: true },
    }),
    prisma.userPreferences.findMany({
      where: { user_id: { in: userIds } },
      select: { user_id: true, timezone: true },
    }),
  ])
  const tzMap = new Map(prefs.map(p => [p.user_id, p.timezone]))
  return new Set(rows.filter(r => r.local_day === localDay(tzMap.get(r.user_id) ?? null)).map(r => r.user_id))
}

export async function sendEveningReminders(): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { evening_reminder: true },
    select: { user_id: true },
    distinct: ['user_id'],
  })

  // Filter to users whose local time is 9 PM
  const allUserIds = subscriptions.map(s => s.user_id)
  const eligibleUserIds = await filterUsersByLocalHour(allUserIds, 21)
  const eligibleSet = new Set(eligibleUserIds)
  // Anyone who made an era promise today already got their evening push.
  for (const id of await usersWithEraPromiseToday(eligibleUserIds)) eligibleSet.delete(id)

  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
  const promptKeys = ['prompt1', 'prompt2', 'prompt3'] as const
  const todayPromptKey = promptKeys[dayOfYear % promptKeys.length]

  let totalSent = 0
  let totalFailed = 0

  for (const { user_id } of subscriptions) {
    if (!eligibleSet.has(user_id)) continue
    let body = 'Time to close out your day and reflect'

    try {
      const prefs = await prisma.userPreferences.findUnique({
        where: { user_id },
        select: { mindset: true },
      })

      const mindset = (prefs?.mindset || 'stoic') as keyof typeof MINDSET_JOURNAL_PROMPTS
      const prompts = MINDSET_JOURNAL_PROMPTS[mindset]
      if (prompts) {
        const prompt = prompts[todayPromptKey]
        body = `Tonight's reflection: ${prompt.label}`
      }
    } catch {
      // Fall back to default
    }

    const result = await sendPushToUser(user_id, 'evening_reminder', {
      body,
      data: { type: 'evening_reminder', url: '/journal' },
    })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Evening reminders: ${totalSent} sent, ${totalFailed} failed`)
}

/**
 * Send midday coach check-in notifications to premium users
 * Personalized with mindset coach character, references morning activity and streak
 */
export async function sendCoachCheckins(): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { coach_checkin_alerts: true },
    select: { user_id: true },
    distinct: ['user_id'],
  })

  // Filter to users whose local time is 3 PM
  const allUserIds = subscriptions.map(s => s.user_id)
  const eligibleUserIds = await filterUsersByLocalHour(allUserIds, 15)
  const eligibleSet = new Set(eligibleUserIds)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalSent = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (const { user_id } of subscriptions) {
    if (!eligibleSet.has(user_id)) continue
    // Coach notifications are premium-only
    const premium = await isPremiumUser(user_id)
    if (!premium) {
      totalSkipped++
      continue
    }

    const mindset = await getUserMindset(user_id)
    const coachName = getCoachName(mindset)
    let body = `${coachName} here — how's your day going so far?`

    try {
      const [todayGuide, prefs] = await Promise.all([
        prisma.dailyGuide.findUnique({
          where: { user_id_date: { user_id, date: today } },
          select: { morning_prime_done: true, mood_before: true, energy_level: true },
        }),
        prisma.userPreferences.findUnique({
          where: { user_id },
          select: { current_streak: true },
        }),
      ])

      const topGoal = await prisma.goal.findFirst({
        where: { user_id, status: 'active' },
        select: { title: true, current_count: true, target_count: true },
        orderBy: { updated_at: 'desc' },
      })

      if (todayGuide?.morning_prime_done && prefs?.current_streak && prefs.current_streak > 1) {
        body = `${coachName}: Great morning flow! You're on a ${prefs.current_streak}-day streak. How's the rest of your day shaping up?`
      } else if (todayGuide?.morning_prime_done) {
        body = `${coachName}: You started strong this morning. How are you feeling now?`
      } else if (prefs?.current_streak && prefs.current_streak > 2) {
        body = `${coachName}: ${prefs.current_streak}-day streak going strong. Check in when you're ready.`
      }

      if (topGoal) {
        const progress = topGoal.target_count > 0 ? Math.round((topGoal.current_count / topGoal.target_count) * 100) : 0
        if (progress >= 80) {
          body = `${coachName}: You're ${progress}% through "${topGoal.title}" — the finish line is close!`
        }
      }
    } catch {
      // Fall back to default
    }

    const result = await sendPushToUser(user_id, 'coach_checkin', {
      title: `${coachName} — Midday Check-In`,
      body,
      data: { type: 'coach_checkin', url: '/coach' },
    })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Coach check-ins: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped (not premium)`)
}

/**
 * Send evening coach accountability notifications to premium users
 * Only targets users with active goals or streaks, personalized per mindset
 */
export async function sendCoachAccountability(): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { coach_accountability_alerts: true },
    select: { user_id: true },
    distinct: ['user_id'],
  })

  // Filter to users whose local time is 9 PM
  const allUserIds = subscriptions.map(s => s.user_id)
  const eligibleUserIds = await filterUsersByLocalHour(allUserIds, 21)
  const eligibleSet = new Set(eligibleUserIds)
  // The era check-in at 8pm is this same "how did today go" for anyone who
  // made a promise — don't ask twice in an hour.
  for (const id of await usersWithEraPromiseToday(eligibleUserIds)) eligibleSet.delete(id)

  let totalSent = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (const { user_id } of subscriptions) {
    if (!eligibleSet.has(user_id)) continue
    // Coach notifications are premium-only
    const premium = await isPremiumUser(user_id)
    if (!premium) {
      totalSkipped++
      continue
    }

    // Only send to users with active goals or streaks
    const [goals, prefs] = await Promise.all([
      prisma.goal.findMany({
        where: { user_id, status: 'active' },
        select: { title: true, current_count: true, target_count: true, updated_at: true },
        take: 5,
      }),
      prisma.userPreferences.findUnique({
        where: { user_id },
        select: { current_streak: true },
      }),
    ])

    if (goals.length === 0 && (!prefs?.current_streak || prefs.current_streak === 0)) {
      totalSkipped++
      continue
    }

    const mindset = await getUserMindset(user_id)
    const coachName = getCoachName(mindset)
    let body = `${coachName}: Time for your evening review. How did today go?`

    try {
      // Find stalling or near-complete goals
      const stallingGoals = goals.filter(g => {
        const daysSince = Math.floor((Date.now() - new Date(g.updated_at).getTime()) / (1000 * 60 * 60 * 24))
        return daysSince >= 5
      })
      const nearCompleteGoals = goals.filter(g => {
        const progress = g.target_count > 0 ? (g.current_count / g.target_count) * 100 : 0
        return progress >= 80
      })

      if (nearCompleteGoals.length > 0) {
        const goal = nearCompleteGoals[0]
        const progress = Math.round((goal.current_count / goal.target_count) * 100)
        body = `${coachName}: "${goal.title}" is at ${progress}%. One more push and you've done it!`
      } else if (stallingGoals.length > 0) {
        body = `${coachName}: "${stallingGoals[0].title}" hasn't moved in a while. What's one small step you could take?`
      } else if (prefs?.current_streak && prefs.current_streak > 3) {
        body = `${coachName}: ${prefs.current_streak} days strong. Let's keep the momentum — quick check-in?`
      }
    } catch {
      // Fall back to default
    }

    const result = await sendPushToUser(user_id, 'coach_accountability', {
      title: `${coachName} — Evening Review`,
      body,
      data: { type: 'coach_accountability', url: '/coach' },
    })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`Coach accountability: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped (not premium or no goals/streak)`)
}

/**
 * Midday Reset and Wind Down reminders.
 *
 * These two segments previously had NO notification at all — a user only
 * found them by happening to open the app inside the right window, which
 * meant two of the four daily segments were effectively invisible.
 *
 * They ride the existing `checkpoint_alerts` preference rather than
 * introducing new columns (bedtime_reminder already reuses
 * evening_reminder the same way), so this needs no migration and honours
 * a choice users have already made about segment nudges.
 *
 * Both deep-link to their own card via DEFAULT_URL_BY_TYPE. Neither
 * autoplays: the notification opens the segment with Play ready, because
 * a phone that starts talking on its own in a meeting is worse than one
 * extra tap.
 */
async function sendSegmentReminder(
  type: 'midday_reset' | 'wind_down',
  defaultHour: number
): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { checkpoint_alerts: true },
    select: { user_id: true },
    distinct: ['user_id'],
  })
  const subscribed = subscriptions.map(s => s.user_id)
  if (subscribed.length === 0) return

  // Each user picks their own hour (Settings → Daily Guide Reminders).
  // defaultHour is only the fallback for anyone who has never set one —
  // firing everyone at a time this code chose is exactly what the
  // setting exists to stop.
  const enabledField = type === 'midday_reset' ? 'midday_reminder_enabled' : 'winddown_reminder_enabled'
  const timeField = type === 'midday_reset' ? 'midday_reminder_time' : 'winddown_reminder_time'

  const prefs = await prisma.userPreferences.findMany({
    where: { user_id: { in: subscribed }, [enabledField]: true },
    select: { user_id: true, timezone: true, [timeField]: true },
  })

  const eligibleUserIds = prefs
    .filter(p => {
      const raw = (p as Record<string, unknown>)[timeField]
      const [hour] = String(raw || `${String(defaultHour).padStart(2, '0')}:00`).split(':').map(Number)
      return isLocalHour(p.timezone, Number.isFinite(hour) ? hour : defaultHour)
    })
    .map(p => p.user_id)

  if (eligibleUserIds.length === 0) return

  // Don't nudge someone toward a segment they've already finished today.
  //
  // "Today" has to be resolved per user, not from the server clock: these
  // users were selected because it is 13:00 or 19:00 where THEY are, and
  // at those hours a chunk of them are on a different calendar date to
  // the server. Using the server's date would check the wrong day's row
  // and re-nudge people who already finished.
  const doneField = type === 'midday_reset' ? 'midday_reset_done' : 'wind_down_done'
  const tzRows = await prisma.userPreferences.findMany({
    where: { user_id: { in: eligibleUserIds } },
    select: { user_id: true, timezone: true },
  })
  const localDate = new Map(tzRows.map(r => [r.user_id, localDateForTz(r.timezone)]))

  const alreadyDone = await prisma.dailyGuide.findMany({
    where: {
      [doneField]: true,
      OR: eligibleUserIds.map(user_id => ({
        user_id,
        date: localDate.get(user_id) ?? localDateForTz(null),
      })),
    },
    select: { user_id: true },
  })
  const skip = new Set(alreadyDone.map(g => g.user_id))

  let totalSent = 0
  let totalFailed = 0

  for (const user_id of eligibleUserIds) {
    if (skip.has(user_id)) continue
    const result = await sendPushToUser(user_id, type)
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`${type}: ${totalSent} sent, ${totalFailed} failed (${eligibleUserIds.length} in window, ${skip.size} already done)`)
}

export async function sendMiddayResets(): Promise<void> {
  await sendSegmentReminder('midday_reset', 13)
}

export async function sendWindDowns(): Promise<void> {
  await sendSegmentReminder('wind_down', 19)
}

/**
 * Daily Read nudge.
 *
 * Deliberately narrow. There are already a dozen notification types competing
 * for two opportunistic slots a day, and that competition is exactly what
 * starved the user's scheduled reminders for three weeks. So this one:
 *
 *   - only goes to people whose profile is still INCOMPLETE, and stops for
 *     good once they have a read — mirroring the hero card, which removes
 *     itself at the same moment;
 *   - skips anyone who already answered today, from either surface;
 *   - sits in the opportunistic lane, so it can never outrank a reminder
 *     someone actually set.
 *
 * It exists for the fortnight where the feature is asking for input and
 * cannot yet give anything back, and then it goes away.
 */
export async function sendDailyReadNudges(): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { motivational_nudge_alerts: true },
    select: { user_id: true },
    distinct: ['user_id'],
  })

  const eligibleUserIds = await filterUsersByLocalHour(
    subscriptions.map(s => s.user_id),
    19,
  )
  if (eligibleUserIds.length === 0) return

  let totalSent = 0
  let totalFailed = 0
  let skipped = 0

  for (const user_id of eligibleUserIds) {
    try {
      const prefs = await prisma.userPreferences.findUnique({
        where: { user_id },
        select: { timezone: true },
      })
      const state = await loadState(user_id, prefs?.timezone ?? null)

      // Has a read already, or has answered today — nothing to nudge about.
      if (state.read.lean !== null || state.answeredToday) {
        skipped++
        continue
      }

      const remaining = Math.max(0, MIN_ANSWERS_FOR_READ - state.read.answered)
      const body = state.read.answered === 0
        ? 'One question, one tap — it starts building a picture of how you tick.'
        : `${remaining} more answer${remaining === 1 ? '' : 's'} and your read can start telling you something.`

      const result = await sendPushToUser(user_id, 'daily_read', { body })
      totalSent += result.sent
      totalFailed += result.failed
    } catch {
      skipped++
    }
  }

  console.log(`daily_read: ${totalSent} sent, ${totalFailed} failed, ${skipped} skipped (${eligibleUserIds.length} in window)`)
}

/**
 * The era check-in: "Did you keep your promise?" at 8pm local.
 *
 * Sent ONLY to someone who made a promise today and hasn't answered it yet,
 * never as a generic "come back" push. That is what earns it the scheduled
 * lane in notification-gate: the user asked for this one by making the
 * promise.
 *
 * 8pm, not 9: it has to land before the 10pm quiet hours with room to act
 * on, and early enough that "I kept it" can still be true.
 */
export async function sendEraCheckins(): Promise<void> {
  // Candidates: unanswered promises from roughly the last day and a half.
  // Matching the user's own calendar day happens below, per timezone.
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000)
  const open = await prisma.eraPromise.findMany({
    where: { kept: null, created_at: { gte: since }, era: { status: 'active' } },
    select: {
      user_id: true,
      local_day: true,
      text: true,
      era: { select: { title: true, start_day: true, length_days: true } },
    },
  })
  if (open.length === 0) return

  const eligible = new Set(await filterUsersByLocalHour([...new Set(open.map(p => p.user_id))], 20))
  if (eligible.size === 0) return
  const tzs = await prisma.userPreferences.findMany({
    where: { user_id: { in: [...eligible] } },
    select: { user_id: true, timezone: true },
  })
  const tzMap = new Map(tzs.map(t => [t.user_id, t.timezone]))

  let totalSent = 0
  let totalFailed = 0
  let skipped = 0

  for (const p of open) {
    if (!eligible.has(p.user_id)) continue
    // Only TODAY's promise. An unanswered yesterday is asked on the home card
    // in the morning instead, where the answer can still be honest.
    if (p.local_day !== localDay(tzMap.get(p.user_id) ?? null)) {
      skipped++
      continue
    }

    const day = Math.min(eraDayNumber(p.era.start_day, p.local_day), p.era.length_days)
    const promise = p.text.length > 90 ? `${p.text.slice(0, 87)}…` : p.text

    const result = await sendPushToUser(p.user_id, 'era_checkin', {
      title: `${p.era.title} · Day ${day}`,
      body: `"${promise}" — did you keep it?`,
    })
    totalSent += result.sent
    totalFailed += result.failed
  }

  console.log(`era_checkin: ${totalSent} sent, ${totalFailed} failed, ${skipped} skipped (${eligible.size} in window)`)
}

/**
 * "You finished your era" — once, in the morning after the last day.
 *
 * Told once per ERA, stamped on the row (completed_notified_at): the send
 * gate only dedupes for 18 hours, so a finished era would otherwise be
 * announced again every morning it sat there.
 *
 * The stamp goes on only when a push actually went out. Someone with no
 * device yet gets told when they have one, instead of being marked as
 * informed by a notification that never left the building.
 */
export async function sendEraCompletions(): Promise<void> {
  const eras = await prisma.era.findMany({
    where: { status: 'active', completed_notified_at: null },
    select: { id: true, user_id: true, title: true, start_day: true, length_days: true },
  })
  if (eras.length === 0) return

  // 9am local: finishing something deserves the morning, not a 2am buzz.
  const eligible = new Set(await filterUsersByLocalHour(eras.map(e => e.user_id), 9))
  let sent = 0
  let candidates = 0

  for (const era of eras) {
    if (!eligible.has(era.user_id)) continue
    const tz = (await prisma.userPreferences.findUnique({
      where: { user_id: era.user_id }, select: { timezone: true },
    }))?.timezone ?? null
    // Finished means the last day has PASSED, not that it's day 30 today.
    if (eraDayNumber(era.start_day, localDay(tz)) <= era.length_days) continue
    candidates++

    const promises = await prisma.eraPromise.findMany({
      where: { era_id: era.id }, select: { kept: true },
    })
    const answered = promises.filter(p => p.kept !== null).length
    const kept = promises.filter(p => p.kept === true).length
    const premium = await isPremiumUser(era.user_id).catch(() => false)
    const message = completionMessage({
      eraName: eraName(era.title), lengthDays: era.length_days, kept, answered, premium,
    })

    const result = await sendPushToUser(era.user_id, 'era_complete', message)
    if (result.sent > 0) {
      sent += result.sent
      await prisma.era.update({ where: { id: era.id }, data: { completed_notified_at: new Date() } })
    }
  }

  console.log(`era_complete: ${sent} sent, ${candidates} finished eras in the window (${eras.length} unannounced)`)
}

/**
 * "Your era is still open" — after a few silent days, once a week at most,
 * and never for someone whose wake-up call already says it every morning
 * (lib/era/nudges comebackDue).
 */
export async function sendEraComebacks(): Promise<void> {
  const eras = await prisma.era.findMany({
    where: { status: 'active' },
    select: { id: true, user_id: true, title: true, start_day: true, length_days: true },
  })
  if (eras.length === 0) return

  // 10am local — after the morning push has had its chance.
  const eligible = new Set(await filterUsersByLocalHour(eras.map(e => e.user_id), 10))
  let sent = 0
  let due = 0

  for (const era of eras) {
    if (!eligible.has(era.user_id)) continue

    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: era.user_id },
      select: { timezone: true, wake_call_enabled: true },
    })
    const today = localDay(prefs?.timezone ?? null)
    const day = eraDayNumber(era.start_day, today)

    const last = await prisma.eraPromise.findFirst({
      where: { era_id: era.id },
      orderBy: { local_day: 'desc' },
      select: { local_day: true },
    })
    // No promise ever made: the morning push is already asking for the
    // first one, and "still open" would be a strange thing to say on day 2.
    if (!last) continue

    const lastNudge = await prisma.notificationSendLog.findFirst({
      where: { user_id: era.user_id, type: 'era_comeback' },
      orderBy: { sent_at: 'desc' },
      select: { sent_at: true },
    })

    const daysBetweenLocal = (from: string, to: string) => {
      const [ay, am, ad] = from.split('-').map(Number)
      const [by, bm, bd] = to.split('-').map(Number)
      return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
    }

    const ok = comebackDue({
      daysSinceLastPromise: daysBetweenLocal(last.local_day, today),
      daysSinceLastNudge: lastNudge
        ? Math.floor((Date.now() - lastNudge.sent_at.getTime()) / 86400000)
        : null,
      wakeCallEnabled: prefs?.wake_call_enabled ?? false,
      eraComplete: day > era.length_days,
    })
    if (!ok) continue
    due++

    const result = await sendPushToUser(era.user_id, 'era_comeback', comebackMessage({
      eraName: eraName(era.title),
      day: Math.min(day, era.length_days),
      lengthDays: era.length_days,
      daysSinceLastPromise: daysBetweenLocal(last.local_day, today),
    }))
    sent += result.sent
  }

  console.log(`era_comeback: ${sent} sent, ${due} due (${eras.length} active eras)`)
}

/**
 * The era wake-up call (lib/era/wake.ts): at the time the user chose, a push
 * from their coach — "Francis, get up." — that opens /era/wake, where the
 * coach says the rest out loud.
 *
 * Runs every five minutes, so it's cheap on purpose: one small read of the
 * users who switched it on, and nothing else unless someone's
 * wake time is in the window. The send gate's once-a-day dedupe stops a
 * second call inside the window. The voice is generated only when they tap,
 * never here.
 */
export async function sendEraWakeCalls(now: Date = new Date()): Promise<void> {
  const users = await prisma.userPreferences.findMany({
    where: { wake_call_enabled: true, wake_call_time: { not: null } },
    select: { user_id: true, wake_call_time: true, timezone: true },
  })

  let sent = 0
  let failed = 0
  let quiet = 0

  for (const u of users) {
    const wake = parseWakeTime(u.wake_call_time)
    if (wake === null || !isInWakeWindow(localMinutes(u.timezone, now), wake)) continue

    try {
      const { call, ring } = await loadWakeCall(u.user_id)
      // No era, a finished one, or already up and promised — stay quiet.
      if (!call || !ring) {
        quiet++
        continue
      }
      const result = await sendPushToUser(u.user_id, 'era_wake', {
        title: call.title,
        body: call.body,
        data: { type: 'era_wake', url: '/era/wake' },
      })
      sent += result.sent
      failed += result.failed
    } catch (err) {
      console.error('[era_wake] failed for a user:', err)
      failed++
    }
  }

  console.log(`era_wake: ${sent} sent, ${failed} failed, ${quiet} quiet (${users.length} with a call set)`)
}

/**
 * "You said thirty minutes. Did it happen?" — the night ask for a practice
 * that was due today and has no answer.
 *
 * 21:00 local, an hour after the era check-in, so the two never arrive
 * together. One push per person however many practices are open: three
 * notifications about three practices is how an app gets muted.
 *
 * It only ever asks about practices that were DUE today. A rest day is not
 * something to answer for, and being asked about one would teach people that
 * the schedule they set means nothing.
 */
export async function sendPracticeCheckins(): Promise<void> {
  const practices = await prisma.practice.findMany({
    where: { status: 'active' },
    select: { id: true, user_id: true, label: true, days: true, minimum: true },
  })
  if (practices.length === 0) return

  const eligible = new Set(await filterUsersByLocalHour([...new Set(practices.map(p => p.user_id))], 21))
  if (eligible.size === 0) return

  const tzs = await prisma.userPreferences.findMany({
    where: { user_id: { in: [...eligible] } },
    select: { user_id: true, timezone: true },
  })
  const tzMap = new Map(tzs.map(t => [t.user_id, t.timezone]))

  // Due today, in each person's own timezone.
  const dueByUser = new Map<string, typeof practices>()
  for (const p of practices) {
    if (!eligible.has(p.user_id)) continue
    const today = localDay(tzMap.get(p.user_id) ?? null)
    if (!isDueOn({ id: p.id, label: p.label, days: p.days, minimum: p.minimum }, today)) continue
    const list = dueByUser.get(p.user_id) ?? []
    list.push(p)
    dueByUser.set(p.user_id, list)
  }
  if (dueByUser.size === 0) return

  // One query for every answer already given today, rather than one per
  // practice: this runs hourly for everybody who has a practice.
  const answered = await prisma.practiceLog.findMany({
    where: {
      practice_id: { in: [...dueByUser.values()].flat().map(p => p.id) },
      local_day: { in: [...new Set([...dueByUser.keys()].map(u => localDay(tzMap.get(u) ?? null)))] },
    },
    select: { practice_id: true, local_day: true },
  })
  const answeredIds = new Set(answered.map(a => `${a.practice_id}:${a.local_day}`))

  let sent = 0
  let failed = 0
  let quiet = 0

  for (const [userId, list] of dueByUser) {
    const today = localDay(tzMap.get(userId) ?? null)
    const open = list.filter(p => !answeredIds.has(`${p.id}:${today}`))
    const nudge = nightNudge(open.map(p => ({ id: p.id, label: p.label, days: p.days, minimum: p.minimum })))
    if (!nudge) {
      quiet++
      continue
    }
    const result = await sendPushToUser(userId, 'practice_checkin', nudge)
    sent += result.sent
    failed += result.failed
  }

  console.log(`practice_checkin: ${sent} sent, ${failed} failed, ${quiet} already answered (${dueByUser.size} due)`)
}

/**
 * The morning heads-up: a pattern acted on before the day is spent.
 *
 * 9:00 local, and only for a practice that is due today on a weekday with
 * a real history of answered misses (lib/practices/intervention.ts). It
 * offers the floor — "Fridays are hard for you. 40 minutes counts today."
 * — and never warns, scolds or mentions a streak.
 *
 * One per person per morning however many practices qualify, because two
 * notifications about two hard days is how somebody turns them all off.
 * The evening check-in still happens separately: this is the ask BEFORE,
 * that one is the ask AFTER.
 */
export async function sendPracticeHeadsUps(): Promise<void> {
  const practices = await prisma.practice.findMany({
    where: { status: 'active' },
    select: { id: true, user_id: true, label: true, days: true, minimum: true, plan: true },
  })
  if (practices.length === 0) return

  const eligible = new Set(await filterUsersByLocalHour([...new Set(practices.map(p => p.user_id))], 9))
  if (eligible.size === 0) return

  const tzs = await prisma.userPreferences.findMany({
    where: { user_id: { in: [...eligible] } },
    select: { user_id: true, timezone: true },
  })
  const tzMap = new Map(tzs.map(t => [t.user_id, t.timezone]))

  const mine = practices.filter(p => eligible.has(p.user_id))
  // Ninety days of answers: the same window the Patterns block reads, so
  // the push can never claim a count the screen disagrees with.
  //
  // One window for everybody, measured from UTC with a day of slack. Using
  // the first user's timezone for the whole batch (as this did) is the kind
  // of thing that reads fine and is quietly wrong.
  const since = ninetyDaysBefore(new Date(Date.now() - 86400000).toISOString().slice(0, 10))
  const logs = await prisma.practiceLog.findMany({
    where: { practice_id: { in: mine.map(p => p.id) }, local_day: { gte: since } },
    select: { practice_id: true, local_day: true, done: true, minimum_only: true },
  })
  const byPractice = new Map<string, { day: string; done: boolean; minimumOnly: boolean }[]>()
  for (const log of logs) {
    const list = byPractice.get(log.practice_id) ?? []
    list.push({ day: log.local_day, done: log.done, minimumOnly: log.minimum_only })
    byPractice.set(log.practice_id, list)
  }

  const sentTo = new Set<string>()
  let sent = 0
  let failed = 0

  for (const practice of mine) {
    if (sentTo.has(practice.user_id)) continue
    const today = localDay(tzMap.get(practice.user_id) ?? null)
    const lite = {
      id: practice.id,
      label: practice.label,
      days: practice.days,
      minimum: practice.minimum,
    }
    const plan = parsePlan(practice.plan)
    const slot = slotForToday({ presetKey: '', days: practice.days }, today, 0)
    const minimum = planFor(plan, slot)?.minimum || practice.minimum

    const intervention = findIntervention(lite, byPractice.get(practice.id) ?? [], today, minimum)
    if (!intervention) continue

    const result = await sendPushToUser(
      practice.user_id,
      'practice_heads_up',
      interventionPush(practice.label, intervention),
    )
    sentTo.add(practice.user_id)
    sent += result.sent
    failed += result.failed
  }

  console.log(`practice_heads_up: ${sent} sent, ${failed} failed (${mine.length} practices in window)`)
}

/** Ninety days before a YYYY-MM-DD. */
function ninetyDaysBefore(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) - 90 * 86400000).toISOString().slice(0, 10)
}

/**
 * One nudge for today's mindset exercise, at 17:00 local.
 *
 * The exercise is the practice step of an era and the first thing /training
 * opens with — and until now it was the only part of the loop with no nudge
 * at all. Twenty-six notification types and not one of them mentioned it,
 * which is a plausible reason it had never been run.
 *
 * Four rules, all of them about not being a nuisance:
 *
 *  - Only for someone in an ACTIVE era. Outside an era there is no exercise
 *    to do, so there is nothing to say.
 *  - Never if they already did one today. Answered is answered; a reminder
 *    afterwards is just noise that teaches people to ignore the next one.
 *  - 17:00 local — after the working day, well before the era and practice
 *    check-ins at 20:00, so the evening does not arrive as a pile.
 *  - Opportunistic lane, so it shares the small daily allowance and can
 *    never starve a reminder the user set for themselves.
 *
 * It names the actual exercise and its length, because "do your exercise"
 * is a chore and "Two minutes: The One Task" is a decision someone can make
 * in the notification shade.
 */
export async function sendExerciseNudges(): Promise<void> {
  const eras = await prisma.era.findMany({
    where: { status: 'active' },
    select: { user_id: true, era_key: true, start_day: true, length_days: true },
  })
  if (eras.length === 0) return

  const eligible = new Set(await filterUsersByLocalHour(eras.map(e => e.user_id), 17))
  if (eligible.size === 0) return

  const mine = eras.filter(e => eligible.has(e.user_id))
  const tzs = await prisma.userPreferences.findMany({
    where: { user_id: { in: mine.map(e => e.user_id) } },
    select: { user_id: true, timezone: true },
  })
  const tzMap = new Map(tzs.map(t => [t.user_id, t.timezone]))

  // Recent runs, for two things at once: skipping anybody who has already
  // done today's, and telling the picker what not to repeat.
  const since = new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10)
  const runs = await prisma.exerciseRun.findMany({
    where: { user_id: { in: mine.map(e => e.user_id) }, local_day: { gte: since } },
    select: { user_id: true, exercise_id: true, local_day: true },
  })
  const runsByUser = new Map<string, { exerciseId: string; day: string }[]>()
  for (const run of runs) {
    const list = runsByUser.get(run.user_id) ?? []
    list.push({ exerciseId: run.exercise_id, day: run.local_day })
    runsByUser.set(run.user_id, list)
  }

  const sentTo = new Set<string>()
  let sent = 0
  let failed = 0
  let alreadyDone = 0

  for (const era of mine) {
    if (sentTo.has(era.user_id)) continue
    const today = localDay(tzMap.get(era.user_id) ?? null)
    const history = runsByUser.get(era.user_id) ?? []

    // Already did one today — including one they started. Nothing to say.
    if (history.some(r => r.day === today)) {
      alreadyDone++
      continue
    }

    const day = eraDayNumber(era.start_day, today)
    if (day < 1 || day > era.length_days) continue

    const pick = pickExercise({
      eraKey: era.era_key,
      day,
      lengthDays: era.length_days,
      recentIds: history.map(r => r.exerciseId),
    })
    if (!pick) continue

    const result = await sendPushToUser(era.user_id, 'exercise_nudge', {
      title: `${pick.exercise.minutes} min: ${pick.exercise.title}`,
      body: pick.exercise.why,
    })
    sentTo.add(era.user_id)
    sent += result.sent
    failed += result.failed
  }

  console.log(
    `exercise_nudge: ${sent} sent, ${failed} failed, ${alreadyDone} already done today ` +
      `(${mine.length} active eras in window)`,
  )
}
