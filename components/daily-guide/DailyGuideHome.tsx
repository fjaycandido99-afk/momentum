'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Loader2,
  Sunrise,
  Sun,
  Moon,
} from 'lucide-react'
import { SessionCard, SessionTimeline } from './SessionCard'
import { QuoteCard } from './QuoteCard'
import { SmartNudgeBanner } from './SmartNudgeBanner'
import { MorningBriefing } from './MorningBriefing'
import { StreakBadge } from './StreakDisplay'
import { JournalEntry } from './JournalEntry'
import { XPReward } from './XPReward'
import { logXPEventServer, XP_REWARDS } from '@/lib/gamification'
import { MoodCheckIn } from './MoodCheckIn'
import { JournalLookback } from './JournalLookback'
import { CosmicInsightCard } from './CosmicInsightCard'
import { getFormattedDate, getDateString } from '@/lib/daily-guide/day-type'
import { getCurrentSession, getAllSessionsStatus, SESSION_DURATIONS } from '@/lib/daily-guide/decision-tree'
import type { SessionType, SessionStatus } from '@/lib/daily-guide/decision-tree'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { trackFeature } from '@/lib/analytics/track'
import { useAudioOptional } from '@/contexts/AudioContext'
import { SessionLimitBanner } from '@/components/premium/SessionLimitBanner'
import { TrialBanner, TrialEndingBanner } from '@/components/premium/TrialBanner'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { useAchievementOptional } from '@/contexts/AchievementContext'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'
import { MoodTintOverlay } from '@/components/ui/MoodTintOverlay'
import { useScrollHeader } from '@/hooks/useScrollHeader'

// Map mood string values to numeric 1-5 for MoodTintOverlay
function moodToNumeric(mood: string | null): 1 | 2 | 3 | 4 | 5 | null {
  if (!mood) return null
  const map: Record<string, 1 | 2 | 3 | 4 | 5> = {
    awful: 1, low: 2, medium: 3, okay: 3, good: 4, high: 5, great: 5,
  }
  return map[mood] || null
}

// Per-mindset address terms
const MINDSET_ADDRESS: Record<string, string> = {
  stoic: 'philosopher',
  existentialist: 'creator',
  cynic: 'truth-seeker',
  hedonist: 'friend',
  samurai: 'warrior',
  scholar: 'seeker',
}

// Get time-based greeting with icon
function getTimeGreeting(mindsetId?: string): { text: string; icon: typeof Sunrise; period: 'morning' | 'afternoon' | 'evening' } {
  const hour = new Date().getHours()
  const suffix = mindsetId && MINDSET_ADDRESS[mindsetId] ? `, ${MINDSET_ADDRESS[mindsetId]}` : ''
  if (hour < 12) return { text: `Good morning${suffix}`, icon: Sunrise, period: 'morning' }
  if (hour < 17) return { text: `Good afternoon${suffix}`, icon: Sun, period: 'afternoon' }
  return { text: `Good evening${suffix}`, icon: Moon, period: 'evening' }
}

// Session script field mapping
const SESSION_SCRIPT_FIELDS: Record<SessionType, string> = {
  morning_prime: 'morning_prime_script',
  midday_reset: 'midday_reset_script',
  wind_down: 'wind_down_script',
  bedtime_story: 'bedtime_story_script',
}

// Session done field mapping
const SESSION_DONE_FIELDS: Record<SessionType, string> = {
  morning_prime: 'morning_prime_done',
  midday_reset: 'midday_reset_done',
  wind_down: 'wind_down_done',
  bedtime_story: 'bedtime_story_done',
}

interface AudioData {
  script: string
  audioBase64: string | null
  duration: number
}

interface DailyGuideHomeProps {
  embedded?: boolean
}

