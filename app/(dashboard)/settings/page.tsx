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
  Star,
  Compass,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'
import { PremiumBadge, ProLabel } from '@/components/premium'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { SettingsCategory } from '@/components/settings/SettingsCategory'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'

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

import { ZODIAC_SIGNS } from '@/lib/astrology/constants'
import { LanguageSelector } from '@/components/settings/LanguageSelector'
import { Globe } from 'lucide-react'

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const subscription = useSubscriptionOptional()
  const mindsetCtx = useMindsetOptional()
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
  const [bedtimeReminderEnabled, setBedtimeReminderEnabled] = useState(false)
  const [astrologyEnabled, setAstrologyEnabled] = useState(false)
  const [zodiacSign, setZodiacSign] = useState<string | null>(null)
  const [locale, setLocale] = useState('en')

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const minDelay = new Promise(resolve => setTimeout(resolve, 300))
      try {
        // Check auth status
        const [{ data: { user } }] = await Promise.all([
          supabase.auth.getUser(),
          minDelay,
        ])
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
          if (data.bedtime_reminder_enabled !== undefined) setBedtimeReminderEnabled(data.bedtime_reminder_enabled)
          if (data.astrology_enabled !== undefined) setAstrologyEnabled(data.astrology_enabled)
          if (data.zodiac_sign !== undefined) setZodiacSign(data.zodiac_sign)
        }
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

  // Load persisted locale on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('voxu_locale')
      if (saved) setLocale(saved)
    } catch {}
  }, [])

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
          bedtime_reminder_enabled: bedtimeReminderEnabled,
          astrology_enabled: astrologyEnabled,
          zodiac_sign: zodiacSign,
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
  }, [userType, workDays, classDays, wakeTime, workStartTime, workEndTime, classStartTime, classEndTime, studyStartTime, studyEndTime, guideTone, enabledSegments, dailyReminder, reminderTime, backgroundMusicEnabled, bedtimeReminderEnabled, astrologyEnabled, zodiacSign])

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
    <div className="min-h-screen text-white pb-[calc(env(safe-area-inset-bottom)+6rem)]">
      {/* Header */}
      <div className="sticky top-0 z-50 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-4 mb-4 bg-black">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Back to home" className="p-2 -ml-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none">
              <ChevronLeft className="w-5 h-5 text-white/95" />
            </Link>
            <h1 className="text-2xl font-light shimmer-text">Settings</h1>
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
            <span role="alert" className="text-red-400 text-sm">Failed to save</span>
          )}
        </div>
        <p className="text-white/70 text-sm mt-1">Customize your Daily Guide</p>
      </div>

      <div className="px-6 space-y-3">
        {/* ═══════════════ 1. Profile & Schedule ═══════════════ */}
        <SettingsCategory
          id="profile-schedule"
          icon={Briefcase}
          title="Profile & Schedule"
          description="User type, work/class days, schedule times"
          defaultOpen
        >
          {/* User Type */}
          <div>
            <p className="text-sm text-white/85 mb-3">I am a</p>
            <div className="grid grid-cols-3 gap-2">
              {USER_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.value}
                    onClick={() => setUserType(type.value)}
                    aria-pressed={userType === type.value}
                    className={`p-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2 press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
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
          </div>

          {/* Work Days (for professional/hybrid) */}
          {(userType === 'professional' || userType === 'hybrid') && (
            <div>
              <p className="text-sm text-white/85 mb-3">Work Days</p>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value, 'work')}
                    aria-pressed={workDays.includes(day.value)}
                    aria-label={`${day.label} work day`}
                    className={`h-10 rounded-lg text-xs font-medium transition-all press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
                      workDays.includes(day.value)
                        ? 'bg-white/20 text-white border border-white/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.08)]'
                        : 'bg-white/5 text-white/95 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Class Days (for student/hybrid) */}
          {(userType === 'student' || userType === 'hybrid') && (
            <div>
              <p className="text-sm text-white/85 mb-3">Class Days</p>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value, 'class')}
                    aria-pressed={classDays.includes(day.value)}
                    aria-label={`${day.label} class day`}
                    className={`h-10 rounded-lg text-xs font-medium transition-all press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
                      classDays.includes(day.value)
                        ? 'bg-white/20 text-white border border-white/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.08)]'
                        : 'bg-white/5 text-white/95 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Schedule Times */}
          <div className="space-y-3">
            <div>
              <label htmlFor="wake-time" className="block text-sm text-white/95 mb-1.5">Wake time</label>
              <div className="h-11 rounded-xl bg-white/5 border border-white/15 overflow-hidden">
                <input
                  id="wake-time"
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full h-full px-4 bg-transparent text-white text-center text-sm font-medium cursor-pointer border-none outline-none"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
            {(userType === 'professional' || userType === 'hybrid') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label htmlFor="work-start-time" className="block text-sm text-white/95 mb-1.5">Work starts</label>
                  <div className="h-11 rounded-xl bg-white/5 border border-white/15 overflow-hidden">
                    <input
                      id="work-start-time"
                      type="time"
                      value={workStartTime}
                      onChange={(e) => setWorkStartTime(e.target.value)}
                      className="w-full h-full px-2 bg-transparent text-white text-center text-sm font-medium cursor-pointer border-none outline-none"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <label htmlFor="work-end-time" className="block text-sm text-white/95 mb-1.5">Work ends</label>
                  <div className="h-11 rounded-xl bg-white/5 border border-white/15 overflow-hidden">
                    <input
                      id="work-end-time"
                      type="time"
                      value={workEndTime}
                      onChange={(e) => setWorkEndTime(e.target.value)}
                      className="w-full h-full px-2 bg-transparent text-white text-center text-sm font-medium cursor-pointer border-none outline-none"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
              </div>
            )}
            {(userType === 'student' || userType === 'hybrid') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label htmlFor="class-start-time" className="block text-sm text-white/95 mb-1.5">Classes start</label>
                    <div className="h-11 rounded-xl bg-white/5 border border-white/15 overflow-hidden">
                      <input
                        id="class-start-time"
                        type="time"
                        value={classStartTime}
                        onChange={(e) => setClassStartTime(e.target.value)}
                        className="w-full h-full px-2 bg-transparent text-white text-center text-sm font-medium cursor-pointer border-none outline-none"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="class-end-time" className="block text-sm text-white/95 mb-1.5">Classes end</label>
                    <div className="h-11 rounded-xl bg-white/5 border border-white/15 overflow-hidden">
                      <input
                        id="class-end-time"
                        type="time"
                        value={classEndTime}
                        onChange={(e) => setClassEndTime(e.target.value)}
                        className="w-full h-full px-2 bg-transparent text-white text-center text-sm font-medium cursor-pointer border-none outline-none"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label htmlFor="study-start-time" className="block text-sm text-white/95 mb-1.5">Study starts</label>
                    <div className="h-11 rounded-xl bg-white/5 border border-white/15 overflow-hidden">
                      <input
                        id="study-start-time"
                        type="time"
                        value={studyStartTime}
                        onChange={(e) => setStudyStartTime(e.target.value)}
                        className="w-full h-full px-2 bg-transparent text-white text-center text-sm font-medium cursor-pointer border-none outline-none"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="study-end-time" className="block text-sm text-white/95 mb-1.5">Study ends</label>
                    <div className="h-11 rounded-xl bg-white/5 border border-white/15 overflow-hidden">
                      <input
                        id="study-end-time"
                        type="time"
                        value={studyEndTime}
                        onChange={(e) => setStudyEndTime(e.target.value)}
                        className="w-full h-full px-2 bg-transparent text-white text-center text-sm font-medium cursor-pointer border-none outline-none"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <FeatureHint id="schedule" text="Your schedule controls when modules unlock each day" mode="once" />
        </SettingsCategory>

        {/* ═══════════════ 2. Daily Experience ═══════════════ */}
        <SettingsCategory
          id="daily-experience"
          icon={Layers}
          title="Daily Experience"
          description="Segments, voice tone"
        >
          {/* Segments */}
          <div>
            <p className="text-sm text-white/85 mb-3">Daily Flow</p>
            <div className="space-y-2">
              {SEGMENT_OPTIONS.map((segment) => {
                const Icon = segment.icon
                const isEnabled = enabledSegments.includes(segment.id)
                return (
                  <button
                    key={segment.id}
                    onClick={() => toggleSegment(segment.id)}
                    disabled={segment.required}
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={`${segment.label}${segment.required ? ' (required)' : ''}`}
                    className={`w-full p-3 rounded-xl flex items-center justify-between transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
                      isEnabled
                        ? 'bg-white/10 border border-white/25'
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
          </div>

          {/* Voice Tone */}
          <div>
            <p className="text-sm text-white/85 mb-3">Voice Tone</p>
            <div className="grid grid-cols-3 gap-2">
              {TONES.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => setGuideTone(tone.value)}
                  aria-pressed={guideTone === tone.value}
                  className={`p-3 rounded-xl text-center transition-all press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
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
          </div>
        </SettingsCategory>

        {/* ═══════════════ 3. Reminders ═══════════════ */}
        <SettingsCategory
          id="reminders"
          icon={Bell}
          title="Reminders"
          description="Daily & bedtime reminders"
        >
          {/* Daily Reminder */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white text-sm">Daily Reminder</p>
                <p className="text-white/75 text-xs">Get notified each morning</p>
              </div>
              <button
                onClick={() => setDailyReminder(!dailyReminder)}
                role="switch"
                aria-checked={dailyReminder}
                aria-label="Daily reminder"
                className={`w-12 h-7 rounded-full transition-all press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
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
              <div className="mt-3 h-11 rounded-xl bg-white/5 border border-white/15 overflow-hidden">
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  aria-label="Reminder time"
                  className="w-full h-full px-4 bg-transparent text-white text-center text-sm font-medium cursor-pointer border-none outline-none"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            )}
          </div>

          {/* Bedtime Reminder */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white text-sm">Bedtime Reminder</p>
                <p className="text-white/75 text-xs">8 hours before wake time</p>
              </div>
              <button
                onClick={() => setBedtimeReminderEnabled(!bedtimeReminderEnabled)}
                role="switch"
                aria-checked={bedtimeReminderEnabled}
                aria-label="Bedtime reminder"
                className={`w-12 h-7 rounded-full transition-all press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
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
              <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/15">
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
          </div>
        </SettingsCategory>

        {/* ═══════════════ 3b. Sound ═══════════════ */}
        <SettingsCategory
          id="sound"
          icon={Volume2}
          title="Sound"
          description="Background music preferences"
        >
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white text-sm">Background Music</p>
                <p className="text-white/75 text-xs">Play ambient music during your Daily Guide sessions</p>
              </div>
              <button
                onClick={() => setBackgroundMusicEnabled(!backgroundMusicEnabled)}
                role="switch"
                aria-checked={backgroundMusicEnabled}
                aria-label="Background music"
                className={`w-12 h-7 rounded-full transition-all press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
                  backgroundMusicEnabled ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.2)]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full shadow-lg transition-transform ${
                    backgroundMusicEnabled ? 'bg-black translate-x-6' : 'bg-white translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </SettingsCategory>

        {/* ═══════════════ 4. Your Mindset ═══════════════ */}
        <SettingsCategory
          id="mindset"
          icon={Compass}
          title="Your Mindset"
          description={mindsetCtx ? MINDSET_CONFIGS[mindsetCtx.mindset].subtitle : 'Philosophy & path'}
        >
          <div>
            {mindsetCtx && (
              <div className="flex items-center gap-3 mb-4">
                <MindsetIcon mindsetId={mindsetCtx.mindset} className="w-7 h-7 text-white" />
                <div>
                  <p className="font-medium text-white text-sm">{MINDSET_CONFIGS[mindsetCtx.mindset].name}</p>
                  <p className="text-white/75 text-xs">{MINDSET_CONFIGS[mindsetCtx.mindset].subtitle}</p>
                </div>
              </div>
            )}
            <Link
              href="/mindset-selection"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/15 text-white/90 text-sm hover:bg-white/10 transition-all press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              Reset My Path
            </Link>
          </div>
        </SettingsCategory>

        {/* ═══════════════ 4b. Cosmic (Scholar only) ═══════════════ */}
        {mindsetCtx?.isScholar && (
          <SettingsCategory
            id="cosmic"
            icon={Star}
            iconColor="text-indigo-400"
            iconBg="bg-gradient-to-br from-indigo-500/20 to-purple-500/20"
            title="Cosmic"
            description="Astrology mode, zodiac sign"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-white text-sm">Astrology Mode</p>
                  <p className="text-white/75 text-xs">Cosmic insights & zodiac wisdom</p>
                </div>
                <button
                  onClick={() => setAstrologyEnabled(!astrologyEnabled)}
                  role="switch"
                  aria-checked={astrologyEnabled}
                  aria-label="Astrology mode"
                  className={`w-12 h-7 rounded-full transition-all press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
                    astrologyEnabled ? 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full shadow-lg transition-transform ${
                      astrologyEnabled ? 'bg-white translate-x-6' : 'bg-white translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {astrologyEnabled && (
                <div className="space-y-4">
                  <p className="text-sm text-white/85">Select your zodiac sign for personalized cosmic insights</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ZODIAC_SIGNS.map((sign) => (
                      <button
                        key={sign.id}
                        onClick={() => setZodiacSign(sign.id)}
                        aria-pressed={zodiacSign === sign.id}
                        className={`p-3 rounded-xl text-center transition-all press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
                          zodiacSign === sign.id
                            ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 shadow-[inset_0_0_12px_rgba(139,92,246,0.15)]'
                            : 'bg-white/5 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        <span className="text-xl block mb-0.5">{sign.symbol}</span>
                        <p className={`text-xs font-medium ${zodiacSign === sign.id ? 'text-white' : 'text-white/95'}`}>{sign.label}</p>
                        <p className="text-[9px] text-white/75 mt-0.5">{sign.dates}</p>
                      </button>
                    ))}
                  </div>
                  {zodiacSign && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                      <p className="text-sm text-white/80">
                        <span className="text-indigo-400 font-medium">{ZODIAC_SIGNS.find(s => s.id === zodiacSign)?.label}</span> selected.
                        You&apos;ll receive cosmic insights tailored to your sign in your Morning Flow.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SettingsCategory>
        )}

        {/* ═══════════════ 5. Notifications ═══════════════ */}
        <SettingsCategory
          id="notifications"
          icon={Bell}
          title="Notifications"
          description="Push notification settings"
        >
          <NotificationSettings />
        </SettingsCategory>

        {/* ═══════════════ 7. Language ═══════════════ */}
        <SettingsCategory
          id="language"
          icon={Globe}
          title="Language"
          description="App display language"
        >
          <div>
            <p className="text-sm text-white/85 mb-3">Display Language</p>
            <LanguageSelector currentLocale={locale as any} onLocaleChange={(l) => { setLocale(l); localStorage.setItem('voxu_locale', l) }} />
          </div>
        </SettingsCategory>

        {/* ═══════════════ 8. Account ═══════════════ */}
        <SettingsCategory
          id="account"
          icon={Crown}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/20"
          title="Account"
          description="Subscription, sign in/out"
        >
          {/* Subscription */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-white text-sm">Subscription</p>
              {subscription?.isPremium && <PremiumBadge size="sm" />}
            </div>

            {/* Subscription message */}
            {subscriptionMessage && (
              <div role="status" className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                {subscriptionMessage}
              </div>
            )}

            {subscription?.isPremium ? (
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
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
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
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 text-white/95 text-sm hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Plans
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/15">
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
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:from-amber-400 hover:to-orange-400 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none shimmer-cta"
                >
                  <Sparkles className="w-5 h-5" />
                  Upgrade to Premium - $4.99/mo
                </button>
                <p className="text-center text-white/95 text-xs">
                  7-day free trial · Cancel anytime
                </p>
                <Link
                  href="/pricing"
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 text-white/95 text-sm hover:bg-white/10 hover:text-white transition-colors mt-2 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  <ExternalLink className="w-4 h-4" />
                  Compare plans
                </Link>
              </div>
            )}
          </div>

          {/* Sign In / Sign Out */}
          <div className="pt-2">
            {isAuthenticated ? (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/15 text-red-400 hover:bg-red-500/20 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            ) : (
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/15 text-white hover:bg-white/20 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                Sign In to Save Progress
              </Link>
            )}
          </div>

          {/* App Info */}
          <div className="text-center pt-2 pb-2">
            <p className="text-white/50 text-sm">Voxu v0.1.0</p>
            <p className="text-white/50 text-xs mt-1">Your AI Audio Coach</p>
          </div>
        </SettingsCategory>
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
