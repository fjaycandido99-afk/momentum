'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2, Check, Sunrise, Clock, Moon, Flame, Calendar, Lightbulb, Quote, Sparkles, Heart } from 'lucide-react'
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  registerServiceWorker,
  getPushSupportInfo,
  isNativeApp,
} from '@/lib/push-notifications'
import {
  isNative as isNativePlatform,
  initNotifications,
  scheduleMorningReminder,
  scheduleEveningReminder,
  scheduleStreakReminder,
  scheduleWeeklyReviewReminder,
  scheduleCheckpointReminder,
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
}

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
  })

  useEffect(() => {
    const checkStatus = async () => {
      // Check for native platform first
      if (isNativePlatform) {
        const granted = await initNotifications()
        setSupportInfo({
          supported: true,
          platform: 'ios', // or android - we'll detect this properly
          isInstalled: true,
          isNative: true,
        })
        setIsSupported(true)
        setPermission(granted ? 'granted' : 'denied')

        // Check if we have pending reminders (means notifications are enabled)
        const pending = await getPendingReminders()
        setIsSubscribed(pending.length > 0)

        // Fetch preferences from server
        try {
          const response = await fetch('/api/notifications/subscribe')
          if (response.ok) {
            const data = await response.json()
            if (data.subscriptions?.length > 0) {
              const sub = data.subscriptions[0]
              setPreferences({
                morning_reminder: sub.morning_reminder,
                checkpoint_alerts: sub.checkpoint_alerts,
                evening_reminder: sub.evening_reminder,
                streak_alerts: sub.streak_alerts,
                weekly_review: sub.weekly_review,
                insight_alerts: sub.insight_alerts ?? true,
                daily_quote_alerts: sub.daily_quote_alerts ?? true,
                daily_affirmation_alerts: sub.daily_affirmation_alerts ?? true,
                motivational_nudge_alerts: sub.motivational_nudge_alerts ?? true,
              })
            }
          }
        } catch (error) {
          console.error('Error fetching notification preferences:', error)
        }

        setIsLoading(false)
        return
      }

      // Web push notifications
      const info = getPushSupportInfo()
      setSupportInfo(info)
      setIsSupported(info.supported)

      if (info.supported) {
        setPermission(getNotificationPermission())

        // Register service worker (not needed for native)
        if (!info.isNative) {
          await registerServiceWorker()
        }

        // Check if already subscribed
        const subscription = await getCurrentSubscription()
        // For native apps, check server instead
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
          setIsSubscribed(!!subscription)
        }

        // Fetch preferences from server
        try {
          const response = await fetch('/api/notifications/subscribe')
          if (response.ok) {
            const data = await response.json()
            if (data.subscriptions?.length > 0) {
              const sub = data.subscriptions[0]
              setPreferences({
                morning_reminder: sub.morning_reminder,
                checkpoint_alerts: sub.checkpoint_alerts,
                evening_reminder: sub.evening_reminder,
                streak_alerts: sub.streak_alerts,
                weekly_review: sub.weekly_review,
                insight_alerts: sub.insight_alerts ?? true,
                daily_quote_alerts: sub.daily_quote_alerts ?? true,
                daily_affirmation_alerts: sub.daily_affirmation_alerts ?? true,
                motivational_nudge_alerts: sub.motivational_nudge_alerts ?? true,
              })
            }
          }
        } catch (error) {
          console.error('Error fetching notification preferences:', error)
        }
      }

      setIsLoading(false)
    }

    checkStatus()
  }, [])

  const handleToggleNotifications = async () => {
    setIsToggling(true)

    try {
      if (isNativePlatform) {
        // Native notifications
        if (isSubscribed) {
          // Cancel all scheduled notifications
          await cancelAllReminders()
          setIsSubscribed(false)
        } else {
          // Request permission and schedule reminders based on user preferences
          const granted = await initNotifications()
          if (granted) {
            // Fetch user preferences for timing
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
            } catch {
              // Use defaults
            }

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
        // Web push notifications
        if (isSubscribed) {
          // Unsubscribe
          await unsubscribeFromPush()
          setIsSubscribed(false)
        } else {
          // Subscribe
          await subscribeToPush()
          setIsSubscribed(true)
          setPermission('granted')
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error)
      // Update permission state in case it was denied
      if (!isNativePlatform) {
        setPermission(getNotificationPermission())
      }
    }

    setIsToggling(false)
  }

  const handlePreferenceChange = async (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key]
    setPreferences(prev => ({ ...prev, [key]: newValue }))

    try {
      // Update server-side preferences
      await fetch('/api/notifications/subscribe', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      })

      // For native, also update local notifications
      if (isNativePlatform) {
        if (newValue) {
          // Schedule the notification
          switch (key) {
            case 'morning_reminder':
              // Use user's wake time + 15 min, or default to 7am
              try {
                const prefsRes = await fetch('/api/daily-guide/preferences')
                if (prefsRes.ok) {
                  const prefsData = await prefsRes.json()
                  if (prefsData.wake_time) {
                    const [h, m] = prefsData.wake_time.split(':').map(Number)
                    // Add 15 minutes to wake time
                    const totalMin = h * 60 + (m || 0) + 15
                    await scheduleMorningReminder(Math.floor(totalMin / 60), totalMin % 60)
                  } else {
                    await scheduleMorningReminder(7, 0)
                  }
                } else {
                  await scheduleMorningReminder(7, 0)
                }
              } catch {
                await scheduleMorningReminder(7, 0)
              }
              break
            case 'evening_reminder':
              // Use user's work end time, or default to 6pm
              try {
                const prefsRes = await fetch('/api/daily-guide/preferences')
                if (prefsRes.ok) {
                  const prefsData = await prefsRes.json()
                  if (prefsData.work_end_time) {
                    const [h, m] = prefsData.work_end_time.split(':').map(Number)
                    await scheduleEveningReminder(h, m || 0)
                  } else {
                    await scheduleEveningReminder(18, 0)
                  }
                } else {
                  await scheduleEveningReminder(18, 0)
                }
              } catch {
                await scheduleEveningReminder(18, 0)
              }
              break
            case 'streak_alerts':
              await scheduleStreakReminder(20, 0) // 8pm reminder
              break
            case 'weekly_review':
              await scheduleWeeklyReviewReminder(10, 0)
              break
            case 'checkpoint_alerts':
              // Fetch actual checkpoint times from daily guide
              try {
                const guideRes = await fetch('/api/daily-guide/generate?date=' + new Date().toISOString())
                if (guideRes.ok) {
                  const guideData = await guideRes.json()
                  const checkpoints = guideData.checkpoints || []
                  for (const cp of checkpoints) {
                    const [hour, minute] = cp.time.split(':').map(Number)
                    const cpNum = parseInt(cp.id.replace('checkpoint_', '')) as 1 | 2 | 3
                    await scheduleCheckpointReminder(cpNum, hour, minute, cp.name)
                  }
                }
              } catch (e) {
                // Fallback to default times if guide fetch fails
                await scheduleCheckpointReminder(1, 9, 0, 'Focus Target')
                await scheduleCheckpointReminder(2, 12, 30, 'Midday Reset')
                await scheduleCheckpointReminder(3, 17, 0, 'Downshift')
              }
              break
          }
        } else {
          // Cancel the notification
          switch (key) {
            case 'morning_reminder':
              await cancelReminder(NOTIFICATION_IDS.MORNING_REMINDER)
              break
            case 'evening_reminder':
              await cancelReminder(NOTIFICATION_IDS.EVENING_REMINDER)
              break
            case 'streak_alerts':
              await cancelReminder(NOTIFICATION_IDS.STREAK_REMINDER)
              break
            case 'weekly_review':
              await cancelReminder(NOTIFICATION_IDS.WEEKLY_REVIEW)
              break
            case 'checkpoint_alerts':
              await cancelReminder(NOTIFICATION_IDS.CHECKPOINT_1)
              await cancelReminder(NOTIFICATION_IDS.CHECKPOINT_2)
              await cancelReminder(NOTIFICATION_IDS.CHECKPOINT_3)
              break
          }
        }
      }
    } catch (error) {
      console.error('Error updating preference:', error)
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: !newValue }))
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/95 animate-spin" />
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/10">
            <BellOff className="w-5 h-5 text-white/95" />
          </div>
          <div>
            <p className="text-sm text-white/95">Push notifications not available</p>
            <p className="text-xs text-white/95">
              {supportInfo?.reason || 'Your device does not support push notifications'}
            </p>
            {supportInfo?.platform === 'ios' && !supportInfo?.isInstalled && (
              <p className="text-xs text-amber-400 mt-2">
                Tap the share button and select "Add to Home Screen" to enable notifications
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
            <p className="text-sm text-white/95">Notifications blocked</p>
            <p className="text-xs text-white/95">Enable notifications in your browser settings</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main toggle */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
              {isSubscribed ? (
                <Bell className="w-5 h-5 text-emerald-400" />
              ) : (
                <BellOff className="w-5 h-5 text-white/95" />
              )}
            </div>
            <div>
              <p className="text-sm text-white">Push Notifications</p>
              <p className="text-xs text-white/95">
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
                ? 'bg-white/10 text-white/95 hover:bg-white/20'
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

      {/* Notification preferences (only show if subscribed) */}
      {isSubscribed && (
        <div className="space-y-2">
          <p className="text-xs text-white/95 uppercase tracking-wider px-1">Notification Types</p>

          {/* Morning reminder */}
          <NotificationToggle
            icon={Sunrise}
            label="Morning Reminder"
            description="Start your day with morning flow"
            enabled={preferences.morning_reminder}
            onToggle={() => handlePreferenceChange('morning_reminder')}
          />

          {/* Checkpoint alerts */}
          <NotificationToggle
            icon={Clock}
            label="Checkpoint Alerts"
            description="Scheduled check-ins throughout the day"
            enabled={preferences.checkpoint_alerts}
            onToggle={() => handlePreferenceChange('checkpoint_alerts')}
          />

          {/* Evening reminder */}
          <NotificationToggle
            icon={Moon}
            label="Evening Reminder"
            description="Wind down with day close"
            enabled={preferences.evening_reminder}
            onToggle={() => handlePreferenceChange('evening_reminder')}
          />

          {/* Streak alerts */}
          <NotificationToggle
            icon={Flame}
            label="Streak Alerts"
            description="Don't lose your streak"
            enabled={preferences.streak_alerts}
            onToggle={() => handlePreferenceChange('streak_alerts')}
          />

          {/* Weekly review */}
          <NotificationToggle
            icon={Calendar}
            label="Weekly Review"
            description="Sunday reflection and intentions"
            enabled={preferences.weekly_review}
            onToggle={() => handlePreferenceChange('weekly_review')}
          />

          {/* Weekly insights */}
          <NotificationToggle
            icon={Lightbulb}
            label="Weekly Insights"
            description="Data-driven wellbeing insights"
            enabled={preferences.insight_alerts}
            onToggle={() => handlePreferenceChange('insight_alerts')}
          />

          {/* Daily quote */}
          <NotificationToggle
            icon={Quote}
            label="Daily Quote"
            description="Inspirational quote every morning at 8 AM"
            enabled={preferences.daily_quote_alerts}
            onToggle={() => handlePreferenceChange('daily_quote_alerts')}
          />

          {/* Daily affirmation */}
          <NotificationToggle
            icon={Sparkles}
            label="Daily Affirmation"
            description="Personalized AI affirmation at 7:30 AM"
            enabled={preferences.daily_affirmation_alerts}
            onToggle={() => handlePreferenceChange('daily_affirmation_alerts')}
          />

          {/* Motivational nudge */}
          <NotificationToggle
            icon={Heart}
            label="Motivational Nudge"
            description="Midday encouragement at 2 PM"
            enabled={preferences.motivational_nudge_alerts}
            onToggle={() => handlePreferenceChange('motivational_nudge_alerts')}
          />
        </div>
      )}
    </div>
  )
}

// Individual toggle component
interface NotificationToggleProps {
  icon: React.ElementType
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}

function NotificationToggle({ icon: Icon, label, description, enabled, onToggle }: NotificationToggleProps) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${enabled ? 'text-white/95' : 'text-white/95'}`} />
          <div className="text-left">
            <p className={`text-sm ${enabled ? 'text-white' : 'text-white/95'}`}>{label}</p>
            <p className="text-xs text-white/95">{description}</p>
          </div>
        </div>
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
            enabled ? 'bg-emerald-500/20' : 'bg-white/10'
          }`}
        >
          {enabled && <Check className="w-3 h-3 text-emerald-400" />}
        </div>
      </div>
    </button>
  )
}
