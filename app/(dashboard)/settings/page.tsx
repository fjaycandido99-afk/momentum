'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import {
  Volume2,
  Bell,
  LogOut,
  ChevronLeft,
  Briefcase,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  Layers,
  Sun,
  Sparkles,
  Lightbulb,
  Wind,
  Moon,
  Check,
  Loader2,
  Crown,
  CreditCard,
  ExternalLink,
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useThemeOptional } from '@/contexts/ThemeContext'
import { BACKGROUND_ANIMATIONS, getPreferredAnimation, setPreferredAnimation, getBackgroundBrightness, setBackgroundBrightness, getBackgroundEnabled, setBackgroundEnabled } from '@/components/player/DailyBackground'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'
import { PremiumBadge, ProLabel } from '@/components/premium'
import { FeatureHint } from '@/components/ui/FeatureHint'

type UserType = 'professional' | 'student' | 'hybrid'
type GuideTone = 'calm' | 'direct' | 'neutral'

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const USER_TYPES = [
  { value: 'professional' as UserType, label: 'Professional', icon: Briefcase },
  { value: 'student' as UserType, label: 'Student', icon: GraduationCap },
  { value: 'hybrid' as UserType, label: 'Both', icon: BookOpen },
]

const TONES = [
  { value: 'calm' as GuideTone, label: 'Calm', description: 'Soft and gentle' },
  { value: 'direct' as GuideTone, label: 'Direct', description: 'Clear and concise' },
  { value: 'neutral' as GuideTone, label: 'Neutral', description: 'Balanced tone' },
]

