'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  isNative,
  initNotifications,
  registerNotificationActions,
  updateRemindersFromPreferences,
  addNotificationTapListener,
  addNotificationReceivedListener,
  cancelAllReminders,
  getPendingReminders,
  NOTIFICATION_ACTIONS,
} from '@/lib/notifications'

interface NotificationContextType {
  isEnabled: boolean
  permissionGranted: boolean
  pendingCount: number
  enableNotifications: () => Promise<boolean>
  disableNotifications: () => Promise<void>
  updateReminders: (preferences: {
    daily_reminder: boolean
    reminder_time: string
    work_end_time?: string
  }) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const router = useRouter()
  const [isEnabled, setIsEnabled] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // Initialize notifications on mount
  useEffect(() => {
    if (!isNative) return

    const init = async () => {
      // Initialize and check permissions
      const granted = await initNotifications()
      setPermissionGranted(granted)

      if (granted) {
        // Register action types
        await registerNotificationActions()
        setIsEnabled(true)

        // Get pending notification count
        const pending = await getPendingReminders()
        setPendingCount(pending.length)
      }
    }

    init()
  }, [])

  // Handle notification taps
  useEffect(() => {
    if (!isNative) return

    const removeListener = addNotificationTapListener(({ actionId, extra }) => {
      console.log('[NotificationProvider] Tap action:', actionId, extra)

      // Handle different actions
      switch (actionId) {
        case NOTIFICATION_ACTIONS.OPEN_GUIDE:
          // Navigate to guide and potentially trigger specific action
          if (extra?.route) {
            router.push(extra.route)
          } else {
            router.push('/guide')
          }
          break

        case NOTIFICATION_ACTIONS.OPEN_JOURNAL:
          router.push('/guide')
          // Could also trigger journal modal
          break

        case NOTIFICATION_ACTIONS.DISMISS:
          // User dismissed - no action needed
          break

        default:
          // Default tap action - open the app
          if (extra?.route) {
            router.push(extra.route)
          } else {
            router.push('/guide')
          }
      }
    })

    return removeListener
  }, [router])

  // Handle notifications received while app is open
  useEffect(() => {
    if (!isNative) return

    const removeListener = addNotificationReceivedListener(({ title, body }) => {
      console.log('[NotificationProvider] Received while open:', title, body)
      // Could show an in-app toast/banner here
    })

    return removeListener
  }, [])

  // Enable notifications
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    const granted = await initNotifications()
    setPermissionGranted(granted)

    if (granted) {
      await registerNotificationActions()
      setIsEnabled(true)
    }

    return granted
  }, [])

  // Disable notifications
  const disableNotifications = useCallback(async (): Promise<void> => {
    await cancelAllReminders()
    setIsEnabled(false)
    setPendingCount(0)
  }, [])

  // Update reminders from preferences
  const updateReminders = useCallback(async (preferences: {
    daily_reminder: boolean
    reminder_time: string
    work_end_time?: string
  }): Promise<void> => {
    await updateRemindersFromPreferences(preferences)

    // Update pending count
    const pending = await getPendingReminders()
    setPendingCount(pending.length)

    setIsEnabled(preferences.daily_reminder)
  }, [])

  const value: NotificationContextType = {
    isEnabled,
    permissionGranted,
    pendingCount,
    enableNotifications,
    disableNotifications,
    updateReminders,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export function useNotificationsOptional() {
  return useContext(NotificationContext)
}