export function DailyGuideHome({ embedded = false }: DailyGuideHomeProps) {
  const subscription = useSubscriptionOptional()
  const audioContext = useAudioOptional()
  const mindsetCtx = useMindsetOptional()
  const achievementCtx = useAchievementOptional()

  // Core state
  const [guide, setGuide] = useState<Record<string, any> | null>(null)
  const [preferences, setPreferences] = useState<Record<string, any> | null>(null)
  const [streak, setStreak] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Session state
  const [activeSession, setActiveSession] = useState<SessionType>(() => getCurrentSession())
  const [completedSessions, setCompletedSessions] = useState<SessionType[]>([])
  const [loadingSession, setLoadingSession] = useState<SessionType | null>(null)
  const [sessionAudio, setSessionAudio] = useState<Record<string, AudioData>>({})

  // Mood tracking
  const [moodBefore, setMoodBefore] = useState<string | null>(null)
  const [moodAfter, setMoodAfter] = useState<string | null>(null)

  // XP reward
  const [xpRewardAmount, setXPRewardAmount] = useState(0)
  const [showXPReward, setShowXPReward] = useState(false)

  const isMountedRef = useRef(true)
  const guideScrollRef = useRef<HTMLDivElement>(null)
  const { scrolled: headerScrolled } = useScrollHeader(guideScrollRef)
  const audioContextRef = useRef(audioContext)
  audioContextRef.current = audioContext

  const [todayKey, setTodayKey] = useState(() => getDateString(new Date()))
  const today = new Date()
  const wakeTime = preferences?.wake_time || '07:00'

  // Get session statuses for timeline
  const sessionStatuses = getAllSessionsStatus(completedSessions, today, wakeTime)

  // Fetch guide data
  const fetchData = useCallback(async () => {
    const freshDate = getDateString(new Date())
    const minDelay = new Promise(resolve => setTimeout(resolve, 300))
    try {
      const [guideRes, prefsRes] = await Promise.all([
        fetch('/api/daily-guide/generate?date=' + freshDate, { cache: 'no-store' }),
        fetch('/api/daily-guide/preferences', { cache: 'no-store' }),
        minDelay,
      ]) as [Response, Response, unknown]

      if (!isMountedRef.current) return

      if (prefsRes.ok) {
        const prefsData = await prefsRes.json()
        if (!isMountedRef.current) return
        setPreferences(prefsData)
      }

      if (!isMountedRef.current) return

      if (guideRes.ok) {
        const guideData = await guideRes.json()
        if (!isMountedRef.current) return

        if (guideData.data) {
          setGuide(guideData.data)
          setStreak(guideData.streak || 0)

          // Load completed sessions
          const completed: SessionType[] = []
          if (guideData.data.morning_prime_done) completed.push('morning_prime')
          if (guideData.data.midday_reset_done) completed.push('midday_reset')
          if (guideData.data.wind_down_done) completed.push('wind_down')
          if (guideData.data.bedtime_story_done) completed.push('bedtime_story')
          setCompletedSessions(completed)

          // Load mood data
          if (guideData.data.mood_before) setMoodBefore(guideData.data.mood_before)
          if (guideData.data.mood_after) setMoodAfter(guideData.data.mood_after)
        } else {
          // No guide yet — auto-generate
          generateGuide()
        }
      } else if (guideRes.status === 401) {
        // Guest — set demo guide
        setGuide({ id: 'demo', date: getDateString(new Date()) })
      } else {
        generateGuide()
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      if (!isMountedRef.current) return
      setGenerationError('Failed to load your guide. Pull down to retry.')
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchData()
    return () => { isMountedRef.current = false }
  }, [fetchData])

  // Re-fetch when app resumes on a new day (native app stays mounted overnight)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const newKey = getDateString(new Date())
      if (newKey !== todayKey) {
        setTodayKey(newKey)
        setCompletedSessions([])
        setActiveSession(getCurrentSession())
        setMoodBefore(null)
        setMoodAfter(null)
        setGuide(null)
        setIsLoading(true)
        fetchData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [todayKey, fetchData])

  // Cleanup session active on unmount
  useEffect(() => {
    return () => { audioContextRef.current?.setSessionActive(false) }
  }, [])

  // Generate guide
  const generateGuide = async () => {
    setIsGenerating(true)
    setGenerationError(null)
    try {
      const response = await fetch('/api/daily-guide/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: getDateString(new Date()), forceRegenerate: false }),
      })

      if (response.ok) {
        const data = await response.json()
        setGuide(data.data)
        setStreak(data.streak || 0)
      } else {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          setGuide({ id: 'demo', date: getDateString(new Date()) })
        } else {
          setGenerationError(errorData.error || 'Failed to generate guide')
        }
      }
    } catch (error) {
      console.error('Error generating guide:', error)
      setGenerationError('Network error. Please check your connection.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Play a session — fetch audio from voices API
  const playSession = async (session: SessionType) => {
    trackFeature('daily_guide', 'use')
    setLoadingSession(session)

    // Free users get audio for morning_prime only, other sessions are text-only
    const isFreeUser = subscription && !subscription.isPremium && !subscription.checkAccess('ai_voice')
    const isTextOnly = isFreeUser && session !== 'morning_prime'

    // Guest tone preference
    let guestTone: string | undefined
    try {
      const guestPrefs = localStorage.getItem('voxu_guest_prefs')
      if (guestPrefs) guestTone = JSON.parse(guestPrefs).guide_tone
    } catch {}

    try {
      // Map session types to voices API types
      // morning_prime uses affirmation audio as placeholder until dedicated audio is seeded
      const voiceTypeMap: Record<SessionType, string> = {
        morning_prime: 'affirmation',
        midday_reset: 'midday_reset',
        wind_down: 'wind_down',
        bedtime_story: 'bedtime_story',
      }

      const response = await fetch('/api/daily-guide/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: voiceTypeMap[session],
          textOnly: !!isTextOnly,
          ...(guestTone && { tone: guestTone }),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSessionAudio(prev => ({
          ...prev,
          [session]: {
            script: data.script,
            audioBase64: data.audioBase64,
            duration: data.duration || SESSION_DURATIONS[session],
          },
        }))
      } else {
        console.error(`[DailyGuideHome] Audio fetch failed for ${session}:`, response.status)
      }
    } catch (error) {
      console.error('Error loading audio:', error)
    } finally {
      setLoadingSession(null)
    }
  }

  // Complete a session
  const completeSession = async (session: SessionType) => {
    trackFeature('daily_guide', 'complete')

    // Award XP
    logXPEventServer('moduleComplete').then(result => {
      if (result?.newAchievements?.length && achievementCtx) {
        achievementCtx.triggerAchievements(result.newAchievements)
      }
    })
    setXPRewardAmount(XP_REWARDS.moduleComplete)
    setShowXPReward(false)
    setTimeout(() => setShowXPReward(true), 10)

    // Optimistic update
    setCompletedSessions(prev => [...new Set([...prev, session])])

    // Save to server
    try {
      const res = await fetch('/api/daily-guide/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment: session,
          date: guide?.date,
        }),
      })
      if (!res.ok) {
        const t = await res.text()
        console.error(`[${session} checkin] failed:`, res.status, t)
      }
    } catch (err) {
      console.error(`[${session} checkin] error:`, err)
    }
  }

  // Get script for a session from guide data
  const getSessionScript = (session: SessionType): string | null => {
    if (!guide) return null
    const field = SESSION_SCRIPT_FIELDS[session]
    return guide[field] || null
  }

  // Determine current greeting period for mood check-in logic
  const greeting = getTimeGreeting(mindsetCtx?.mindset)
  const isPremium = subscription?.isPremium ?? false
  const isCurrentEvening = activeSession === 'wind_down' || activeSession === 'bedtime_story'

  if (isLoading) {
    return (
      <div className={embedded ? 'bg-black pb-8' : 'min-h-screen bg-black pb-32'}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      </div>
    )
  }

  return (
    <div ref={guideScrollRef} className={embedded ? 'bg-black pb-8' : 'min-h-screen bg-black pb-32'}>
      {/* Mood-reactive tint overlay */}
      <MoodTintOverlay mood={moodToNumeric(moodAfter || moodBefore)} />

      {/* Trial Banners */}
      {!embedded && <TrialBanner variant="compact" />}
      {!embedded && <TrialEndingBanner />}

      {/* Header */}
      <div className="sticky top-0 z-50 p-6 pt-12 mb-4 bg-black/95 backdrop-blur-xl animate-fade-in-down">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />

        {/* Greeting */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {(() => {
              const GreetingIcon = greeting.icon
              return (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white/10">
                    <GreetingIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm text-white">{greeting.text}</span>
                    <p className="text-[11px] text-white/70">{getFormattedDate(today)}</p>
                  </div>
                </div>
              )
            })()}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StreakBadge streak={streak} />
            {mindsetCtx && (
              <div className="flex items-center justify-center px-1.5 py-1 rounded-full bg-white/[0.06]">
                <MindsetIcon mindsetId={mindsetCtx.mindset} className="w-4 h-4 text-white/75" />
              </div>
            )}
          </div>
        </div>

        {/* Session Timeline */}
        <SessionTimeline
          sessions={sessionStatuses.map(s => ({
            id: s.session.id,
            status: s.status,
          }))}
          onSelect={(id) => setActiveSession(id)}
          activeSession={activeSession}
        />
      </div>

      {/* Session Limit Banner */}
      <div className="px-6 mb-4">
        <SessionLimitBanner />
      </div>

      {/* Error state */}
      {generationError && (
        <div className="px-6 mb-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400 mb-3">{generationError}</p>
            <button
              onClick={() => { setGenerationError(null); generateGuide() }}
              className="text-sm text-white/85 hover:text-white underline"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {guide && (
        <div className="px-6 space-y-6 animate-slide-up-enter">

          {/* Demo banner for guests */}
          {guide.id === 'demo' && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/15">
              <div className="flex-1">
                <p className="text-sm text-white font-medium">Preview Mode</p>
                <p className="text-xs text-white/70">Sign in to save your progress and unlock all features</p>
              </div>
            </div>
          )}

          {/* Morning Mood Check-In */}
          {!moodBefore && greeting.period === 'morning' && (
            <MoodCheckIn
              type="before"
              onSelect={async (mood) => {
                setMoodBefore(mood)
                try {
                  await fetch('/api/daily-guide/checkin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mood_before: mood, date: guide?.date }),
                  })
                } catch (error) {
                  console.error('Error saving mood:', error)
                }
              }}
            />
          )}

          {/* Morning Briefing (premium) — only during morning session */}
          {isPremium && activeSession === 'morning_prime' && !completedSessions.includes('morning_prime') && (
            <MorningBriefing
              onComplete={() => {
                completeSession('morning_prime')
              }}
            />
          )}

          {/* Quote of the Day — show during morning */}
          {activeSession === 'morning_prime' && (
            <QuoteCard
              isCompleted={false}
              mood={moodBefore}
              energy={null}
              dayType="work"
              onComplete={() => {}}
            />
          )}

          {/* Active Session Card */}
          <SessionCard
            session={activeSession}
            script={sessionAudio[activeSession]?.script || getSessionScript(activeSession)}
            duration={SESSION_DURATIONS[activeSession]}
            isCompleted={completedSessions.includes(activeSession)}
            isLoading={loadingSession === activeSession}
            isCurrent={true}
            onPlay={() => playSession(activeSession)}
            onComplete={() => completeSession(activeSession)}
            audioBase64={sessionAudio[activeSession]?.audioBase64}
            textOnly={!!(subscription && !subscription.isPremium && !subscription.checkAccess('ai_voice') && activeSession !== 'morning_prime')}
          />

          {/* Smart Nudge */}
          <SmartNudgeBanner />

          {/* Cosmic Insight — only for scholar mindset */}
          {mindsetCtx?.isScholar && (
            <CosmicInsightCard
              isCompleted={false}
              zodiacSign={preferences?.zodiac_sign}
              dayType="work"
              onComplete={() => {}}
            />
          )}

          {/* Evening extras — journal, mood after, lookback */}
          {isCurrentEvening && completedSessions.includes('wind_down') && (
            <div className="space-y-4">
              {/* Evening Mood Check-In */}
              {!moodAfter && (
                <MoodCheckIn
                  type="after"
                  onSelect={async (mood) => {
                    setMoodAfter(mood)
                    try {
                      await fetch('/api/daily-guide/checkin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mood_after: mood, date: guide?.date }),
                      })
                    } catch (error) {
                      console.error('Error saving mood:', error)
                    }
                  }}
                />
              )}

              <JournalEntry date={today} />
              <JournalLookback />
            </div>
          )}

          {/* Other session cards (non-active, shown below) */}
          {sessionStatuses
            .filter(s => s.session.id !== activeSession)
            .map(s => (
              <SessionCard
                key={s.session.id}
                session={s.session.id}
                script={sessionAudio[s.session.id]?.script || getSessionScript(s.session.id)}
                duration={SESSION_DURATIONS[s.session.id]}
                isCompleted={completedSessions.includes(s.session.id)}
                isLoading={loadingSession === s.session.id}
                isCurrent={false}
                onPlay={() => playSession(s.session.id)}
                onComplete={() => completeSession(s.session.id)}
                audioBase64={sessionAudio[s.session.id]?.audioBase64}
                textOnly={!!(subscription && !subscription.isPremium && !subscription.checkAccess('ai_voice') && s.session.id !== 'morning_prime')}
              />
            ))}
        </div>
      )}

      {/* Generating state */}
      {isGenerating && !guide && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
          <p className="text-sm text-white/50">Preparing your guide...</p>
        </div>
      )}

      {/* XP Reward Toast */}
      <XPReward xp={xpRewardAmount} show={showXPReward} />
    </div>
  )
}
