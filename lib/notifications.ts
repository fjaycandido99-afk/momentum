import { Capacitor } from '@capacitor/core'
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications'
import { PushNotifications } from '@capacitor/push-notifications'

// Check if running in native app
export const isNative = Capacitor.isNativePlatform()

// Notification IDs
export const NOTIFICATION_IDS = {
  MORNING_REMINDER: 1,
  EVENING_REMINDER: 2,
  CHECKPOINT_1: 3,
  CHECKPOINT_2: 4,
  CHECKPOINT_3: 5,
  STREAK_REMINDER: 6,
  WEEKLY_REVIEW: 7,
  BEDTIME_REMINDER: 8,
}

// Notification action types
export const NOTIFICATION_ACTIONS = {
  OPEN_GUIDE: 'OPEN_GUIDE',
  OPEN_JOURNAL: 'OPEN_JOURNAL',
  DISMISS: 'DISMISS',
}

interface ScheduleReminderOptions {
  id: number
  title: string
  body: string
  hour: number
  minute: number
  repeats?: boolean
  weekday?: number // 1 = Sunday, 7 = Saturday
  actionTypeId?: string
  extra?: Record<string, string>
}

// Initialize notifications - request permissions
export async function initNotifications(): Promise<boolean> {
  if (!isNative) {
    console.log('[Notifications] Not on native platform, skipping init')
    return false
  }

  try {
    // Check current permission status
    const permStatus = await LocalNotifications.checkPermissions()
    console.log('[Notifications] Current permission:', permStatus.display)

    if (permStatus.display === 'prompt' || permStatus.display === 'prompt-with-rationale') {
      // Request permission
      const result = await LocalNotifications.requestPermissions()
      console.log('[Notifications] Permission result:', result.display)
      return result.display === 'granted'
    }

    return permStatus.display === 'granted'
  } catch (error) {
    console.error('[Notifications] Init error:', error)
    return false
  }
}

// Register notification action types (for iOS action buttons)
export async function registerNotificationActions() {
  if (!isNative) return

  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'DAILY_REMINDER',
          actions: [
            {
              id: NOTIFICATION_ACTIONS.OPEN_GUIDE,
              title: 'Start Session',
            },
            {
              id: NOTIFICATION_ACTIONS.DISMISS,
              title: 'Later',
              destructive: true,
            },
          ],
        },
        {
          id: 'JOURNAL_REMINDER',
          actions: [
            {
              id: NOTIFICATION_ACTIONS.OPEN_JOURNAL,
              title: 'Write Journal',
            },
            {
              id: NOTIFICATION_ACTIONS.DISMISS,
              title: 'Skip',
              destructive: true,
            },
          ],
        },
      ],
    })
    console.log('[Notifications] Action types registered')
  } catch (error) {
    console.error('[Notifications] Action types error:', error)
  }
}

// Schedule a daily reminder
export async function scheduleReminder(options: ScheduleReminderOptions): Promise<boolean> {
  if (!isNative) {
    console.log('[Notifications] Not on native platform, skipping schedule')
    return false
  }

  try {
    const notification: ScheduleOptions = {
      notifications: [
        {
          id: options.id,
          title: options.title,
          body: options.body,
          schedule: {
            on: {
              hour: options.hour,
              minute: options.minute,
              ...(options.weekday && { weekday: options.weekday }),
            },
            repeats: options.repeats ?? true,
            allowWhileIdle: true,
          },
          sound: 'default',
          actionTypeId: options.actionTypeId || 'DAILY_REMINDER',
          extra: options.extra || {},
        },
      ],
    }

    await LocalNotifications.schedule(notification)
    console.log(`[Notifications] Scheduled: ${options.title} at ${options.hour}:${options.minute}`)
    return true
  } catch (error) {
    console.error('[Notifications] Schedule error:', error)
    return false
  }
}

// Schedule morning reminder
export async function scheduleMorningReminder(hour: number, minute: number): Promise<boolean> {
  return scheduleReminder({
    id: NOTIFICATION_IDS.MORNING_REMINDER,
    title: 'Good Morning! ☀️',
    body: 'Your daily guide is ready. Start your morning flow.',
    hour,
    minute,
    actionTypeId: 'DAILY_REMINDER',
    extra: { route: '/guide', action: 'morning' },
  })
}

// Schedule evening reminder
export async function scheduleEveningReminder(hour: number, minute: number): Promise<boolean> {
  return scheduleReminder({
    id: NOTIFICATION_IDS.EVENING_REMINDER,
    title: 'Time to Wind Down 🌙',
    body: 'Complete your day close and reflect on your wins.',
    hour,
    minute,
    actionTypeId: 'JOURNAL_REMINDER',
    extra: { route: '/guide', action: 'evening' },
  })
}

