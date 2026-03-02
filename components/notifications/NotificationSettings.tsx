'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2, Check, Sunrise, Moon, Sparkles, MessageCircle, Flame } from 'lucide-react'
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  registerServiceWorker,
  getPushSupportInfo,
} from '@/lib/push-notifications'
import {
  isNative as isNativePlatform,
  initNotifications,
  scheduleMorningReminder,
  scheduleEveningReminder,
  scheduleStreakReminder,
  scheduleWeeklyReviewReminder,
  cancelReminder,
  cancelAllReminders,
  getPendingReminders,
  NOTIFICATION_IDS,
} from '@/lib/notifications'

interface NotificationPreferences {
  morning_reminder: boolean
  checkpoint_alerts: boolean
  evening_reminder: boolean
  streak_alerts: boolean
  weekly_review: boolean
  insight_alerts: boolean
  daily_quote_alerts: boolean
  daily_affirmation_alerts: boolean
  motivational_nudge_alerts: boolean
  daily_motivation_alerts: boolean
  featured_music_alerts: boolean
  coach_checkin_alerts: boolean
  coach_accountability_alerts: boolean
}

// Grouped toggle definitions — each group controls multiple underlying preferences
const NOTIFICATION_GROUPS: {
  id: string
  icon: React.ElementType
  label: string
  description: string
  keys: (keyof NotificationPreferences)[]
}[] = [
  {
    id: 'daily_reminders',
    icon: Sunrise,
    label: 'Daily Reminders',
    description: 'Morning flow & evening wind down',
    keys: ['morning_reminder', 'evening_reminder', 'checkpoint_alerts'],
  },
  {
    id: 'daily_inspiration',
    icon: Sparkles,
    label: 'Daily Inspiration',
    description: 'Quotes, affirmations & motivation',
    keys: ['daily_quote_alerts', 'daily_affirmation_alerts', 'motivational_nudge_alerts', 'daily_motivation_alerts', 'featured_music_alerts'],
  },
  {
    id: 'coach',
    icon: MessageCircle,
    label: 'Coach Messages',
    description: 'AI coach check-ins & accountability',
    keys: ['coach_checkin_alerts', 'coach_accountability_alerts'],
  },
  {
    id: 'streak_progress',
    icon: Flame,
    label: 'Streak & Progress',
    description: 'Streak alerts & weekly review',
    keys: ['streak_alerts', 'weekly_review', 'insight_alerts'],
  },
]

