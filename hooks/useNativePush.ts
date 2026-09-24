'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { isNativeApp, setupNativeNotificationListeners, subscribeToPush } from '@/lib/push-notifications'
import { addNotificationTapListener } from '@/lib/notifications'
import { resolveNotificationRoute } from '@/lib/notifications/route'
import { trackFeature } from '@/lib/analytics/track'

/**
 * Initializes native push notifications on app startup.
 * - Registers for APNs token and sends it to the server
 * - Sets up foreground notification display and tap handling
 * - Routes to correct page when notification is tapped
 * - Only runs once, only in native app context (Capacitor)
 */
export function useNativePush() {
  const initialized = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (initialized.current) return
    if (typeof window === 'undefined') return
    if (!isNativeApp()) return

    initialized.current = true

    // Handle local notification taps (morning, evening, bedtime, etc.)
    const removeLocalListener = addNotificationTapListener((data) => {
      console.log('[NativePush] Local notification tapped:', data)
      // Resolved by the same function the push handler uses, so a local
      // notification and a server one can never follow different rules.
      router.push(resolveNotificationRoute(data.extra?.route))
    })

    // Handle push notification taps (server-sent)
    setupNativeNotificationListeners(
      (notification) => {
        console.log('[NativePush] Foreground notification:', notification.title)
      },
      (notification) => {
        console.log('[NativePush] Push notification tapped:', notification.title)
        const data = notification.data as Record<string, string> | undefined
        // The server sends `url` (lib/push-service DEFAULT_URL_BY_TYPE);
        // this only ever read `route`, so every server push tap opened home
        // — a Midday Reset push never opened Midday Reset. Same-app paths only.
        const target = data?.route || data?.url
        // Which pushes actually get opened — the only measure of whether a
        // notification did anything. The type travels in the payload.
        trackFeature('notification', 'open', typeof data?.type === 'string' ? data.type : 'unknown')
        router.push(resolveNotificationRoute(target))
      }
    )

    // Auto-register for push notifications
    // Small delay to let the app fully initialize
    const timer = setTimeout(async () => {
      try {
        await subscribeToPush()
        console.log('[NativePush] Push registration complete')
      } catch (error: any) {
        // Don't throw if user denied permission — that's expected
        if (error?.message?.includes('denied')) {
          console.log('[NativePush] User denied push permission')
        } else {
          console.error('[NativePush] Push registration failed:', error)
        }
      }
    }, 2000)

    return () => {
      clearTimeout(timer)
      removeLocalListener()
    }
  }, [])
}