// Schedule checkpoint reminders
export async function scheduleCheckpointReminder(
  checkpointNumber: 1 | 2 | 3,
  hour: number,
  minute: number,
  label: string
): Promise<boolean> {
  const ids = {
    1: NOTIFICATION_IDS.CHECKPOINT_1,
    2: NOTIFICATION_IDS.CHECKPOINT_2,
    3: NOTIFICATION_IDS.CHECKPOINT_3,
  }

  return scheduleReminder({
    id: ids[checkpointNumber],
    title: `Checkpoint ${checkpointNumber} 📍`,
    body: label || 'Time for a quick check-in.',
    hour,
    minute,
    actionTypeId: 'DAILY_REMINDER',
    extra: { route: '/guide', action: `checkpoint_${checkpointNumber}` },
  })
}

// Schedule weekly review reminder (Sundays)
export async function scheduleWeeklyReviewReminder(hour: number, minute: number): Promise<boolean> {
  return scheduleReminder({
    id: NOTIFICATION_IDS.WEEKLY_REVIEW,
    title: 'Weekly Review 📊',
    body: 'Take a moment to reflect on your week.',
    hour,
    minute,
    weekday: 1, // Sunday
    actionTypeId: 'JOURNAL_REMINDER',
    extra: { route: '/guide', action: 'weekly_review' },
  })
}

// Schedule streak reminder (if user hasn't opened app today)
export async function scheduleStreakReminder(hour: number, minute: number): Promise<boolean> {
  return scheduleReminder({
    id: NOTIFICATION_IDS.STREAK_REMINDER,
    title: "Don't Break Your Streak! 🔥",
    body: 'Keep your momentum going. Open Voxu to continue your streak.',
    hour,
    minute,
    actionTypeId: 'DAILY_REMINDER',
    extra: { route: '/guide', action: 'streak' },
  })
}

// Schedule bedtime reminder (wake_time - 8 hours)
export async function scheduleBedtimeReminder(hour: number, minute: number): Promise<boolean> {
  return scheduleReminder({
    id: NOTIFICATION_IDS.BEDTIME_REMINDER,
    title: 'Time for Bed 🌙',
    body: 'Wind down for 8 hours of restful sleep.',
    hour,
    minute,
    actionTypeId: 'DAILY_REMINDER',
    extra: { route: '/guide', action: 'bedtime' },
  })
}

// Cancel a specific reminder
export async function cancelReminder(id: number): Promise<void> {
  if (!isNative) return

  try {
    await LocalNotifications.cancel({ notifications: [{ id }] })
    console.log(`[Notifications] Cancelled reminder: ${id}`)
  } catch (error) {
    console.error('[Notifications] Cancel error:', error)
  }
}

// Cancel all reminders
export async function cancelAllReminders(): Promise<void> {
  if (!isNative) return

  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications })
      console.log(`[Notifications] Cancelled all ${pending.notifications.length} reminders`)
    }
  } catch (error) {
    console.error('[Notifications] Cancel all error:', error)
  }
}

// Get all pending notifications
export async function getPendingReminders(): Promise<{ id: number; title?: string }[]> {
  if (!isNative) return []

  try {
    const pending = await LocalNotifications.getPending()
    return pending.notifications.map((n) => ({
      id: n.id,
      title: n.title,
    }))
  } catch (error) {
    console.error('[Notifications] Get pending error:', error)
    return []
  }
}

// Listen for notification taps
export function addNotificationTapListener(
  callback: (data: { id: number; actionId: string; extra?: Record<string, string> }) => void
): () => void {
  if (!isNative) return () => {}

  let listenerHandle: { remove: () => void } | null = null

  LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (notification) => {
      console.log('[Notifications] Action performed:', notification)
      callback({
        id: notification.notification.id,
        actionId: notification.actionId,
        extra: notification.notification.extra as Record<string, string> | undefined,
      })
    }
  ).then(handle => {
    listenerHandle = handle
  })

  return () => {
    listenerHandle?.remove()
  }
}

// Listen for notification received (while app is open)
export function addNotificationReceivedListener(
  callback: (data: { id: number; title?: string; body?: string }) => void
): () => void {
  if (!isNative) return () => {}

  let listenerHandle: { remove: () => void } | null = null

  LocalNotifications.addListener(
    'localNotificationReceived',
    (notification) => {
      console.log('[Notifications] Received:', notification)
      callback({
        id: notification.id,
        title: notification.title,
        body: notification.body,
      })
    }
  ).then(handle => {
    listenerHandle = handle
  })

  return () => {
    listenerHandle?.remove()
  }
}

