'use client'

import { useEffect } from 'react'
import { isNative, getPushTokenIfGranted, getNativePlatform } from '@/lib/notifications'

// Registers the native app's APNs/FCM push token with the server on startup, so
// server-sent pushes (daily quote, coach check-ins, win-back, insights, …) can
// actually reach the device. Without this, only on-device LOCAL reminders fire
// and everything server-pushed silently goes nowhere.
//
// Non-prompting: only registers when notification permission is ALREADY granted,
// so it never surfaces a permission prompt at launch. New opt-ins are handled in
// NotificationSettings (which prompts explicitly).
//
// Also responsible for badge management — when the user opens the app we
// consider every queued notification as "seen" and clear the iOS app-icon
// badge (the little red "1" on the home-screen icon). Without this, the
// badge accumulates as new pushes arrive and never goes away because
// nothing else in the app ever resets it. Runs on mount AND on every
// foreground resume so the badge clears whether the user cold-launches
// the app or swipes back to it from the app switcher.
export function NativePushRegistrar() {
  useEffect(() => {
    if (!isNative) return
    let cancelled = false
    let appListenerHandle: { remove: () => void } | null = null

    // Clear the iOS app-icon badge + sweep the notification tray. We do
    // BOTH push and local notifications because the iOS badge count is
    // the union of both delivery channels — clearing only push leaves
    // any local-reminder badges behind. Each plugin import is dynamic
    // so the web build never tries to bundle the native modules.
    const clearBadgeAndDelivered = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        await PushNotifications.removeAllDeliveredNotifications()
      } catch {
        /* push plugin unavailable or no permission yet — fine */
      }
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications')
        await LocalNotifications.removeAllDeliveredNotifications()
      } catch {
        /* local plugin unavailable — fine */
      }
    }

    ;(async () => {
      // First the work that was already here: register the device token.
      try {
        const token = await getPushTokenIfGranted()
        if (cancelled || !token) return
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nativeToken: token, platform: getNativePlatform() }),
        })
      } catch {
        /* best-effort — reminders still work via local notifications */
      }

      // Then clear the badge on launch.
      if (!cancelled) await clearBadgeAndDelivered()

      // And subscribe to foreground resume so we also clear when the
      // user comes back to the app from the switcher (the more common
      // case once the app has been opened once).
      try {
        const { App } = await import('@capacitor/app')
        const handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) void clearBadgeAndDelivered()
        })
        if (cancelled) handle.remove()
        else appListenerHandle = handle
      } catch {
        /* @capacitor/app unavailable — fine, mount-time clear still works */
      }
    })()

    return () => {
      cancelled = true
      appListenerHandle?.remove()
    }
  }, [])

  return null
}