const SEGMENT_OPTIONS = [
  { id: 'morning_prime', label: 'Morning Greeting', icon: Sun, required: true },
  { id: 'movement', label: 'Quote of the Day', icon: Sparkles },
  { id: 'micro_lesson', label: 'Motivation Video', icon: Lightbulb },
  { id: 'breath', label: 'Breath', icon: Wind },
  { id: 'day_close', label: 'Day Close', icon: Moon, required: true },
]

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const themeContext = useThemeOptional()
  const subscription = useSubscriptionOptional()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const hasLoaded = useRef(false)
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)

  // Check for subscription success/cancel from Stripe redirect
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription')
    if (subscriptionStatus === 'success') {
      setSubscriptionMessage('Welcome to Premium! Your subscription is now active.')
      subscription?.refreshSubscription()
      // Clear the URL param
      router.replace('/settings')
    } else if (subscriptionStatus === 'canceled') {
      setSubscriptionMessage('Subscription checkout was canceled.')
      router.replace('/settings')
    }
  }, [searchParams, subscription, router])

  // Preferences state
  const [userType, setUserType] = useState<UserType>('professional')
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [classDays, setClassDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [wakeTime, setWakeTime] = useState('07:00')
  const [workStartTime, setWorkStartTime] = useState('09:00')
  const [workEndTime, setWorkEndTime] = useState('17:00')
  const [classStartTime, setClassStartTime] = useState('08:00')
  const [classEndTime, setClassEndTime] = useState('15:00')
  const [studyStartTime, setStudyStartTime] = useState('18:00')
  const [studyEndTime, setStudyEndTime] = useState('21:00')
  const [guideTone, setGuideTone] = useState<GuideTone>('calm')
  const [enabledSegments, setEnabledSegments] = useState<string[]>(['morning_prime', 'movement', 'micro_lesson', 'breath', 'day_close'])
  const [dailyReminder, setDailyReminder] = useState(true)
  const [reminderTime, setReminderTime] = useState('07:00')
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(true)
  const [preferredMusicGenre, setPreferredMusicGenre] = useState<string | null>(null)
  const [bedtimeReminderEnabled, setBedtimeReminderEnabled] = useState(false)
  const [selectedAnimation, setSelectedAnimation] = useState<string | null>(null)
  const [backgroundBrightness, setBackgroundBrightnessState] = useState(1)
  const [backgroundEnabled, setBackgroundEnabledState] = useState(true)

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Check auth status
        const { data: { user } } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)

        const response = await fetch('/api/daily-guide/preferences')
        if (response.ok) {
          const data = await response.json()
          if (data.user_type) setUserType(data.user_type)
          if (data.work_days) setWorkDays(data.work_days)
          if (data.class_days) setClassDays(data.class_days)
          if (data.wake_time) setWakeTime(data.wake_time)
          if (data.work_start_time) setWorkStartTime(data.work_start_time)
          if (data.work_end_time) setWorkEndTime(data.work_end_time)
          if (data.class_start_time) setClassStartTime(data.class_start_time)
          if (data.class_end_time) setClassEndTime(data.class_end_time)
          if (data.study_start_time) setStudyStartTime(data.study_start_time)
          if (data.study_end_time) setStudyEndTime(data.study_end_time)
          if (data.guide_tone) setGuideTone(data.guide_tone)
          if (data.enabled_segments) setEnabledSegments(data.enabled_segments)
          if (data.daily_reminder !== undefined) setDailyReminder(data.daily_reminder)
          if (data.reminder_time) setReminderTime(data.reminder_time)
          if (data.background_music_enabled !== undefined) setBackgroundMusicEnabled(data.background_music_enabled)
          if (data.preferred_music_genre !== undefined) setPreferredMusicGenre(data.preferred_music_genre)
          if (data.bedtime_reminder_enabled !== undefined) setBedtimeReminderEnabled(data.bedtime_reminder_enabled)
        }
        // Load animation preference from localStorage
        setSelectedAnimation(getPreferredAnimation())
        setBackgroundBrightnessState(getBackgroundBrightness())
        setBackgroundEnabledState(getBackgroundEnabled())
      } catch (error) {
        console.error('Failed to load preferences:', error)
      } finally {
        setIsLoading(false)
        // Mark loaded so auto-save doesn't fire on initial mount
        setTimeout(() => { hasLoaded.current = true }, 100)
      }
    }
    loadPreferences()
  }, [supabase.auth])

  // Auto-save preferences
  const savePreferences = useCallback(async () => {
    if (!hasLoaded.current) return
    setIsSaving(true)
    setSaveStatus('saving')
    try {
      const response = await fetch('/api/daily-guide/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_type: userType,
          work_days: workDays,
          class_days: classDays,
          wake_time: wakeTime,
          work_start_time: workStartTime,
          work_end_time: workEndTime,
          class_start_time: classStartTime,
          class_end_time: classEndTime,
          study_start_time: studyStartTime,
          study_end_time: studyEndTime,
          guide_tone: guideTone,
          enabled_segments: enabledSegments,
          daily_reminder: dailyReminder,
          reminder_time: reminderTime,
          background_music_enabled: backgroundMusicEnabled,
          preferred_music_genre: preferredMusicGenre,
          bedtime_reminder_enabled: bedtimeReminderEnabled,
          workout_enabled: enabledSegments.includes('movement'),
          micro_lesson_enabled: enabledSegments.includes('micro_lesson'),
          breath_cues_enabled: enabledSegments.includes('breath'),
        }),
      })
      const data = await response.json()
      if (response.ok && !data.isGuest) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }, [userType, workDays, classDays, wakeTime, workStartTime, workEndTime, classStartTime, classEndTime, studyStartTime, studyEndTime, guideTone, enabledSegments, dailyReminder, reminderTime, backgroundMusicEnabled, preferredMusicGenre, bedtimeReminderEnabled])

  // Debounced auto-save when any preference changes
  useEffect(() => {
    if (!hasLoaded.current) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      savePreferences()
    }, 800)
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [savePreferences])

  const toggleDay = (day: number, type: 'work' | 'class') => {
    if (type === 'work') {
      setWorkDays(prev =>
        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
      )
    } else {
      setClassDays(prev =>
        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
      )
    }
  }

  const toggleSegment = (segmentId: string) => {
    const segment = SEGMENT_OPTIONS.find(s => s.id === segmentId)
    if (segment?.required) return
    setEnabledSegments(prev =>
      prev.includes(segmentId) ? prev.filter(s => s !== segmentId) : [...prev, segmentId]
    )
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen text-white pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 section-fade-bg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-5 h-5 text-white/95" />
            </Link>
            <h1 className="text-2xl font-light text-white">Settings</h1>
          </div>
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-white/95 text-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-green-400 text-sm">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-400 text-sm">Failed to save</span>
          )}
        </div>
        <p className="text-white/95 text-sm mt-1">Customize your Daily Guide</p>
      </div>

      <div className="px-6 space-y-4">
        {/* User Type */}
        <section className="p-5 card-gradient-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-white/10">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-medium text-white">I am a</h2>
              <p className="text-white/95 text-xs">This personalizes your experience</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {USER_TYPES.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.value}
                  onClick={() => setUserType(type.value)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2 press-scale ${
                    userType === type.value
                      ? 'bg-white/20 text-white border border-white/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.08)]'
                      : 'bg-white/5 text-white/95 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {type.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Work Days (for professional/hybrid) */}
        {(userType === 'professional' || userType === 'hybrid') && (
          <section className="p-5 card-gradient-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-white/10">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-medium text-white">Work Days</h2>
                <p className="text-white/95 text-xs">Days you work</p>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value, 'work')}
                  className={`h-10 rounded-lg text-xs font-medium transition-all press-scale ${
                    workDays.includes(day.value)
                      ? 'bg-white/20 text-white border border-white/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.08)]'
                      : 'bg-white/5 text-white/95 border border-transparent hover:bg-white/10'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Class Days (for student/hybrid) */}
        {(userType === 'student' || userType === 'hybrid') && (
          <section className="p-5 card-gradient-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-white/10">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-medium text-white">Class Days</h2>
                <p className="text-white/95 text-xs">Days you have classes</p>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value, 'class')}
                  className={`h-10 rounded-lg text-xs font-medium transition-all press-scale ${
                    classDays.includes(day.value)
                      ? 'bg-white/20 text-white border border-white/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.08)]'
                      : 'bg-white/5 text-white/95 border border-transparent hover:bg-white/10'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Schedule */}
        <section className="p-5 card-gradient-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-white/10">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-medium text-white">Schedule</h2>
              <p className="text-white/95 text-xs">Your daily times</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/95 mb-2">Wake time</label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-center text-base font-medium cursor-pointer"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            {(userType === 'professional' || userType === 'hybrid') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-sm text-white/95 mb-2">Work starts</label>
                  <input
                    type="time"
                    value={workStartTime}
                    onChange={(e) => setWorkStartTime(e.target.value)}
                    className="w-full py-3 px-2 rounded-xl bg-white/5 border border-white/10 text-white text-center text-base font-medium cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm text-white/95 mb-2">Work ends</label>
                  <input
                    type="time"
                    value={workEndTime}
                    onChange={(e) => setWorkEndTime(e.target.value)}
                    className="w-full py-3 px-2 rounded-xl bg-white/5 border border-white/10 text-white text-center text-base font-medium cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
            )}
            {(userType === 'student' || userType === 'hybrid') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="block text-sm text-white/95 mb-2">Classes start</label>
                    <input
                      type="time"
                      value={classStartTime}
                      onChange={(e) => setClassStartTime(e.target.value)}
                      className="w-full py-3 px-2 rounded-xl bg-white/5 border border-white/10 text-white text-center text-base font-medium cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm text-white/95 mb-2">Classes end</label>
                    <input
                      type="time"
                      value={classEndTime}
                      onChange={(e) => setClassEndTime(e.target.value)}
                      className="w-full py-3 px-2 rounded-xl bg-white/5 border border-white/10 text-white text-center text-base font-medium cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="block text-sm text-white/95 mb-2">Study starts</label>
                    <input
                      type="time"
                      value={studyStartTime}
                      onChange={(e) => setStudyStartTime(e.target.value)}
                      className="w-full py-3 px-2 rounded-xl bg-white/5 border border-white/10 text-white text-center text-base font-medium cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm text-white/95 mb-2">Study ends</label>
                    <input
                      type="time"
                      value={studyEndTime}
                      onChange={(e) => setStudyEndTime(e.target.value)}
                      className="w-full py-3 px-2 rounded-xl bg-white/5 border border-white/10 text-white text-center text-base font-medium cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <FeatureHint id="schedule" text="Your schedule controls when modules unlock each day" mode="once" />
        </section>

        {/* Segments */}
        <section className="p-5 card-gradient-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-white/10">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-medium text-white">Daily Flow</h2>
              <p className="text-white/95 text-xs">Which segments to include</p>
            </div>
          </div>
          <div className="space-y-2">
            {SEGMENT_OPTIONS.map((segment) => {
              const Icon = segment.icon
              const isEnabled = enabledSegments.includes(segment.id)
              return (
                <button
                  key={segment.id}
                  onClick={() => toggleSegment(segment.id)}
                  disabled={segment.required}
                  className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                    isEnabled
                      ? 'bg-white/10 border border-white/20'
                      : 'bg-white/5 border border-transparent'
                  } ${segment.required ? 'cursor-default' : 'cursor-pointer hover:bg-white/10 press-scale'}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isEnabled ? 'text-white' : 'text-white/95'}`} />
                    <span className={isEnabled ? 'text-white' : 'text-white/95'}>{segment.label}</span>
                    {segment.required && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/95">Required</span>
                    )}
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isEnabled ? 'bg-white border-white' : 'border-white/30'
                  }`}>
                    {isEnabled && <Check className="w-3 h-3 text-black" />}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Voice Tone */}
        <section className="p-5 card-gradient-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-white/10">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-medium text-white">Voice Tone</h2>
              <p className="text-white/95 text-xs">How the AI speaks to you</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TONES.map((tone) => (
              <button
                key={tone.value}
                onClick={() => setGuideTone(tone.value)}
                className={`p-3 rounded-xl text-center transition-all press-scale ${
                  guideTone === tone.value
                    ? 'bg-white/20 text-white border border-white/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.08)]'
                    : 'bg-white/5 text-white/95 border border-transparent hover:bg-white/10'
                }`}
              >
                <p className="font-medium text-sm">{tone.label}</p>
                <p className="text-xs text-white/95 mt-0.5">{tone.description}</p>
              </button>
            ))}
          </div>
          <FeatureHint id="voice-tone" text="Your tone affects how the AI speaks throughout your entire journey" mode="once" />
        </section>

        {/* Daily Reminder */}
        <section className="p-5 card-gradient-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-medium text-white">Daily Reminder</h2>
                <p className="text-white/95 text-xs">Get notified each morning</p>
              </div>
            </div>
            <button
              onClick={() => setDailyReminder(!dailyReminder)}
              className={`w-12 h-7 rounded-full transition-all press-scale ${
                dailyReminder ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.2)]' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full shadow-lg transition-transform ${
                  dailyReminder ? 'bg-black translate-x-6' : 'bg-white translate-x-1'
                }`}
              />
            </button>
          </div>
          {dailyReminder && (
            <div className="mt-3">
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-center text-base font-medium cursor-pointer"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          )}
        </section>

        {/* Bedtime Reminder */}
        <section className="p-5 card-gradient-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10">
                <Moon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-medium text-white">Bedtime Reminder</h2>
                <p className="text-white/95 text-xs">Reminder for 8 hours before wake time</p>
              </div>
            </div>
            <button
              onClick={() => setBedtimeReminderEnabled(!bedtimeReminderEnabled)}
              className={`w-12 h-7 rounded-full transition-all press-scale ${
                bedtimeReminderEnabled ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.2)]' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full shadow-lg transition-transform ${
                  bedtimeReminderEnabled ? 'bg-black translate-x-6' : 'bg-white translate-x-1'
                }`}
              />
            </button>
          </div>
          {bedtimeReminderEnabled && wakeTime && (
            <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-white/95">
                You&apos;ll be reminded at{' '}
                <span className="text-white font-medium">
                  {(() => {
                    const [h, m] = wakeTime.split(':').map(Number)
                    let bedH = h - 8
                    if (bedH < 0) bedH += 24
                    const period = bedH >= 12 ? 'PM' : 'AM'
                    const display = bedH % 12 || 12
                    return `${display}:${(m || 0).toString().padStart(2, '0')} ${period}`
                  })()}
                </span>
                {' '}to get 8 hours of sleep
              </p>
            </div>
          )}
        </section>

        {/* Push Notifications */}
        <section className="p-5 card-gradient-border">
          <h2 className="font-medium text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </h2>
          <NotificationSettings />
        </section>

        {/* Background Animation */}
        <section className="p-5 card-gradient-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-medium text-white">Background Animation</h2>
                <p className="text-white/95 text-xs">Choose your pattern style</p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !backgroundEnabled
                setBackgroundEnabledState(next)
                setBackgroundEnabled(next)
              }}
              className={`w-12 h-7 rounded-full transition-all press-scale ${
                backgroundEnabled ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.2)]' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full shadow-lg transition-transform ${
                  backgroundEnabled ? 'bg-black translate-x-6' : 'bg-white translate-x-1'
                }`}
              />
            </button>
          </div>

          {backgroundEnabled && (
            <>
              {/* Brightness slider */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-white/95">Brightness</label>
                  <span className="text-sm text-white/95">{Math.round(backgroundBrightness * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.1"
                  value={backgroundBrightness}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    setBackgroundBrightnessState(val)
                    setBackgroundBrightness(val)
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(255,255,255,0.3)]"
                />
              </div>
              <FeatureHint id="bg-animation" text="Animations create subtle visual interest without distraction" mode="persistent" />

              <div className="grid grid-cols-2 gap-3">
                {/* Daily Rotation option */}
                <button
                  onClick={() => {
                    setSelectedAnimation(null)
                    setPreferredAnimation(null)
                  }}
                  className={`p-2 rounded-xl transition-all press-scale ${
                    selectedAnimation === null
                      ? 'bg-white/15 border border-white/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.08)]'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="aspect-[3/2] rounded-lg overflow-hidden bg-black/50 mb-2 relative flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="w-5 h-5 text-white/95 mx-auto mb-1" />
                      <span className="text-[10px] text-white/95">Auto</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-white">Daily Rotation</p>
                  <p className="text-[10px] text-white/95">Changes each day</p>
                </button>

                {/* Individual animation options with live preview */}
                {BACKGROUND_ANIMATIONS.map(anim => {
                  const AnimComponent = anim.component
                  return (
                    <button
                      key={anim.id}
                      onClick={() => {
                        setSelectedAnimation(anim.id)
                        setPreferredAnimation(anim.id)
                      }}
                      className={`p-2 rounded-xl transition-all press-scale ${
                        selectedAnimation === anim.id
                          ? 'bg-white/15 border border-white/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.08)]'
                          : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <div className="aspect-[3/2] rounded-lg overflow-hidden bg-black/50 mb-2 relative">
                        <AnimComponent animate topOffset={0} className="absolute inset-0" />
                      </div>
                      <p className="text-xs font-medium text-white">{anim.name}</p>
                      <p className="text-[10px] text-white/95">{anim.description}</p>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </section>

        {/* Subscription Management */}
        <section className="p-5 card-gradient-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className="font-medium text-white">Subscription</h2>
              <p className="text-white/95 text-xs">Manage your plan</p>
            </div>
            {subscription?.isPremium && <PremiumBadge size="sm" />}
          </div>

          {/* Subscription message */}
          {subscriptionMessage && (
            <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              {subscriptionMessage}
            </div>
          )}

          {subscription?.isPremium ? (
            // Premium user view
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">
                    {subscription.isTrialing ? 'Premium Trial' : 'Premium Plan'}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
                    Active
                  </span>
                </div>
                {subscription.isTrialing && subscription.trialDaysLeft > 0 && (
                  <p className="text-sm text-white/95">
                    {subscription.trialDaysLeft} days left in trial
                  </p>
                )}
                {subscription.billingPeriodEnd && !subscription.isTrialing && (
                  <p className="text-sm text-white/95">
                    Next billing: {subscription.billingPeriodEnd.toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    setIsLoadingPortal(true)
                    try {
                      const response = await fetch('/api/stripe/portal', {
                        method: 'POST',
                      })
                      const data = await response.json()
                      if (data.url) {
                        window.location.href = data.url
                      }
                    } catch (error) {
                      console.error('Failed to open portal:', error)
                    } finally {
                      setIsLoadingPortal(false)
                    }
                  }}
                  disabled={isLoadingPortal}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  {isLoadingPortal ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  Manage Billing
                </button>
                <Link
                  href="/pricing"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 text-white/95 text-sm hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Plans
                </Link>
              </div>
            </div>
          ) : (
            // Free user view
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white font-medium mb-1">Free Plan</p>
                <p className="text-sm text-white/95 mb-3">
                  1 session/day · 10-min limit · Limited features
                </p>
                <ul className="space-y-2 text-sm text-white/95">
                  <li className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    Daily checkpoints locked
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    Genre selection locked
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    Journal history locked
                  </li>
                </ul>
              </div>

              <button
                onClick={() => subscription?.openUpgradeModal()}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:from-amber-400 hover:to-orange-400 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                Upgrade to Premium - $4.99/mo
              </button>
              <p className="text-center text-white/95 text-xs">
                7-day free trial · Cancel anytime
              </p>
              <Link
                href="/pricing"
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 text-white/95 text-sm hover:bg-white/10 hover:text-white/95 transition-colors mt-2"
              >
                <ExternalLink className="w-4 h-4" />
                Compare plans
              </Link>
            </div>
          )}
        </section>

        {/* Sign In / Sign Out */}
        <section className="pt-2">
          {isAuthenticated ? (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 p-4 card-gradient-border text-red-400 hover:bg-red-500/20 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 p-4 card-gradient-border text-white hover:bg-white/20 transition-all"
            >
              Sign In to Save Progress
            </Link>
          )}
        </section>

        {/* App Info */}
        <div className="text-center pt-6 pb-8">
          <p className="text-white/95 text-sm">Voxu v0.1.0</p>
          <p className="text-white/95 text-xs mt-1">Your AI Audio Coach</p>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SettingsContent />
    </Suspense>
  )
}
