'use client'

import { useEffect, useRef } from 'react'
import { isNativeApp, setupNativeNotificationListeners, subscribeToPush } from '@/lib/push-notifications'

/**
 * Initializes native push notifications on app startup.
 * - Registers for APNs token and sends it to the server
 * - Sets up foreground notification display and tap handling
 * - Only runs once, only in native app context (Capacitor)
 */
export function useNativePush() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    if (typeof window === 'undefined') return
    if (!isNativeApp()) return

    initialized.current = true

    // Set up notification listeners for foreground display and tap handling
    setupNativeNotificationListeners(
      (notification) => {
        console.log('[NativePush] Foreground notification:', notification.title)
      },
      (notification) => {
        console.log('[NativePush] Notification tapped:', notification.title)
        // Deep link handling could go here based on notification data
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

    return () => clearTimeout(timer)
  }, [])
}
