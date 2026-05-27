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
export function NativePushRegistrar() {
  useEffect(() => {
    if (!isNative) return
    let cancelled = false

    ;(async () => {
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
    })()

    return () => { cancelled = true }
  }, [])

  return null
}
