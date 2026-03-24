'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { isNativeApp, setupNativeNotificationListeners, subscribeToPush } from '@/lib/push-notifications'
import { addNotificationTapListener } from '@/lib/notifications'

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

    // Route map for notification tap deep links
    const routeMap: Record<string, string> = {
      '/guide': '/daily-guide',
      '/journal': '/journal',
      '/coach': '/coach',
      '/progress': '/progress',
    }

    // Handle local notification taps (morning, evening, bedtime, etc.)
    const removeLocalListener = addNotificationTapListener((data) => {
      console.log('[NativePush] Local notification tapped:', data)
      const route = data.extra?.route
      if (route) {
        router.push(routeMap[route] || route)
      }
    })

    // Handle push notification taps (server-sent)
    setupNativeNotificationListeners(
      (notification) => {
        console.log('[NativePush] Foreground notification:', notification.title)
      },
      (notification) => {
        console.log('[NativePush] Push notification tapped:', notification.title)
        const data = notification.data as Record<string, string> | undefined
        const route = data?.route
        if (route) {
          router.push(routeMap[route] || route)
        } else {
          // Default: open home
          router.push('/')
        }
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