// Smart reminders - update based on AI nudge patterns
export async function updateSmartReminders(nudgeType?: string): Promise<void> {
  if (!isNative) return

  // Reschedule streak reminder if streak is at risk
  if (nudgeType === 'streak_risk') {
    const now = new Date()
    let reminderHour = now.getHours() + 2
    if (reminderHour >= 22) reminderHour = 20
    await scheduleReminder({
      id: NOTIFICATION_IDS.STREAK_REMINDER,
      title: "Your streak is at risk!",
      body: "Open Voxu to keep your momentum going.",
      hour: reminderHour,
      minute: 0,
      repeats: false,
      actionTypeId: 'DAILY_REMINDER',
      extra: { route: '/guide', action: 'streak' },
    })
    console.log('[Notifications] Smart streak reminder scheduled')
  }
}

// Update reminders based on user preferences
export async function updateRemindersFromPreferences(preferences: {
  daily_reminder: boolean
  reminder_time: string // "HH:MM" format
  work_end_time?: string
  wake_time?: string
  bedtime_reminder_enabled?: boolean
}): Promise<void> {
  if (!isNative) return

  // Cancel existing reminders first
  await cancelAllReminders()

  if (!preferences.daily_reminder) {
    console.log('[Notifications] Reminders disabled by user')
    return
  }

  // Parse reminder time
  let [hour, minute] = preferences.reminder_time.split(':').map(Number)
  const reminderMinutes = hour * 60 + minute

  // Use wake_time + 15 minutes as a floor for the morning reminder
  // Don't schedule a morning reminder before the user is awake
  if (preferences.wake_time) {
    const [wakeHour, wakeMin] = preferences.wake_time.split(':').map(Number)
    const wakeFloorMinutes = (wakeHour * 60 + (wakeMin || 0)) + 15
    if (reminderMinutes < wakeFloorMinutes) {
      hour = Math.floor(wakeFloorMinutes / 60)
      minute = wakeFloorMinutes % 60
    }
  }

  // Schedule morning reminder
  await scheduleMorningReminder(hour, minute)

  // Schedule evening reminder (based on work end time or default to 6pm)
  if (preferences.work_end_time) {
    const [endHour, endMinute] = preferences.work_end_time.split(':').map(Number)
    // Schedule 30 minutes after work ends
    const eveningHour = endMinute >= 30 ? endHour + 1 : endHour
    const eveningMinute = (endMinute + 30) % 60
    await scheduleEveningReminder(eveningHour, eveningMinute)
  } else {
    await scheduleEveningReminder(18, 0) // Default 6pm
  }

  // Schedule weekly review for Sundays at 10am
  await scheduleWeeklyReviewReminder(10, 0)

  // Schedule bedtime reminder if enabled
  if (preferences.bedtime_reminder_enabled && preferences.wake_time) {
    const [wakeH, wakeM] = preferences.wake_time.split(':').map(Number)
    // Bedtime = wake_time - 8 hours
    let bedHour = wakeH - 8
    let bedMinute = wakeM || 0
    if (bedHour < 0) bedHour += 24
    await scheduleBedtimeReminder(bedHour, bedMinute)
  }

  console.log('[Notifications] Reminders updated from preferences')
}

// Initialize push notifications (for server-sent notifications)
export async function initPushNotifications(): Promise<string | null> {
  if (!isNative) return null

  try {
    // Request permission
    const permStatus = await PushNotifications.checkPermissions()

    if (permStatus.receive === 'prompt') {
      const result = await PushNotifications.requestPermissions()
      if (result.receive !== 'granted') {
        console.log('[PushNotifications] Permission denied')
        return null
      }
    }

    // Register with APNs/FCM
    await PushNotifications.register()

    // Get the token
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        console.log('[PushNotifications] Token:', token.value)
        resolve(token.value)
      })

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[PushNotifications] Registration error:', error)
        resolve(null)
      })
    })
  } catch (error) {
    console.error('[PushNotifications] Init error:', error)
    return null
  }
}

// Listen for push notification taps
export function addPushNotificationTapListener(
  callback: (data: { title?: string; body?: string; data?: Record<string, unknown> }) => void
): () => void {
  if (!isNative) return () => {}

  let listenerHandle: { remove: () => void } | null = null

  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (notification) => {
      console.log('[PushNotifications] Action performed:', notification)
      callback({
        title: notification.notification.title,
        body: notification.notification.body,
        data: notification.notification.data,
      })
    }
  ).then(handle => {
    listenerHandle = handle
  })

  return () => {
    listenerHandle?.remove()
  }
}
