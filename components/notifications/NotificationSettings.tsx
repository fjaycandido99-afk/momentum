'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2, Check, Sunrise, Clock, Moon, Flame, Calendar } from 'lucide-react'
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

interface NotificationPreferences {
  morning_reminder: boolean
  checkpoint_alerts: boolean
  evening_reminder: boolean
  streak_alerts: boolean
  weekly_review: boolean
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
  })

  useEffect(() => {
    const checkStatus = async () => {
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
    } catch (error) {
      console.error('Error toggling notifications:', error)
      // Update permission state in case it was denied
      setPermission(getNotificationPermission())
    }

    setIsToggling(false)
  }

  const handlePreferenceChange = async (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key]
    setPreferences(prev => ({ ...prev, [key]: newValue }))

    try {
      await fetch('/api/notifications/subscribe', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      })
    } catch (error) {
      console.error('Error updating preference:', error)
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: !newValue }))
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/10">
            <BellOff className="w-5 h-5 text-white/40" />
          </div>
          <div>
            <p className="text-sm text-white/70">Push notifications not available</p>
            <p className="text-xs text-white/40">
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
            <p className="text-sm text-white/70">Notifications blocked</p>
            <p className="text-xs text-white/40">Enable notifications in your browser settings</p>
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
                <BellOff className="w-5 h-5 text-white/40" />
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isSubscribed
                ? 'bg-white/10 text-white/70 hover:bg-white/20'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            } disabled:opacity-50`}
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
          <p className="text-xs text-white/40 uppercase tracking-wider px-1">Notification Types</p>

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
      className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${enabled ? 'text-white/70' : 'text-white/30'}`} />
          <div className="text-left">
            <p className={`text-sm ${enabled ? 'text-white' : 'text-white/50'}`}>{label}</p>
            <p className="text-xs text-white/40">{description}</p>
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