export function NotificationSettings() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [supportInfo, setSupportInfo] = useState<{
    supported: boolean
    platform: 'ios' | 'android' | 'web'
    isInstalled: boolean
    isNative: boolean
    reason?: string
  } | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    morning_reminder: true,
    checkpoint_alerts: true,
    evening_reminder: true,
    streak_alerts: true,
    weekly_review: true,
    insight_alerts: true,
    daily_quote_alerts: true,
    daily_affirmation_alerts: true,
    motivational_nudge_alerts: true,
    daily_motivation_alerts: true,
    featured_music_alerts: true,
    coach_checkin_alerts: true,
    coach_accountability_alerts: true,
  })

  const parsePrefsFromServer = (sub: any): NotificationPreferences => ({
    morning_reminder: sub.morning_reminder ?? true,
    checkpoint_alerts: sub.checkpoint_alerts ?? true,
    evening_reminder: sub.evening_reminder ?? true,
    streak_alerts: sub.streak_alerts ?? true,
    weekly_review: sub.weekly_review ?? true,
    insight_alerts: sub.insight_alerts ?? true,
    daily_quote_alerts: sub.daily_quote_alerts ?? true,
    daily_affirmation_alerts: sub.daily_affirmation_alerts ?? true,
    motivational_nudge_alerts: sub.motivational_nudge_alerts ?? true,
    daily_motivation_alerts: sub.daily_motivation_alerts ?? true,
    featured_music_alerts: sub.featured_music_alerts ?? true,
    coach_checkin_alerts: sub.coach_checkin_alerts ?? true,
    coach_accountability_alerts: sub.coach_accountability_alerts ?? true,
  })

  useEffect(() => {
    const checkStatus = async () => {
      if (isNativePlatform) {
        const granted = await initNotifications()
        setSupportInfo({ supported: true, platform: 'ios', isInstalled: true, isNative: true })
        setIsSupported(true)
        setPermission(granted ? 'granted' : 'denied')

        const pending = await getPendingReminders()
        setIsSubscribed(pending.length > 0)

        try {
          const response = await fetch('/api/notifications/subscribe')
          if (response.ok) {
            const data = await response.json()
            if (data.subscriptions?.length > 0) {
              setPreferences(parsePrefsFromServer(data.subscriptions[0]))
            }
          }
        } catch {}

        setIsLoading(false)
        return
      }

      const info = getPushSupportInfo()
      setSupportInfo(info)
      setIsSupported(info.supported)

      if (info.supported) {
        setPermission(getNotificationPermission())
        if (!info.isNative) await registerServiceWorker()

        if (info.isNative) {
          try {
            const response = await fetch('/api/notifications/subscribe')
            if (response.ok) {
              const data = await response.json()
              setIsSubscribed(data.subscribed)
            }
          } catch {
            setIsSubscribed(false)
          }
        } else {
          const subscription = await getCurrentSubscription()
          setIsSubscribed(!!subscription)
        }

        try {
          const response = await fetch('/api/notifications/subscribe')
          if (response.ok) {
            const data = await response.json()
            if (data.subscriptions?.length > 0) {
              setPreferences(parsePrefsFromServer(data.subscriptions[0]))
            }
          }
        } catch {}
      }

      setIsLoading(false)
    }

    checkStatus()
  }, [])

  const handleToggleNotifications = async () => {
    setIsToggling(true)

    try {
      if (isNativePlatform) {
        if (isSubscribed) {
          await cancelAllReminders()
          setIsSubscribed(false)
        } else {
          const granted = await initNotifications()
          if (granted) {
            let morningHour = 7, morningMin = 0
            let eveningHour = 18, eveningMin = 0

            try {
              const prefsRes = await fetch('/api/daily-guide/preferences')
              if (prefsRes.ok) {
                const prefsData = await prefsRes.json()
                if (prefsData.wake_time) {
                  const [h, m] = prefsData.wake_time.split(':').map(Number)
                  const totalMin = h * 60 + (m || 0) + 15
                  morningHour = Math.floor(totalMin / 60)
                  morningMin = totalMin % 60
                }
                if (prefsData.work_end_time) {
                  const [h, m] = prefsData.work_end_time.split(':').map(Number)
                  eveningHour = h
                  eveningMin = m || 0
                }
              }
            } catch {}

            await scheduleMorningReminder(morningHour, morningMin)
            await scheduleEveningReminder(eveningHour, eveningMin)
            await scheduleWeeklyReviewReminder(10, 0)
            setIsSubscribed(true)
            setPermission('granted')
          } else {
            setPermission('denied')
          }
        }
      } else {
        if (isSubscribed) {
          await unsubscribeFromPush()
          setIsSubscribed(false)
        } else {
          await subscribeToPush()
          setIsSubscribed(true)
          setPermission('granted')
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error)
      if (!isNativePlatform) setPermission(getNotificationPermission())
    }

    setIsToggling(false)
  }

  // Toggle a group — flips all underlying keys together
  const handleGroupToggle = async (group: typeof NOTIFICATION_GROUPS[number]) => {
    // Group is "on" if any key is true
    const isCurrentlyOn = group.keys.some(k => preferences[k])
    const newValue = !isCurrentlyOn

    // Optimistic update
    const patch: Partial<NotificationPreferences> = {}
    for (const key of group.keys) patch[key] = newValue
    setPreferences(prev => ({ ...prev, ...patch }))

    try {
      // Update server
      await fetch('/api/notifications/subscribe', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })

      // Native local notification scheduling
      if (isNativePlatform) {
        if (group.id === 'daily_reminders') {
          if (newValue) {
            let morningHour = 7, morningMin = 0, eveningHour = 18, eveningMin = 0
            try {
              const prefsRes = await fetch('/api/daily-guide/preferences')
              if (prefsRes.ok) {
                const prefsData = await prefsRes.json()
                if (prefsData.wake_time) {
                  const [h, m] = prefsData.wake_time.split(':').map(Number)
                  const totalMin = h * 60 + (m || 0) + 15
                  morningHour = Math.floor(totalMin / 60)
                  morningMin = totalMin % 60
                }
                if (prefsData.work_end_time) {
                  const [h, m] = prefsData.work_end_time.split(':').map(Number)
                  eveningHour = h
                  eveningMin = m || 0
                }
              }
            } catch {}
            await scheduleMorningReminder(morningHour, morningMin)
            await scheduleEveningReminder(eveningHour, eveningMin)
          } else {
            await cancelReminder(NOTIFICATION_IDS.MORNING_REMINDER)
            await cancelReminder(NOTIFICATION_IDS.EVENING_REMINDER)
            await cancelReminder(NOTIFICATION_IDS.CHECKPOINT_1)
            await cancelReminder(NOTIFICATION_IDS.CHECKPOINT_2)
            await cancelReminder(NOTIFICATION_IDS.CHECKPOINT_3)
          }
        } else if (group.id === 'streak_progress') {
          if (newValue) {
            await scheduleStreakReminder(20, 0)
            await scheduleWeeklyReviewReminder(10, 0)
          } else {
            await cancelReminder(NOTIFICATION_IDS.STREAK_REMINDER)
            await cancelReminder(NOTIFICATION_IDS.WEEKLY_REVIEW)
          }
        }
      }
    } catch (error) {
      console.error('Error updating group preference:', error)
      // Revert
      const revert: Partial<NotificationPreferences> = {}
      for (const key of group.keys) revert[key] = !newValue
      setPreferences(prev => ({ ...prev, ...revert }))
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/15">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/10">
            <BellOff className="w-5 h-5 text-white/50" />
          </div>
          <div>
            <p className="text-sm text-white/70">Push notifications not available</p>
            <p className="text-xs text-white/50">
              {supportInfo?.reason || 'Your device does not support push notifications'}
            </p>
            {supportInfo?.platform === 'ios' && !supportInfo?.isInstalled && (
              <p className="text-xs text-amber-400 mt-2">
                Tap the share button and select &quot;Add to Home Screen&quot; to enable notifications
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/20">
            <BellOff className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm text-white/70">Notifications blocked</p>
            <p className="text-xs text-white/50">Enable notifications in your device settings</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main toggle */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
              {isSubscribed ? (
                <Bell className="w-5 h-5 text-emerald-400" />
              ) : (
                <BellOff className="w-5 h-5 text-white/50" />
              )}
            </div>
            <div>
              <p className="text-sm text-white">Push Notifications</p>
              <p className="text-xs text-white/50">
                {isSubscribed ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleNotifications}
            disabled={isToggling}
            aria-label={isSubscribed ? 'Disable push notifications' : 'Enable push notifications'}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
              isSubscribed
                ? 'bg-white/10 text-white/70 hover:bg-white/20'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            } disabled:opacity-40`}
          >
            {isToggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSubscribed ? (
              'Disable'
            ) : (
              'Enable'
            )}
          </button>
        </div>
      </div>

      {/* Grouped notification preferences */}
      {isSubscribed && (
        <div className="space-y-2">
          {NOTIFICATION_GROUPS.map((group) => {
            const isOn = group.keys.some(k => preferences[k])
            const Icon = group.icon
            return (
              <button
                key={group.id}
                onClick={() => handleGroupToggle(group)}
                role="switch"
                aria-checked={isOn}
                aria-label={group.label}
                className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/15 hover:bg-white/[0.06] transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isOn ? 'text-white' : 'text-white/50'}`} />
                    <div className="text-left">
                      <p className={`text-sm ${isOn ? 'text-white' : 'text-white/70'}`}>{group.label}</p>
                      <p className="text-xs text-white/50">{group.description}</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isOn ? 'bg-emerald-500/20' : 'bg-white/10'
                    }`}
                  >
                    {isOn && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
