'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { DailyRhythmPage } from '@/components/settings/DailyRhythmPage'
import { MindsetCoachingPage } from '@/components/settings/MindsetCoachingPage'
import { syncLocalReminders } from '@/lib/notifications'
import { isNativeApp } from '@/lib/native'
import { listPrices, usd } from '@/lib/pricing'
import { signOutWidget } from '@/lib/widget-sync'
import {
  Bell,
  LogOut,
  ChevronLeft,
  Briefcase,
  Layers,
  Sparkles,
  Lightbulb,
  Check,
  Loader2,
  Crown,
  CreditCard,
  ExternalLink,
  Lock,
  Star,
  Compass,
  Shield,
  FileText,
  Trash2,
  RefreshCw,
  Download,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'
import { NotificationModePicker } from '@/components/notifications/NotificationModePicker'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'
import { PremiumBadge, ProLabel } from '@/components/premium'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { SettingsCategory } from '@/components/settings/SettingsCategory'
import { SettingsIndex } from '@/components/settings/SettingsIndex'
import { SettingsExtraPage, EXTRA_PAGES } from '@/components/settings/SettingsExtraPages'
import { SettingsSectionContext } from '@/components/settings/SettingsSectionContext'
import { HomeShelvesSetting } from '@/components/settings/HomeShelvesSetting'
import { GuideReminderSettings } from '@/components/settings/GuideReminderSettings'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { trackFeature } from '@/lib/analytics/track'
import { PreferredNameField } from '@/components/settings/PreferredNameField'

import { Capacitor } from '@capacitor/core'
import { restorePurchases } from '@/lib/revenuecat'
import { TRIAL_DAYS } from '@/lib/subscription-constants'

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Settings is an index; each row opens /settings?s=<id> (SettingsIndex).
  const section = searchParams.get('s')
  useEffect(() => {
    // Old links like /settings#ai-memory open that section's page.
    if (section) return
    const hash = window.location.hash.slice(1)
    if (hash && (hash in SECTION_TITLES || hash in EXTRA_PAGES)) router.replace(`/settings?s=${hash}`)
  }, [section, router])
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
  const [wakeTime, setWakeTime] = useState('07:00')
  const [workStartTime, setWorkStartTime] = useState('09:00')
  const [workEndTime, setWorkEndTime] = useState('17:00')
  const [dailyReminder, setDailyReminder] = useState(true)
  const [reminderTime, setReminderTime] = useState('07:00')
  const [bedtimeReminderEnabled, setBedtimeReminderEnabled] = useState(false)
  const [bedtimeTime, setBedtimeTime] = useState('')
  const [middayEnabled, setMiddayEnabled] = useState(true)
  const [middayTime, setMiddayTime] = useState('13:00')
  const [winddownEnabled, setWinddownEnabled] = useState(true)
  const [winddownTime, setWinddownTime] = useState('19:00')
  const [aiMemoryEnabled, setAiMemoryEnabled] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  // Track settings page open
  useEffect(() => { trackFeature('settings', 'open') }, [])

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

          // For guests, merge localStorage prefs over server defaults
          if (data.isGuest) {
            try {
              const saved = localStorage.getItem('voxu_guest_prefs')
              if (saved) {
                const local = JSON.parse(saved)
                Object.assign(data, local)
              }
            } catch {}
          }

          if (data.wake_time) setWakeTime(data.wake_time)
          if (data.work_start_time) setWorkStartTime(data.work_start_time)
          if (data.work_end_time) setWorkEndTime(data.work_end_time)
          if (data.daily_reminder !== undefined) setDailyReminder(data.daily_reminder)
          if (data.reminder_time) setReminderTime(data.reminder_time)
          if (data.bedtime_reminder_enabled !== undefined) setBedtimeReminderEnabled(data.bedtime_reminder_enabled)
          if (data.bedtime_reminder_time) setBedtimeTime(data.bedtime_reminder_time)
          if (data.midday_reminder_enabled !== undefined) setMiddayEnabled(data.midday_reminder_enabled)
          if (data.midday_reminder_time) setMiddayTime(data.midday_reminder_time)
          if (data.winddown_reminder_enabled !== undefined) setWinddownEnabled(data.winddown_reminder_enabled)
          if (data.winddown_reminder_time) setWinddownTime(data.winddown_reminder_time)
          if (data.ai_memory_enabled !== undefined) setAiMemoryEnabled(data.ai_memory_enabled)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          daily_reminder: dailyReminder,
          reminder_time: reminderTime,
          bedtime_reminder_enabled: bedtimeReminderEnabled,
          bedtime_reminder_time: bedtimeTime || null,
          midday_reminder_enabled: middayEnabled,
          midday_reminder_time: middayTime || null,
          winddown_reminder_enabled: winddownEnabled,
          winddown_reminder_time: winddownTime || null,
          ai_memory_enabled: aiMemoryEnabled,
          // Always include timezone so notification scheduling uses correct local time
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
        }),
      })
      const data = await response.json()
      if (response.ok && data.isGuest) {
        // Guest: persist to localStorage
        try {
          // Merge: the Voxu Voice page keeps the guest's tone in here too.
          let prev: Record<string, unknown> = {}
          try { prev = JSON.parse(localStorage.getItem('voxu_guest_prefs') || '{}') } catch {}
          localStorage.setItem('voxu_guest_prefs', JSON.stringify({
            ...prev,
            daily_reminder: dailyReminder, reminder_time: reminderTime,
            bedtime_reminder_enabled: bedtimeReminderEnabled,
          }))
        } catch {}
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else if (response.ok) {
        // Reminder times changed → the phone's own reminders follow (native).
        void syncLocalReminders()
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
  }, [dailyReminder, reminderTime, bedtimeReminderEnabled, bedtimeTime, middayEnabled, middayTime, winddownEnabled, winddownTime, aiMemoryEnabled])

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

  const handleSignOut = async () => {
    // Clear all voxu_* and sb-* keys to prevent stale data leaking between accounts
    if (typeof window !== 'undefined') {
      const storages = [localStorage, sessionStorage]
      for (const storage of storages) {
        const keysToRemove: string[] = []
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (key && (key.startsWith('voxu_') || key.startsWith('sb-'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => storage.removeItem(key))
      }
    }
    await signOutWidget()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch('/api/user/delete-account', { method: 'POST' })
      if (!response.ok) throw new Error('Delete failed')
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Account deletion failed:', error)
      setIsDeleting(false)
      setDeleteConfirmOpen(false)
    }
  }

  const handleRestorePurchases = async () => {
    setIsRestoring(true)
    try {
      const hasPremium = await restorePurchases()
      if (hasPremium) {
        subscription?.refreshSubscription()
      }
    } catch (error) {
      console.error('Restore failed:', error)
    } finally {
      setIsRestoring(false)
    }
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain text-white pb-[calc(env(safe-area-inset-bottom)+6rem)]"
      data-app-shell
    >
      {/* App-shell scroll: this container scrolls, the document does not.
      iOS rubber-bands the document past its ends and the whole visual
      viewport moves with it, carrying any sticky/fixed header along.
      Scrolling a container with overscroll-contain removes the bounce,
      so the header actually holds still. */}
      {/* Header */}
      <div className="sticky top-0 z-50 px-6 safe-area-pt pb-4 mb-4 bg-black">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
        <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link href={section ? '/settings' : '/'} aria-label={section ? 'Back to Settings' : 'Back to home'} className="p-2 -ml-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none">
              <ChevronLeft className="w-5 h-5 text-white/70" />
            </Link>
            <h1 className="text-px-28 text-white" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 600 }}>{section ? (SECTION_TITLES[section] ?? 'Settings') : 'Settings'}</h1>
          </div>
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-white/50 text-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-white text-sm">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span role="alert" className="text-white text-sm">Failed to save</span>
          )}
        </div>
        <p className="text-white/65 text-sm mt-1">{section ? (EXTRA_PAGES[section]?.sub ?? SECTION_SUBS[section] ?? '') : 'Your Voxu, your way.'}</p>
        </div>
      </div>

      <SettingsSectionContext.Provider value={section}>
      <div className="px-6 md:px-0 space-y-3 max-w-lg mx-auto">
        {!section && (
          <SettingsIndex
            isPremium={!!subscription?.isPremium}
            isTrialing={!!subscription?.isTrialing}
            onUpgrade={() => subscription?.openUpgradeModal()}
            rhythm={rhythmSummary(wakeTime, workStartTime, workEndTime)}
            name={null}
          />
        )}
        {section && <SettingsExtraPage section={section} />}
        {/* ═══════════════ 1. Profile & Schedule ═══════════════ */}
        <SettingsCategory
          id="profile-schedule"
          icon={Briefcase}
          title="Profile & Schedule"
          description="User type, work/class days, schedule times"
          defaultOpen
        >
          {/* Owns wake/workday/rhythm and saves them itself (/api/rhythm). */}
          <DailyRhythmPage />
        </SettingsCategory>

        {/* Only on a build that has the widget (components/widget/WidgetSetup). */}

        {/* ═══════════════ 2. Daily Experience ═══════════════ */}
        <SettingsCategory
          id="daily-experience"
          icon={Layers}
          title="Daily Experience"
          description="Segments, voice tone, what home shows"
        >
          {/* Which shelves home carries. A preference, so it belongs here and
              not in the header menu among the page links. */}
          <HomeShelvesSetting />
        </SettingsCategory>

        {/* Reminders section removed — merged into Notifications below */}

        {/* ═══════════════ 4. Your Mindset ═══════════════ */}
        <SettingsCategory
          id="mindset"
          icon={Compass}
          title="Your Mindset"
          description={mindsetCtx ? MINDSET_CONFIGS[mindsetCtx.mindset].subtitle : 'Philosophy & path'}
        >
          <MindsetCoachingPage />
        </SettingsCategory>

        {/* ═══════════════ 5. Notifications ═══════════════ */}
        <SettingsCategory
          id="notifications"
          icon={Bell}
          title="Notifications"
          description="Push notifications & reminders"
        >
          <div className="mb-4"><NotificationModePicker /></div>
          <p className="card-eyebrow px-1 mb-2">Today&rsquo;s audio reminders</p>
          <GuideReminderSettings
            values={{
              dailyReminder,
              reminderTime,
              middayEnabled,
              middayTime,
              winddownEnabled,
              winddownTime,
              bedtimeEnabled: bedtimeReminderEnabled,
              bedtimeTime,
            }}
            onChange={(patch) => {
              // Record every on/off so opt-out rates are visible. Midday and
              // Wind Down were added to everyone's day at once; without this
              // there is no way to tell whether people accepted them or
              // quietly switched them off.
              const toggles: Array<[keyof typeof patch, string]> = [
                ['dailyReminder', 'morning_prime'],
                ['middayEnabled', 'midday_reset'],
                ['winddownEnabled', 'wind_down'],
                ['bedtimeEnabled', 'bedtime_story'],
              ]
              for (const [key, segment] of toggles) {
                const next = patch[key]
                if (typeof next === 'boolean') {
                  trackFeature('daily_guide', next ? 'enable' : 'disable', `reminder:${segment}`)
                }
              }

              if (patch.dailyReminder !== undefined) setDailyReminder(patch.dailyReminder)
              if (patch.reminderTime !== undefined) setReminderTime(patch.reminderTime)
              if (patch.middayEnabled !== undefined) setMiddayEnabled(patch.middayEnabled)
              if (patch.middayTime !== undefined) setMiddayTime(patch.middayTime)
              if (patch.winddownEnabled !== undefined) setWinddownEnabled(patch.winddownEnabled)
              if (patch.winddownTime !== undefined) setWinddownTime(patch.winddownTime)
              if (patch.bedtimeEnabled !== undefined) setBedtimeReminderEnabled(patch.bedtimeEnabled)
              if (patch.bedtimeTime !== undefined) setBedtimeTime(patch.bedtimeTime)
            }}
          />

          <div className="border-t border-white/5 pt-2 mt-4" />

          <NotificationSettings />
        </SettingsCategory>
        {/* ═══════════════ 6. AI Memory ═══════════════ */}
        <SettingsCategory
          id="ai-memory"
          icon={Sparkles}
          title="AI Memory"
          description="What the AI chat is allowed to remember"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="pr-4">
                <p className="font-medium text-white text-sm">Let the chat remember me</p>
                {/* This line is the consent. It has to name everything the
                    chat reads — the behaviour counts were added after the
                    original wording, and a toggle that says "journal" while
                    the prompt also carries what you kept is not consent. */}
                <p className="text-white/75 text-xs">
                  Your journal, your saved quotes, and how often you kept your promises and
                  disciplines
                </p>
              </div>
              <button
                onClick={() => setAiMemoryEnabled(!aiMemoryEnabled)}
                role="switch"
                aria-checked={aiMemoryEnabled}
                aria-label="Let the AI chat remember your journal, saved quotes and how often you kept your promises and disciplines"
                className={`shrink-0 w-12 h-7 rounded-full transition-all press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
                  aiMemoryEnabled ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.25)]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full shadow-lg transition-transform ${
                    aiMemoryEnabled ? 'bg-white translate-x-6' : 'bg-white translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-white/55 leading-relaxed">
              {aiMemoryEnabled
                ? 'The chat can refer back to what you’ve written and saved, and to how often you kept your promises and disciplines — counts only, never a score. So it notices patterns instead of meeting you fresh each time. Turn this off at any time: it stops reading immediately, and nothing you wrote is deleted.'
                : 'Off. The chat sees only the conversation in front of it — it cannot read your journal, your saved quotes, or whether you kept anything.'}
            </p>
          </div>
        </SettingsCategory>


        {/* ═══════════════ 8. Account ═══════════════ */}
        <SettingsCategory
          id="account"
          icon={Crown}
          iconColor="text-white"
          iconBg="bg-white/20"
          title="Account"
          description="Your name, subscription, sign in/out"
        >
          {/* The name the coach and the journal actually use. */}
          <PreferredNameField />

          {/* Subscription */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-white text-sm">Subscription</p>
              {subscription?.isPremium && <PremiumBadge size="sm" />}
            </div>

            {/* Subscription message */}
            {subscriptionMessage && (
              <div role="status" className="mb-4 p-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm">
                {subscriptionMessage}
              </div>
            )}

            {subscription?.isPremium ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-white/10 to-white/10 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      {subscription.isTrialing ? 'Premium Trial' : 'Premium Plan'}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/20 text-white">
                      Active
                    </span>
                  </div>
                  {subscription.isTrialing && subscription.trialDaysLeft > 0 && (
                    <p className="text-sm text-white/70">
                      {subscription.trialDaysLeft} days left in trial
                    </p>
                  )}
                  {subscription.billingPeriodEnd && !subscription.isTrialing && (
                    <p className="text-sm text-white/70">
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
                    onClick={e => { if (isNativeApp()) { e.preventDefault(); subscription?.openUpgradeModal() } }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Plans
                  </Link>
                </div>

                {Capacitor.isNativePlatform() && (
                  <button
                    onClick={handleRestorePurchases}
                    disabled={isRestoring}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/15 text-white/70 text-sm hover:bg-white/10 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                  >
                    {isRestoring ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Restore Purchases
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* This card was stale by two generations of the product:
                    "1 session/day · 10-min limit", "Daily checkpoints
                    locked", "Genre selection locked", "Journal history
                    locked" — none of which is true. Free is 99 sessions a
                    day with no duration cap, checkpoints are on, genres are
                    free for everyone, and free journal history is seven
                    days. It was talking people out of a better free tier
                    than they had. What it says now is what the code does. */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/15">
                  <p className="text-white font-medium mb-1">Free Plan</p>
                  <p className="text-sm text-white/70 mb-3">
                    Your era, your disciplines and unlimited sessions — no time limit.
                  </p>
                  <ul className="space-y-2 text-sm text-white/70">
                    <li className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" />
                      20 coaching conversations a week
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" />
                      7 spoken replies a week
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" />
                      The coach reads today, not your last 30 days
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => subscription?.openUpgradeModal()}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none shimmer-cta"
                >
                  <Sparkles className="w-5 h-5" />
                  Upgrade to Premium · {usd(listPrices().monthly)}/mo
                </button>
                <p className="text-center text-white/50 text-xs">
                  {TRIAL_DAYS}-day free trial · Cancel anytime
                </p>
                <Link
                  href="/pricing"
                  onClick={e => { if (isNativeApp()) { e.preventDefault(); subscription?.openUpgradeModal() } }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 text-white/70 text-sm hover:bg-white/10 hover:text-white transition-colors mt-2 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  <ExternalLink className="w-4 h-4" />
                  Compare plans
                </Link>

                {Capacitor.isNativePlatform() && (
                  <button
                    onClick={handleRestorePurchases}
                    disabled={isRestoring}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/15 text-white/70 text-sm hover:bg-white/10 transition-colors disabled:opacity-40 mt-2 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                  >
                    {isRestoring ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Restore Purchases
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sign In / Sign Out */}
          <div className="pt-2 space-y-3">
            {isAuthenticated ? (
              <>
                {/* Export. Deliberately above Sign Out and Delete: the
                    most likely moment someone wants a copy of their
                    journal is right before they leave. */}
                <a
                  href="/api/account/export"
                  download
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/15 text-white hover:bg-white/20 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  <Download className="w-5 h-5" />
                  Export My Data
                </a>
                <p className="text-px-11 text-white/45 text-center -mt-1">
                  Your journal, saved items, goals and preferences, as JSON.
                </p>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/15 text-white hover:bg-white/20 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>

                {/* Delete Account */}
                {!deleteConfirmOpen ? (
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-white/60 text-sm hover:text-white hover:bg-white/10 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-white/10 border border-white/20 space-y-3">
                    <p className="text-white text-sm font-medium">Are you sure?</p>
                    <p className="text-white/60 text-xs">
                      This will permanently delete your account and all your data. This action cannot be undone.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDeleteConfirmOpen(false)}
                        disabled={isDeleting}
                        className="p-3 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="p-3 rounded-xl bg-white/20 border border-white/30 text-white text-sm hover:bg-white/30 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                      >
                        {isDeleting ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Deleting...
                          </span>
                        ) : (
                          'Delete Forever'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/15 text-white hover:bg-white/20 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                Sign In to Save Progress
              </Link>
            )}
          </div>

          {/* Legal Links */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/privacy"
              className="flex items-center gap-1.5 text-white/50 text-sm hover:text-white/70 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              <Shield className="w-3.5 h-3.5" />
              Privacy Policy
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href="/terms"
              className="flex items-center gap-1.5 text-white/50 text-sm hover:text-white/70 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              <FileText className="w-3.5 h-3.5" />
              Terms of Service
            </Link>
          </div>

          {/* App Info */}
          <div className="text-center pt-2 pb-2">
            <p className="text-white/50 text-sm">Voxu v0.1.0</p>
            <p className="text-white/50 text-xs mt-1">30 days, one promise a day</p>
          </div>
        </SettingsCategory>
      </div>
      </SettingsSectionContext.Provider>
    </div>
  )
}

/** Each existing section's page title (SettingsCategory ids). */
const SECTION_TITLES: Record<string, string> = {
  'profile-schedule': 'Daily Rhythm',
  'daily-experience': 'Home',
  mindset: 'Mindset & Coaching',
  notifications: 'Notifications',
  'ai-memory': 'Voxu Memory',
  account: 'Profile & Account',
  ...Object.fromEntries(Object.entries(EXTRA_PAGES).map(([k, v]) => [k, v.title])),
}
const SECTION_SUBS: Record<string, string> = {
  'profile-schedule': 'Teach Voxu when you’re awake, working, and winding down.',
  'daily-experience': 'Choose what your Home shows.',
  mindset: 'Choose how Voxu challenges, supports, and speaks to you.',
  notifications: 'What Voxu sends, when, and how often.',
  'ai-memory': 'What Voxu may remember about you.',
  account: 'Your name, your plan, signing in and out.',
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  if (!Number.isFinite(h)) return t
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
/** "Up at 5:30 AM · Workday 9:00 AM–5:00 PM" for the Daily Rhythm row. */
function rhythmSummary(wake: string, ws: string, we: string): string {
  return `Up at ${fmtTime(wake)} · Workday ${fmtTime(ws)}–${fmtTime(we)}`
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SettingsContent />
    </Suspense>
  )
}
