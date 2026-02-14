'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  RefreshCw,
  Heart,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Music,
  GraduationCap,
  Volume2,
  VolumeX,
  SkipForward,
  Clock,
  Lock,
  Sunrise,
  Sun,
  Moon,
} from 'lucide-react'
import Link from 'next/link'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'
import { DayTypeIndicator } from './DayTypeIndicator'
import { GuidancePlayer } from './GuidancePlayer'
import { EnergyPrompt, EnergySelector } from './EnergyPrompt'
import { ModuleCard, MorningFlowProgress } from './ModuleCard'
import { MicroLessonVideo } from './MicroLessonVideo'
import { QuoteCard } from './QuoteCard'
import { GoalTracker } from './GoalTracker'
import { SmartNudgeBanner } from './SmartNudgeBanner'
import { MorningBriefing } from './MorningBriefing'
import { StreakDisplay } from './StreakDisplay'
import { JournalEntry } from './JournalEntry'
import { MorningFlowComplete } from './MorningFlowComplete'
import { XPReward } from './XPReward'
import { logXPEventServer, XP_REWARDS } from '@/lib/gamification'
import { CheckpointList } from './CheckpointCard'
import { MoodCheckIn } from './MoodCheckIn'
import { JournalLookback } from './JournalLookback'
import { RestDaySuggestion } from './RestDaySuggestion'
import { CosmicInsightCard } from './CosmicInsightCard'
import { getFormattedDate } from '@/lib/daily-guide/day-type'
import { useThemeOptional } from '@/contexts/ThemeContext'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { useAudioOptional } from '@/contexts/AudioContext'
import { SessionLimitBanner } from '@/components/premium/SessionLimitBanner'
import { TrialBanner, TrialEndingBanner } from '@/components/premium/TrialBanner'
import { FeatureLock, LockIcon } from '@/components/premium/FeatureLock'
import { PremiumBadge } from '@/components/premium/PremiumBadge'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { useAchievementOptional } from '@/contexts/AchievementContext'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'
import { FeatureHint } from '@/components/ui/FeatureHint'
import type { DayType, TimeMode, EnergyLevel, ModuleType, CheckpointConfig } from '@/lib/daily-guide/decision-tree'

type UserType = 'professional' | 'student' | 'hybrid'

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

// Get time-of-day gradient for theming
function getTimeGradient(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 8) return 'bg-gradient-to-b from-amber-950/20 to-black'
  if (hour >= 8 && hour < 12) return 'bg-gradient-to-b from-orange-950/15 to-black'
  if (hour >= 12 && hour < 17) return 'bg-gradient-to-b from-sky-950/10 to-black'
  if (hour >= 17 && hour < 20) return 'bg-gradient-to-b from-indigo-950/20 to-black'
  return 'bg-gradient-to-b from-violet-950/15 to-black'
}

interface DailyGuide {
  id: string
  date: string
  day_type: DayType | 'class' | 'study' | 'exam'
  pace: string
  time_mode: TimeMode
  energy_level: EnergyLevel | null
  modules: ModuleType[]
  morning_prime_script: string | null
  movement_script: string | null
  workout_script: string | null
  micro_lesson_script: string | null
  breath_script: string | null
  day_close_script: string | null
  tomorrow_preview: string | null
  checkpoint_1_script: string | null
  checkpoint_2_script: string | null
  checkpoint_3_script: string | null
  // Student-specific
  pre_study_script: string | null
  study_break_script: string | null
  exam_calm_script: string | null
  // Legacy fields
  morning_script: string | null
  evening_script: string | null
  micro_lesson: string | null
  morning_played: boolean
  evening_played: boolean
  // Completion tracking
  morning_prime_done: boolean
  movement_done: boolean
  micro_lesson_done: boolean
  breath_done: boolean
  day_close_done: boolean
  cosmic_insight_done?: boolean
}

interface Preferences {
  user_type: UserType
  work_days: number[]
  work_start_time: string | null
  work_end_time: string | null
  class_days: number[]
  class_start_time: string | null
  class_end_time: string | null
  study_start_time: string | null
  study_end_time: string | null
  exam_mode: boolean
  wake_time: string | null
  default_time_mode: TimeMode
  workout_enabled: boolean
  workout_intensity: string
  background_music_enabled: boolean
  preferred_music_genre: string | null
  current_streak: number
  guide_tone: string
  enabled_segments: string[]
  segment_order: string[]
  // Astrology preferences
  astrology_enabled?: boolean
  zodiac_sign?: string | null
}

interface AudioData {
  script: string
  audioBase64: string | null
  duration: number
}

interface GeneratedGuide {
  data: DailyGuide
  checkpoints: CheckpointConfig[]
  durations: Record<ModuleType, number>
  streak: number
}

const MODULE_LABELS: Record<string, { label: string; activeLabel: string; icon: string }> = {
  morning_prime: { label: 'Morning Greeting', activeLabel: 'Good morning', icon: 'sunrise' },
  movement: { label: 'Quote of the Day', activeLabel: 'Getting inspired', icon: 'sparkles' },
  workout: { label: 'Quote of the Day', activeLabel: 'Getting inspired', icon: 'sparkles' },
  micro_lesson: { label: 'Motivation Video', activeLabel: 'Watching motivation', icon: 'lightbulb' },
  breath: { label: 'Breath', activeLabel: 'Centered breathing', icon: 'wind' },
  day_close: { label: 'Day Close', activeLabel: 'Reflecting', icon: 'moon' },
  pre_study: { label: 'Pre-Study Focus', activeLabel: 'Preparing to study', icon: 'brain' },
  study_break: { label: 'Study Break', activeLabel: 'Taking a break', icon: 'coffee' },
  exam_calm: { label: 'Exam Calm', activeLabel: 'Finding calm', icon: 'shield' },
  cosmic_insight: { label: 'Cosmic Insight', activeLabel: 'Reading the stars', icon: 'star' },
}

const DAY_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  work: { label: 'Work Day', description: 'Focused and productive' },
  off: { label: 'Off Day', description: 'Rest and recharge' },
  recovery: { label: 'Recovery Day', description: 'Gentle and nurturing' },
  class: { label: 'Class Day', description: 'Stay engaged and absorb' },
  study: { label: 'Study Day', description: 'Deep focus mode' },
  exam: { label: 'Exam Day', description: 'Trust yourself' },
}

const MUSIC_GENRES = [
  { id: 'lofi', label: 'Lo-Fi' },
  { id: 'piano', label: 'Piano' },
  { id: 'study', label: 'Study' },
  { id: 'classical', label: 'Classical' },
  { id: 'ambient', label: 'Ambient' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'sleep', label: 'Sleep' },
]

interface DailyGuideHomeProps {
  embedded?: boolean
}

export function DailyGuideHome({ embedded = false }: DailyGuideHomeProps) {
  const themeContext = useThemeOptional()
  const subscription = useSubscriptionOptional()
  const audioContext = useAudioOptional()
  const mindsetCtx = useMindsetOptional()
  const achievementCtx = useAchievementOptional()
  const [guide, setGuide] = useState<DailyGuide | null>(null)
  const [checkpoints, setCheckpoints] = useState<CheckpointConfig[]>([])
  const [durations, setDurations] = useState<Record<ModuleType, number>>({} as Record<ModuleType, number>)
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [streak, setStreak] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingModule, setLoadingModule] = useState<string | null>(null)
  const [completedModules, setCompletedModules] = useState<string[]>([])
  const [showEnergyPrompt, setShowEnergyPrompt] = useState(false)
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel | null>(null)
  const [showDayTypePicker, setShowDayTypePicker] = useState(false)
  const [showMorningFlow, setShowMorningFlow] = useState(true)
  const [showStudentSection, setShowStudentSection] = useState(false)
  const [currentMusicGenre, setCurrentMusicGenre] = useState<string | null>(null)
  const [activePlayer, setActivePlayer] = useState<{
    module: string
    audio: AudioData
    withMusic?: boolean
    musicGenre?: string
  } | null>(null)
  const [showMorningComplete, setShowMorningComplete] = useState(false)
  const [morningCompleteCelebrated, setMorningCompleteCelebrated] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  // XP reward toast
  const [xpRewardAmount, setXPRewardAmount] = useState(0)
  const [showXPReward, setShowXPReward] = useState(false)
  // Mood tracking
  const [moodBefore, setMoodBefore] = useState<string | null>(null)
  const [moodAfter, setMoodAfter] = useState<string | null>(null)
  // Store fetched audio data for inline playback
  const [moduleAudioData, setModuleAudioData] = useState<Record<string, AudioData>>({})
  const isMountedRef = useRef(true)
  // Auto-advance state
  const [justCompletedModule, setJustCompletedModule] = useState<string | null>(null)
  const moduleRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // Quick mode
  const [quickModeActive, setQuickModeActive] = useState(false)
  // Adaptive order banner
  const [showAdaptiveBanner, setShowAdaptiveBanner] = useState(false)

  // Use global audio context for music
  const musicEnabled = audioContext?.musicEnabled ?? false
  const setMusicEnabled = audioContext?.setMusicEnabled ?? (() => {})
  const isMusicPlaying = audioContext?.isMusicPlaying ?? false
  const isMuted = audioContext?.isMuted ?? false
  const toggleMute = audioContext?.toggleMute ?? (() => {})
  const skipTrack = audioContext?.skipTrack ?? (() => {})

  const today = new Date()

  // Get today's music genre (from theme context, user preference, or daily rotation)
  const getTodaysMusicGenre = (preferredGenre?: string | null) => {
    // First check theme context
    if (themeContext?.genre) {
      return themeContext.genre
    }
    // Then check explicit preference
    if (preferredGenre) {
      return preferredGenre
    }
    // Fallback to daily rotation based on day of year
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 0)
    const diff = now.getTime() - startOfYear.getTime()
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
    const genres = ['lofi', 'piano', 'jazz', 'classical', 'ambient', 'study', 'sleep']
    return genres[dayOfYear % genres.length]
  }

  const fetchData = useCallback(async () => {
    const minDelay = new Promise(resolve => setTimeout(resolve, 2500))
    try {
      const [guideRes, prefsRes] = await Promise.all([
        fetch('/api/daily-guide/generate?date=' + today.toISOString(), { cache: 'no-store' }),
        fetch('/api/daily-guide/preferences', { cache: 'no-store' }),
        minDelay,
      ]) as [Response, Response, unknown]

      if (!isMountedRef.current) return

      let prefsData: any = null
      if (prefsRes.ok) {
        prefsData = await prefsRes.json()
        if (!isMountedRef.current) return
        setPreferences(prefsData)
        const genre = prefsData.preferred_music_genre || getTodaysMusicGenre(prefsData.preferred_music_genre)
        setCurrentMusicGenre(genre)
        // Sync genre preference with global audio context (don't auto-enable — ImmersiveHome handles playback)
        if (audioContext) {
          audioContext.setMusicGenre(genre)
        }
      }

      if (!isMountedRef.current) return

      if (guideRes.ok) {
        const guideData = await guideRes.json()
        if (!isMountedRef.current) return
        if (guideData.data) {
          // Check if guide has modules - if not, it's an old guide that needs regeneration
          const hasModules = guideData.data.modules && guideData.data.modules.length > 0
          if (!hasModules) {
            console.log('[fetchData] Guide exists but has no modules, needs regeneration')
            setShowEnergyPrompt(true)
            return
          }

          setGuide(guideData.data)
          setCheckpoints(guideData.checkpoints || [])
          setDurations(guideData.durations || {})
          setStreak(guideData.streak || 0)

          // Load completed modules from guide
          const completed: string[] = []
          if (guideData.data.morning_prime_done) completed.push('morning_prime')
          if (guideData.data.movement_done) {
            completed.push('movement')
            completed.push('workout') // Both keys map to the same DB field
          }
          if (guideData.data.micro_lesson_done) completed.push('micro_lesson')
          if (guideData.data.breath_done) completed.push('breath')
          if (guideData.data.day_close_done) completed.push('day_close')
          if (guideData.data.cosmic_insight_done) completed.push('cosmic_insight')
          console.log('[fetchData] Guide loaded, done states:', {
            date: guideData.data.date,
            morning_prime_done: guideData.data.morning_prime_done,
            movement_done: guideData.data.movement_done,
            micro_lesson_done: guideData.data.micro_lesson_done,
            breath_done: guideData.data.breath_done,
            day_close_done: guideData.data.day_close_done,
            completedModules: completed,
          })
          setCompletedModules(completed)

          // Load mood data so check-ins only show once per day
          if (guideData.data.mood_before) setMoodBefore(guideData.data.mood_before)
          if (guideData.data.mood_after) setMoodAfter(guideData.data.mood_after)

          // Check if we should show energy prompt (within 4 hours of wake time, no energy set)
          if (!guideData.data.energy_level) {
            const now = new Date()
            const currentMinutes = now.getHours() * 60 + now.getMinutes()
            // Use wake_time + 4 hours as window, default to noon (12:00) if no wake_time
            let energyWindowEnd = 12 * 60 // default: noon
            if (prefsData?.wake_time) {
              const [wH, wM] = prefsData.wake_time.split(':').map(Number)
              energyWindowEnd = (wH * 60 + (wM || 0)) + 4 * 60
            }
            if (currentMinutes < energyWindowEnd) {
              setShowEnergyPrompt(true)
            }
          }
        } else {
          // No guide yet, show energy prompt to generate
          setShowEnergyPrompt(true)
        }
      } else {
        // API returned an error (e.g., 401 for guests) - show energy prompt anyway
        console.error('Guide API error:', guideRes.status)
        setShowEnergyPrompt(true)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      if (!isMountedRef.current) return
      // On error, show energy prompt so user can try to generate
      setShowEnergyPrompt(true)
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchData()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchData])

  // Sync music genre with audio context when it changes
  useEffect(() => {
    if (audioContext && currentMusicGenre) {
      audioContext.setMusicGenre(currentMusicGenre)
    }
  }, [audioContext, currentMusicGenre])

  // Effective genre for display
  const effectiveGenre = useMemo(() => {
    return currentMusicGenre || getTodaysMusicGenre(preferences?.preferred_music_genre)
  }, [currentMusicGenre, preferences?.preferred_music_genre, themeContext?.genre])

  // Notify audio context when session starts/ends
  useEffect(() => {
    if (audioContext) {
      audioContext.setSessionActive(!!activePlayer)
    }
  }, [audioContext, activePlayer])

  // Cleanup: reset session active when component unmounts (e.g., when Morning Flow closes)
  // Use empty deps to only run cleanup on actual unmount, not on audioContext changes
  const audioContextRef = useRef(audioContext)
  audioContextRef.current = audioContext
  useEffect(() => {
    return () => {
      audioContextRef.current?.setSessionActive(false)
    }
  }, [])

  const generateGuide = async (energyLevel?: EnergyLevel) => {
    setIsGenerating(true)
    setGenerationError(null)
    try {
      const response = await fetch('/api/daily-guide/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceRegenerate: !guide || !!energyLevel,
          energyLevel,
          timeMode: preferences?.default_time_mode || 'normal',
        }),
      })

      if (response.ok) {
        const data: GeneratedGuide = await response.json()
        setGuide(data.data)
        setCheckpoints(data.checkpoints || [])
        setDurations(data.durations || {})
        setStreak(data.streak || 0)
        setShowEnergyPrompt(false)
        if (energyLevel) {
          setSelectedEnergy(energyLevel)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Guide generation failed:', response.status, errorData)
        if (response.status === 401) {
          // Show demo guide for guests
          const demoGuide: DailyGuide = {
            id: 'demo',
            date: new Date().toISOString().split('T')[0],
            day_type: 'work',
            pace: 'normal',
            time_mode: 'normal',
            energy_level: energyLevel || 'normal',
            modules: ['morning_prime', 'workout', 'micro_lesson', 'breath', 'day_close'],
            morning_prime_script: 'Good morning! Take a deep breath and set your intention for today.',
            movement_script: 'A moment of inspiration to start your day.',
            workout_script: null,
            micro_lesson_script: 'Watch a short motivation video.',
            breath_script: 'Take a moment to center yourself with mindful breathing.',
            day_close_script: 'Reflect on your day and celebrate your progress.',
            tomorrow_preview: 'Tomorrow brings new opportunities.',
            checkpoint_1_script: 'Mid-morning check-in.',
            checkpoint_2_script: 'Afternoon focus reset.',
            checkpoint_3_script: 'Evening wind-down.',
            pre_study_script: null,
            study_break_script: null,
            exam_calm_script: null,
            morning_script: null,
            evening_script: null,
            micro_lesson: null,
            morning_played: false,
            evening_played: false,
            morning_prime_done: false,
            movement_done: false,
            micro_lesson_done: false,
            breath_done: false,
            day_close_done: false,
          }
          setGuide(demoGuide)
          setCheckpoints([
            { id: 'checkpoint_1', name: 'Focus Target', time: '10:00', description: 'Lock in your morning focus' },
            { id: 'checkpoint_2', name: 'Midday Reset', time: '14:00', description: 'Reset and recharge' },
            { id: 'checkpoint_3', name: 'Downshift', time: '17:00', description: 'Begin winding down' },
          ])
          setDurations({ morning_prime: 60, workout: 30, micro_lesson: 120, breath: 90, day_close: 60 } as Record<ModuleType, number>)
          setShowEnergyPrompt(false)
          if (energyLevel) {
            setSelectedEnergy(energyLevel)
          }
        } else {
          const errorDetails = errorData.details ? `: ${errorData.details}` : ''
          setGenerationError((errorData.error || 'Failed to generate guide') + errorDetails)
        }
      }
    } catch (error) {
      console.error('Error generating guide:', error)
      setGenerationError('Network error. Please check your connection and try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEnergySelect = (energy: EnergyLevel) => {
    setSelectedEnergy(energy)
    generateGuide(energy)
  }

  const resetGuide = async () => {
    try {
      setGenerationError(null)
      const response = await fetch('/api/daily-guide/reset', { method: 'DELETE' })
      if (response.ok) {
        setGuide(null)
        setShowEnergyPrompt(true)
        console.log('[reset] Guide cleared successfully')
      } else {
        const data = await response.json().catch(() => ({}))
        setGenerationError(`Reset failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Reset error:', error)
      setGenerationError('Failed to reset guide. Please try again.')
    }
  }

  const toggleDayType = async (newDayType: string) => {
    if (!guide) return

    try {
      const response = await fetch('/api/daily-guide/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceRegenerate: true,
          dayType: newDayType,
          energyLevel: selectedEnergy,
        }),
      })

      if (response.ok) {
        const data: GeneratedGuide = await response.json()
        setGuide(data.data)
        setCheckpoints(data.checkpoints || [])
        setDurations(data.durations || {})
      }
    } catch (error) {
      console.error('Error toggling day type:', error)
    }
  }

  const playModule = async (moduleType: string, withMusic = false) => {
    // Free users get text-only mode (no AI voice)
    const isTextOnly = subscription && !subscription.isPremium && !subscription.checkAccess('ai_voice')

    setLoadingModule(moduleType)
    try {
      // Map day types to voice types
      const dayTypeMap: Record<string, string> = {
        work: 'work',
        off: 'off',
        recovery: 'recovery',
        class: 'work',    // Student class days use work voice
        study: 'work',    // Study days use work voice
        exam: 'work',     // Exam days use work voice
      }
      const currentDayTypeVoice = dayTypeMap[guide?.day_type || 'work'] || 'work'

      // Morning flow modules use inline playback (no overlay)
      const isMorningFlowModule = ['morning_prime', 'breath'].includes(moduleType)

      // For breath module, use the daily voices API (ElevenLabs generated once per day)
      if (moduleType === 'breath') {
        console.log('[DailyGuideHome] Fetching breath audio...')
        try {
          const response = await fetch('/api/daily-guide/voices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'breathing', textOnly: !!isTextOnly }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log('[DailyGuideHome] Got breath audio, has base64:', !!data.audioBase64)
            // Store for inline playback
            setModuleAudioData(prev => ({
              ...prev,
              [moduleType]: {
                script: data.script,
                audioBase64: data.audioBase64,
                duration: data.duration || 120,
              }
            }))
          } else {
            console.error('[DailyGuideHome] Breath audio fetch failed:', response.status)
          }
        } finally {
          setLoadingModule(null)
        }
        return
      }

      // For morning_prime, use day-type-specific voice
      if (moduleType === 'morning_prime') {
        console.log('[DailyGuideHome] Fetching morning_prime audio...')
        try {
          const response = await fetch('/api/daily-guide/voices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: `${currentDayTypeVoice}_prime`, textOnly: !!isTextOnly }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log('[DailyGuideHome] Got morning_prime audio, has base64:', !!data.audioBase64)
            // Store for inline playback
            setModuleAudioData(prev => ({
              ...prev,
              [moduleType]: {
                script: data.script,
                audioBase64: data.audioBase64,
                duration: data.duration || 120,
              }
            }))
          } else {
            console.error('[DailyGuideHome] Morning prime audio fetch failed:', response.status)
          }
        } finally {
          setLoadingModule(null)
        }
        return
      }

      // For day_close, use day-type-specific voice (inline playback like morning flow)
      if (moduleType === 'day_close') {
        console.log('[DailyGuideHome] Fetching day_close audio...')
        try {
          const response = await fetch('/api/daily-guide/voices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: `${currentDayTypeVoice}_close`, textOnly: !!isTextOnly }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log('[DailyGuideHome] Got day_close audio, has base64:', !!data.audioBase64)
            // Store for inline playback
            setModuleAudioData(prev => ({
              ...prev,
              [moduleType]: {
                script: data.script,
                audioBase64: data.audioBase64,
                duration: data.duration || 120,
              }
            }))
          } else {
            console.error('[DailyGuideHome] Day close audio fetch failed:', response.status)
          }
        } finally {
          setLoadingModule(null)
        }
        return
      }

      // For checkpoints, use inline playback like morning flow (no overlay)
      if (moduleType.startsWith('checkpoint')) {
        console.log(`[DailyGuideHome] Fetching ${moduleType} audio...`)
        try {
          const response = await fetch(
            `/api/daily-guide/audio?segment=${moduleType}&date=${today.toISOString()}`
          )

          if (response.ok) {
            const data = await response.json()
            console.log(`[DailyGuideHome] Got ${moduleType} audio, has base64:`, !!data.audioBase64)
            // Store for inline playback
            setModuleAudioData(prev => ({
              ...prev,
              [moduleType]: {
                script: data.script,
                audioBase64: data.audioBase64,
                duration: data.duration || 60,
              }
            }))
          } else {
            console.error(`[DailyGuideHome] ${moduleType} audio fetch failed:`, response.status)
          }
        } finally {
          setLoadingModule(null)
        }
        return
      }

      // For other modules, use the regular audio API
      const response = await fetch(
        `/api/daily-guide/audio?segment=${moduleType}&date=${today.toISOString()}`
      )

      if (response.ok) {
        const data = await response.json()
        setActivePlayer({
          module: moduleType,
          audio: {
            script: data.script,
            audioBase64: data.audioBase64,
            duration: data.duration,
          },
          withMusic: withMusic && musicEnabled,
          musicGenre: currentMusicGenre || getTodaysMusicGenre(preferences?.preferred_music_genre),
        })
      }
    } catch (error) {
      console.error('Error loading audio:', error)
    } finally {
      setLoadingModule(null)
    }
  }

  const awardXP = (amount: number) => {
    setXPRewardAmount(amount)
    setShowXPReward(false)
    // Force re-trigger by toggling
    setTimeout(() => setShowXPReward(true), 10)
  }

  const handlePlayerComplete = () => {
    if (!activePlayer) return

    // Award XP and check for new achievements
    logXPEventServer('moduleComplete').then(result => {
      if (result?.newAchievements?.length && achievementCtx) {
        achievementCtx.triggerAchievements(result.newAchievements)
      }
    })
    awardXP(XP_REWARDS.moduleComplete)

    // Optimistic update
    setCompletedModules(prev => [...prev, activePlayer.module])

    // Save to server
    fetch('/api/daily-guide/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segment: activePlayer.module,
        date: guide?.date,
      }),
    }).then(res => {
      if (!res.ok) res.text().then(t => console.error('[Player checkin] failed:', res.status, t))
    }).catch(err => console.error('[Player checkin] error:', err))
  }

  const handleSkipModule = (moduleType: string) => {
    setCompletedModules(prev => [...prev, moduleType])
    // Track skip count for adaptive module ordering
    if (typeof window !== 'undefined') {
      const key = `module_skip_count_${moduleType}`
      const count = parseInt(localStorage.getItem(key) || '0', 10)
      localStorage.setItem(key, String(count + 1))
    }
    // Also persist skip to server so progress survives reload
    if (guide?.date) {
      fetch('/api/daily-guide/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment: moduleType, date: guide.date }),
      }).then(res => {
        if (!res.ok) res.text().then(t => console.error(`[Skip ${moduleType} checkin] failed:`, res.status, t))
      }).catch(err => console.error(`[Skip ${moduleType} checkin] error:`, err))
    }
  }

  const handlePlayerClose = () => {
    setActivePlayer(null)
  }

  const getModuleScript = (moduleType: string): string | null => {
    if (!guide) return null
    switch (moduleType) {
      case 'morning_prime':
        return guide.morning_prime_script || guide.morning_script
      case 'movement':
        return guide.movement_script || guide.workout_script
      case 'workout':
        return guide.workout_script
      case 'breath':
        return guide.breath_script
      case 'micro_lesson':
        return guide.micro_lesson_script || guide.micro_lesson
      case 'day_close':
        return guide.day_close_script || guide.evening_script
      case 'checkpoint_1':
        return guide.checkpoint_1_script
      case 'checkpoint_2':
        return guide.checkpoint_2_script
      case 'checkpoint_3':
        return guide.checkpoint_3_script
      case 'pre_study':
        return guide.pre_study_script
      case 'study_break':
        return guide.study_break_script
      case 'exam_calm':
        return guide.exam_calm_script
      default:
        return null
    }
  }

  // Determine morning modules based on segment_order preference, guide modules, and enabled segments
  const enabledSegments = preferences?.enabled_segments || ['morning_prime', 'movement', 'micro_lesson', 'breath', 'day_close']
  const segmentOrder = preferences?.segment_order || ['morning_prime', 'movement', 'breath', 'micro_lesson']
  const guideModuleSet = new Set<string>(guide?.modules || [])
  const morningModuleNames = new Set(['morning_prime', 'movement', 'workout', 'breath', 'micro_lesson'])
  const morningModules: string[] = segmentOrder.filter((m: string) =>
    morningModuleNames.has(m) &&
    (guideModuleSet.has(m) || (m === 'movement' && guideModuleSet.has('workout')) || (m === 'workout' && guideModuleSet.has('movement'))) &&
    (enabledSegments.includes(m) || (m === 'workout' && enabledSegments.includes('movement')))
  )

  // Improvement #7: Adaptive module order
  const adaptedMorningModules = useMemo(() => {
    const modules = [...morningModules]
    // Low energy: move breath to first position
    if (selectedEnergy === 'low') {
      const breathIdx = modules.indexOf('breath')
      if (breathIdx > 0) {
        modules.splice(breathIdx, 1)
        modules.unshift('breath')
      }
    }
    // Skip tracking: modules skipped >3 times → move to end
    if (typeof window !== 'undefined') {
      const skippedModules: { module: string; count: number }[] = []
      for (const m of modules) {
        const count = parseInt(localStorage.getItem(`module_skip_count_${m}`) || '0', 10)
        if (count > 3) skippedModules.push({ module: m, count })
      }
      if (skippedModules.length > 0) {
        const skippedSet = new Set(skippedModules.map(s => s.module))
        const kept = modules.filter(m => !skippedSet.has(m))
        const moved = modules.filter(m => skippedSet.has(m))
        if (moved.length > 0 && kept.length > 0) {
          return { modules: [...kept, ...moved], wasAdapted: true }
        }
      }
    }
    return { modules, wasAdapted: false }
  }, [morningModules, selectedEnergy])

  // Show adaptive banner via effect (not inside useMemo)
  useEffect(() => {
    if (adaptedMorningModules.wasAdapted) {
      setShowAdaptiveBanner(true)
    }
  }, [adaptedMorningModules.wasAdapted])

  // Improvement #8: Quick mode modules
  const quickModeModules = useMemo(() => {
    const base = selectedEnergy === 'low'
      ? ['morning_prime', 'breath']
      : ['morning_prime', 'micro_lesson']
    return base.filter(m => adaptedMorningModules.modules.includes(m))
  }, [selectedEnergy, adaptedMorningModules])

  const displayModules = quickModeActive ? quickModeModules : adaptedMorningModules.modules

  // For premium users, MorningBriefing replaces morning_prime inside the flow
  const isPremium = subscription?.isPremium ?? false
  const displayModulesFiltered = isPremium
    ? displayModules.filter(m => m !== 'morning_prime')
    : displayModules

  // Improvement #3: Estimated time remaining
  const timeRemaining = useMemo(() => {
    const incompleteModules = displayModules.filter(m => !completedModules.includes(m))
    const totalSeconds = incompleteModules.reduce((sum, m) => sum + (durations[m as ModuleType] || 60), 0)
    const minutes = Math.ceil(totalSeconds / 60)
    return minutes > 0 ? `~${minutes} min left` : null
  }, [displayModules, completedModules, durations])

  const getCurrentMorningModule = (): string | null => {
    for (const m of displayModules) {
      if (!completedModules.includes(m)) {
        return m
      }
    }
    return null
  }

  // Check for morning flow completion and trigger celebration
  useEffect(() => {
    if (!morningCompleteCelebrated && displayModules.length > 0) {
      const allCompleted = displayModules.every(m => completedModules.includes(m))
      if (allCompleted) {
        setShowMorningComplete(true)
        setMorningCompleteCelebrated(true)
      }
    }
  }, [completedModules, displayModules, morningCompleteCelebrated])

  // Improvement #6: Auto-advance between modules
  useEffect(() => {
    if (!justCompletedModule) return
    const timer = setTimeout(() => {
      const nextModule = getCurrentMorningModule()
      if (nextModule && moduleRefs.current[nextModule]) {
        moduleRefs.current[nextModule]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      setTimeout(() => setJustCompletedModule(null), 1500)
    }, 800)
    return () => clearTimeout(timer)
  }, [justCompletedModule, completedModules])

  // Time-based availability for Evening section
  const getEveningAvailability = useCallback(() => {
    const currentHour = today.getHours()
    const currentMinutes = today.getMinutes()
    const currentTimeMinutes = currentHour * 60 + currentMinutes

    // Default evening unlock time is 5pm (17:00)
    let unlockHour = 17
    let unlockMinutes = 0

    // Check work/class end times from preferences
    if (preferences) {
      const endTime = guide?.day_type === 'class' || guide?.day_type === 'study'
        ? preferences.class_end_time
        : preferences.work_end_time

      if (endTime) {
        const [hours, mins] = endTime.split(':').map(Number)
        unlockHour = hours
        unlockMinutes = mins || 0
      }
    }

    const unlockTimeMinutes = unlockHour * 60 + unlockMinutes
    const isAvailable = currentTimeMinutes >= unlockTimeMinutes

    return {
      isAvailable,
      unlockTime: `${unlockHour}:${unlockMinutes.toString().padStart(2, '0')}`,
      unlockHour,
      unlockMinutes,
    }
  }, [today, preferences, guide?.day_type])

  const eveningAvailability = getEveningAvailability()

  // Time-based availability for Morning section (locked until wake_time)
  const getMorningAvailability = useCallback(() => {
    const currentHour = today.getHours()
    const currentMinutes = today.getMinutes()
    const currentTimeMinutes = currentHour * 60 + currentMinutes

    // Default: morning is always available if no wake_time set
    if (!preferences?.wake_time) {
      return { isAvailable: true, unlockTime: '', unlockHour: 0, unlockMinutes: 0 }
    }

    const [wakeHour, wakeMins] = preferences.wake_time.split(':').map(Number)
    const unlockTimeMinutes = wakeHour * 60 + (wakeMins || 0)
    const isAvailable = currentTimeMinutes >= unlockTimeMinutes

    // Format for display (12-hour)
    const displayHour = wakeHour % 12 || 12
    const ampm = wakeHour < 12 ? 'AM' : 'PM'
    const unlockTime = `${displayHour}:${(wakeMins || 0).toString().padStart(2, '0')} ${ampm}`

    return {
      isAvailable,
      unlockTime,
      unlockHour: wakeHour,
      unlockMinutes: wakeMins || 0,
    }
  }, [today, preferences?.wake_time])

  const morningAvailability = getMorningAvailability()

  // Get available day types for user
  const getAvailableDayTypes = () => {
    if (!preferences) return ['work', 'off', 'recovery']
    if (preferences.user_type === 'student') {
      return ['class', 'study', 'exam', 'off', 'recovery']
    }
    if (preferences.user_type === 'hybrid') {
      return ['work', 'class', 'study', 'exam', 'off', 'recovery']
    }
    return ['work', 'off', 'recovery']
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  const timeGradient = getTimeGradient()

  return (
    <div className={embedded ? `${timeGradient} pb-8` : `min-h-screen ${timeGradient} pb-32`}>
      {/* Trial Banner (hidden in embedded/drawer mode) */}
      {!embedded && <TrialBanner variant="compact" />}
      {!embedded && <TrialEndingBanner />}

      {/* Header */}
      <div className="p-6 animate-fade-in-down">
        {/* Greeting Section */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {(() => {
              const greeting = getTimeGreeting(mindsetCtx?.mindset)
              const GreetingIcon = greeting.icon
              return (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-white/10 animate-pulse-glow">
                      <GreetingIcon className="w-4 h-4 text-white animate-icon-bounce" />
                    </div>
                    <span className="text-sm text-white/95">{greeting.text}</span>
                  </div>
                  <p className="text-sm text-white/95 mt-1">
                    {getFormattedDate(today)}
                  </p>
                </>
              )
            })()}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Premium badge */}
            <PremiumBadge size="sm" />
            {/* Streak indicator */}
            <StreakDisplay streak={streak} />
            {mindsetCtx && (
              <div className="flex items-center justify-center px-1.5 py-1 rounded-full bg-white/5">
                <MindsetIcon mindsetId={mindsetCtx.mindset} className="w-4 h-4 text-white/60" />
              </div>
            )}
          </div>
        </div>

        {/* Day Type pill + Energy row */}
        {guide && (
          <div className="flex items-center justify-between mb-2">
            {/* Day type pill (tappable) */}
            <button
              onClick={() => setShowDayTypePicker(!showDayTypePicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs text-white press-scale transition-all"
            >
              <DayTypeIndicator dayType={guide.day_type as DayType} size="sm" />
              <span className="font-medium">{DAY_TYPE_LABELS[guide.day_type]?.label || guide.day_type}</span>
              <ChevronDown className={`w-3 h-3 text-white/60 transition-transform ${showDayTypePicker ? 'rotate-180' : ''}`} />
            </button>

            {/* Energy pills (right) */}
            {selectedEnergy && (
              <EnergySelector
                value={selectedEnergy}
                onChange={(e) => generateGuide(e)}
                disabled={isGenerating}
              />
            )}
          </div>
        )}

        {/* Day type dropdown (shown on tap) */}
        {guide && showDayTypePicker && (
          <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 -mx-6 px-6 animate-slide-up-enter">
            {getAvailableDayTypes().map(type => (
              <button
                key={type}
                onClick={() => { toggleDayType(type); setShowDayTypePicker(false) }}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all press-scale
                  ${guide.day_type === type
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'bg-white/5 text-white/95 border border-transparent hover:bg-white/10'
                  }
                `}
              >
                {type === 'recovery' && <Heart className="w-3 h-3" />}
                {type === 'exam' && <GraduationCap className="w-3 h-3" />}
                {DAY_TYPE_LABELS[type]?.label || type}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Session Limit Banner */}
      <div className="px-6 mb-4">
        <SessionLimitBanner />
      </div>

      {/* Energy prompt (initial) */}
      {showEnergyPrompt && !guide && (
        <div className="px-6 mb-6">
          {generationError && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 mb-3">{generationError}</p>
              <button
                onClick={resetGuide}
                className="text-sm text-white/70 hover:text-white underline"
              >
                Reset & Try Again
              </button>
            </div>
          )}
          <EnergyPrompt
            onSelect={handleEnergySelect}
            isLoading={isGenerating}
          />
        </div>
      )}

      {/* No guide - generate button */}
      {!guide && !showEnergyPrompt && (
        <div className="px-6">
          <div className="text-center py-12">
            <p className="text-white/95 mb-4">No guide generated yet</p>
            <button
              onClick={() => generateGuide()}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors mx-auto disabled:opacity-50 press-scale"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Generate Today&apos;s Guide
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Guide content */}
      {guide && (
        <div className="px-6 space-y-6 animate-slide-up-enter">
          {/* Demo guide banner for guests */}
          {guide.id === 'demo' && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <Lock className="w-5 h-5 text-white shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-white font-medium">Preview Mode</p>
                <p className="text-xs text-white/70">Sign in to save your progress and unlock all features</p>
              </div>
            </div>
          )}

          {/* Rest Day Suggestion */}
          <RestDaySuggestion
            streak={streak}
            dayType={guide.day_type}
            onTakeRecoveryDay={() => toggleDayType('recovery')}
          />

          {/* Morning Flow Section */}
          {morningModules.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-label">
                  Morning Flow
                </h2>
                {!morningAvailability.isAvailable && (
                  <div className="flex items-center gap-1.5 text-xs text-white/95">
                    <Clock className="w-3 h-3" />
                    <span>Available at {morningAvailability.unlockTime}</span>
                  </div>
                )}
              </div>
              <FeatureHint id="morning-flow" text="Complete modules in order for the best experience" mode="once" />

              {morningAvailability.isAvailable ? (
                <div className="overflow-hidden rounded-2xl animate-scale-in">
                  <button
                    onClick={() => setShowMorningFlow(!showMorningFlow)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors press-scale"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white/10">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <h2 className="font-medium text-white">
                          {quickModeActive ? '5-Min Flow' : 'Morning Flow'}
                        </h2>
                        <p className="text-xs text-white/95">
                          {completedModules.filter(m => displayModulesFiltered.includes(m)).length}/{displayModulesFiltered.length} complete
                          {timeRemaining && <span className="ml-2 text-white/60">{timeRemaining}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MorningFlowProgress
                        modules={displayModulesFiltered as ModuleType[]}
                        completedModules={completedModules}
                        currentModule={getCurrentMorningModule() as ModuleType}
                      />
                      {showMorningFlow ? (
                        <ChevronUp className="w-5 h-5 text-white/95" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-white/95" />
                      )}
                    </div>
                  </button>

                  {showMorningFlow && (
                    <div className="p-4 pt-0 space-y-3">
                      {/* Quick mode toggle - only show when 0 modules completed */}
                      {completedModules.filter(m => displayModules.includes(m)).length === 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setQuickModeActive(!quickModeActive)
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs text-white/80 press-scale"
                        >
                          <Clock className="w-3 h-3" />
                          {quickModeActive ? 'Full flow' : '5-min flow'}
                        </button>
                      )}

                      {/* Adaptive order banner */}
                      {showAdaptiveBanner && !quickModeActive && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                          <p className="text-xs text-white/60">Order adjusted based on your habits</p>
                          <button
                            onClick={() => setShowAdaptiveBanner(false)}
                            className="text-xs text-white/40 hover:text-white/60 ml-2"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}

                      {/* Mood Check-In (inside flow) */}
                      {!moodBefore && getTimeGreeting().period === 'morning' && (
                        <>
                        <FeatureHint id="mood-checkin" text="Mood tracking helps personalize your future sessions" mode="once" />
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
                        </>
                      )}

                      {/* Morning Briefing (premium replaces morning_prime) */}
                      {isPremium && (
                        <MorningBriefing
                          onComplete={() => {
                            setCompletedModules(prev =>
                              prev.includes('morning_prime') ? prev : [...prev, 'morning_prime']
                            )
                            fetch('/api/daily-guide/checkin', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ segment: 'morning_prime', date: guide?.date }),
                            }).catch(err => console.error('[MorningBriefing checkin] error:', err))
                          }}
                        />
                      )}

                      {displayModulesFiltered.map((module, index) => {
                        // Use QuoteCard for movement/workout (Quote of the Day)
                        if (module === 'movement' || module === 'workout') {
                          return (
                            <div
                              key={module}
                              ref={(el) => { moduleRefs.current[module] = el }}
                              className={`
                                animate-card-appear opacity-0 stagger-${Math.min(index + 1, 10)}
                                ${justCompletedModule === module ? 'module-just-completed' : ''}
                                ${completedModules.includes(module) && justCompletedModule !== module ? 'module-completed-collapse' : ''}
                                ${getCurrentMorningModule() === module && justCompletedModule ? 'module-next-reveal' : ''}
                              `}
                            >
                            {justCompletedModule === module && (
                              <div className="nice-work-toast text-center text-xs text-emerald-400 font-medium py-1">Nice work!</div>
                            )}
                            <QuoteCard
                              isCompleted={completedModules.includes(module)}
                              mood={moodBefore}
                              energy={selectedEnergy}
                              dayType={guide.day_type}
                              onComplete={() => {
                                setCompletedModules(prev => [...prev, module])
                                setJustCompletedModule(module)
                                fetch('/api/daily-guide/checkin', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ segment: module, date: guide.date }),
                                }).then(res => {
                                  if (!res.ok) res.text().then(t => console.error('[QuoteCard checkin] failed:', res.status, t))
                                }).catch(err => console.error('[QuoteCard checkin] error:', err))
                              }}
                            />
                            </div>
                          )
                        }

                        // Micro lesson uses inline YouTube player
                        // Content adapts based on day type: work = motivation, student = focus music, etc.
                        if (module === 'micro_lesson') {
                          return (
                            <div
                              key={module}
                              ref={(el) => { moduleRefs.current[module] = el }}
                              className={`
                                animate-card-appear opacity-0 stagger-${Math.min(index + 1, 10)}
                                ${justCompletedModule === module ? 'module-just-completed' : ''}
                                ${completedModules.includes(module) && justCompletedModule !== module ? 'module-completed-collapse' : ''}
                                ${getCurrentMorningModule() === module && justCompletedModule ? 'module-next-reveal' : ''}
                              `}
                            >
                            {justCompletedModule === module && (
                              <div className="nice-work-toast text-center text-xs text-emerald-400 font-medium py-1">Nice work!</div>
                            )}
                            <MicroLessonVideo
                              isCompleted={completedModules.includes(module)}
                              dayType={guide.day_type as 'work' | 'off' | 'recovery' | 'class' | 'study' | 'exam'}
                              onComplete={() => {
                                setCompletedModules(prev => [...prev, module])
                                setJustCompletedModule(module)
                                fetch('/api/daily-guide/checkin', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ segment: 'micro_lesson', date: guide.date }),
                                }).then(res => {
                                  if (!res.ok) res.text().then(t => console.error('[MicroLesson checkin] failed:', res.status, t))
                                }).catch(err => console.error('[MicroLesson checkin] error:', err))
                              }}
                              onSkip={() => handleSkipModule(module)}
                            />
                            </div>
                          )
                        }

                        return (
                          <div
                            key={module}
                            ref={(el) => { moduleRefs.current[module] = el }}
                            className={`
                              animate-card-appear opacity-0 stagger-${Math.min(index + 1, 10)}
                              ${justCompletedModule === module ? 'module-just-completed' : ''}
                              ${completedModules.includes(module) && justCompletedModule !== module ? 'module-completed-collapse' : ''}
                              ${getCurrentMorningModule() === module && justCompletedModule ? 'module-next-reveal' : ''}
                            `}
                          >
                          {justCompletedModule === module && (
                            <div className="nice-work-toast text-center text-xs text-emerald-400 font-medium py-1">Nice work!</div>
                          )}
                          <ModuleCard
                            module={module as ModuleType}
                            script={moduleAudioData[module]?.script || getModuleScript(module)}
                            duration={durations[module as ModuleType] || 60}
                            isCompleted={completedModules.includes(module)}
                            isLoading={loadingModule === module}
                            isActive={getCurrentMorningModule() === module}
                            musicEnabled={musicEnabled}
                            musicGenre={currentMusicGenre || getTodaysMusicGenre(preferences?.preferred_music_genre)}
                            onPlay={() => playModule(module, musicEnabled)}
                            onSkip={() => handleSkipModule(module)}
                            audioBase64={moduleAudioData[module]?.audioBase64}
                            textOnly={!!(subscription && !subscription.isPremium && !subscription.checkAccess('ai_voice'))}
                            onComplete={() => {
                              console.log(`[ModuleCard ${module}] onComplete fired, saving checkin`)
                              setCompletedModules(prev => [...prev, module])
                              setJustCompletedModule(module)
                              fetch('/api/daily-guide/checkin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ segment: module, date: guide.date }),
                              }).then(res => {
                                if (!res.ok) res.text().then(t => console.error(`[ModuleCard ${module} checkin] failed:`, res.status, t))
                                else console.log(`[ModuleCard ${module}] checkin saved OK`)
                              }).catch(err => console.error(`[ModuleCard ${module} checkin] error:`, err))
                            }}
                          />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // Locked state - same pattern as Evening lock
                <div className="p-4 opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <Lock className="w-5 h-5 text-white/95" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-white/95">Morning Flow</h3>
                      <p className="text-sm text-white/95">Your morning modules will unlock at {morningAvailability.unlockTime}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Smart Nudge (after Morning Flow) */}
          <SmartNudgeBanner />

          {/* Cosmic Insight Card - only shown when astrology is enabled */}
          {preferences?.astrology_enabled && morningAvailability.isAvailable && (
            <div className="animate-card-appear">
              <CosmicInsightCard
                isCompleted={completedModules.includes('cosmic_insight')}
                zodiacSign={preferences.zodiac_sign}
                dayType={guide.day_type}
                onComplete={() => {
                  setCompletedModules(prev => [...prev, 'cosmic_insight'])
                  fetch('/api/daily-guide/checkin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ segment: 'cosmic_insight', date: guide.date }),
                  }).then(res => {
                    if (!res.ok) res.text().then(t => console.error('[CosmicInsight checkin] failed:', res.status, t))
                  }).catch(err => console.error('[CosmicInsight checkin] error:', err))
                }}
              />
              <Link
                href="/astrology"
                className="mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-white/5 transition-colors text-xs text-indigo-400/80"
              >
                Explore your Cosmic Guide →
              </Link>
            </div>
          )}

          {/* Student-specific section (for study/exam days) */}
          {(preferences?.user_type === 'student' || preferences?.user_type === 'hybrid') &&
           ['study', 'exam', 'class'].includes(guide.day_type) && (
            <div className="overflow-hidden">
              <button
                onClick={() => setShowStudentSection(!showStudentSection)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/10">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="font-medium text-white">
                      {guide.day_type === 'exam' ? 'Exam Support' : 'Study Tools'}
                    </h2>
                    <p className="text-xs text-white/95">
                      {guide.day_type === 'exam' ? 'Stay calm and focused' : 'Focus and breaks'}
                    </p>
                  </div>
                </div>
                {showStudentSection ? (
                  <ChevronUp className="w-5 h-5 text-white/95" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/95" />
                )}
              </button>

              {showStudentSection && (
                <div className="p-4 pt-0 space-y-3">
                  {guide.day_type === 'exam' && guide.exam_calm_script && (
                    <ModuleCard
                      module={'exam_calm' as ModuleType}
                      script={guide.exam_calm_script}
                      duration={90}
                      isCompleted={completedModules.includes('exam_calm')}
                      isLoading={loadingModule === 'exam_calm'}
                      musicEnabled={musicEnabled}
                      musicGenre={currentMusicGenre || getTodaysMusicGenre(preferences?.preferred_music_genre)}
                      onPlay={() => playModule('exam_calm', musicEnabled)}
                      onSkip={() => handleSkipModule('exam_calm')}
                    />
                  )}
                  {['study', 'class'].includes(guide.day_type) && (
                    <>
                      {guide.pre_study_script && (
                        <ModuleCard
                          module={'pre_study' as ModuleType}
                          script={guide.pre_study_script}
                          duration={60}
                          isCompleted={completedModules.includes('pre_study')}
                          isLoading={loadingModule === 'pre_study'}
                          musicEnabled={musicEnabled}
                          musicGenre={currentMusicGenre || getTodaysMusicGenre(preferences?.preferred_music_genre)}
                          onPlay={() => playModule('pre_study', musicEnabled)}
                          onSkip={() => handleSkipModule('pre_study')}
                        />
                      )}
                      {guide.study_break_script && (
                        <ModuleCard
                          module={'study_break' as ModuleType}
                          script={guide.study_break_script}
                          duration={60}
                          isCompleted={completedModules.includes('study_break')}
                          isLoading={loadingModule === 'study_break'}
                          musicEnabled={musicEnabled}
                          musicGenre={currentMusicGenre || getTodaysMusicGenre(preferences?.preferred_music_genre)}
                          onPlay={() => playModule('study_break', musicEnabled)}
                          onSkip={() => handleSkipModule('study_break')}
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Checkpoints */}
          {checkpoints.length > 0 && (
            <>
            <FeatureHint id="checkpoints" text="Checkpoints reinforce your intentions at key moments throughout the day" mode="persistent" />
            <CheckpointList
              checkpoints={checkpoints}
              scripts={{
                checkpoint_1: guide.checkpoint_1_script,
                checkpoint_2: guide.checkpoint_2_script,
                checkpoint_3: guide.checkpoint_3_script,
              }}
              audioData={{
                checkpoint_1: moduleAudioData['checkpoint_1'],
                checkpoint_2: moduleAudioData['checkpoint_2'],
                checkpoint_3: moduleAudioData['checkpoint_3'],
              }}
              completedCheckpoints={completedModules.filter(m => m.startsWith('checkpoint'))}
              currentTime={today}
              loadingCheckpoint={loadingModule?.startsWith('checkpoint') ? loadingModule : null}
              onPlayCheckpoint={(cp) => playModule(cp, musicEnabled)}
              onCompleteCheckpoint={(cp) => {
                console.log(`[CheckpointCard ${cp}] onComplete fired, saving checkin`)
                setCompletedModules(prev => [...prev, cp])
                fetch('/api/daily-guide/checkin', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ segment: cp, date: guide.date }),
                }).then(res => {
                  if (!res.ok) res.text().then(t => console.error(`[CheckpointCard ${cp} checkin] failed:`, res.status, t))
                  else console.log(`[CheckpointCard ${cp}] checkin saved OK`)
                }).catch(err => console.error(`[CheckpointCard ${cp} checkin] error:`, err))
              }}
            />
            </>
          )}

          {/* Day Close */}
          {guide.modules?.includes('day_close') && (
            <div className="space-y-3 animate-scale-in">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-label">
                  Evening
                </h2>
                {!eveningAvailability.isAvailable && (
                  <div className="flex items-center gap-1.5 text-xs text-white/95">
                    <Clock className="w-3 h-3" />
                    <span>Available at {eveningAvailability.unlockTime}</span>
                  </div>
                )}
              </div>

              {eveningAvailability.isAvailable ? (
                <div className="animate-card-appear rounded-2xl">
                <ModuleCard
                  module="day_close"
                  script={moduleAudioData['day_close']?.script || getModuleScript('day_close')}
                  duration={durations.day_close || 45}
                  isCompleted={completedModules.includes('day_close')}
                  isLoading={loadingModule === 'day_close'}
                  musicEnabled={musicEnabled}
                  musicGenre={currentMusicGenre || getTodaysMusicGenre(preferences?.preferred_music_genre)}
                  onPlay={() => playModule('day_close', musicEnabled)}
                  audioBase64={moduleAudioData['day_close']?.audioBase64}
                  textOnly={!!(subscription && !subscription.isPremium && !subscription.checkAccess('ai_voice'))}
                  onComplete={() => {
                    setCompletedModules(prev => [...prev, 'day_close'])
                    fetch('/api/daily-guide/checkin', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ segment: 'day_close', date: guide.date }),
                    }).then(res => {
                      if (!res.ok) res.text().then(t => console.error('[day_close checkin] failed:', res.status, t))
                    }).catch(err => console.error('[day_close checkin] error:', err))
                  }}
                />
                </div>
              ) : (
                // Locked state
                <div className="p-4 opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <Lock className="w-5 h-5 text-white/95" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-white/95">Day Close</h3>
                      <p className="text-sm text-white/95">Wind down and reflect on the day</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tomorrow Preview */}
              {guide.tomorrow_preview && eveningAvailability.isAvailable && (
                <div className="p-4 mt-3">
                  <p className="text-sm text-white/95 mb-2">Tomorrow</p>
                  <p className="text-white text-sm leading-relaxed">
                    {guide.tomorrow_preview}
                  </p>
                </div>
              )}

              {/* Journal Entry - shows after Day Close is completed */}
              {completedModules.includes('day_close') && eveningAvailability.isAvailable && (
                <div className="mt-3 space-y-3">
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

                  <FeatureHint id="journal" text="Journaling anchors your progress — review entries to see growth" mode="once" />
                  <JournalEntry date={today} />

                  {/* Journal Lookback - "This time last week" */}
                  <JournalLookback />

                  {/* Goal Tracker - gate behind goal_tracker feature */}
                  {subscription?.checkAccess('goal_tracker') && <GoalTracker />}

                  {/* Bedtime Reminder Card */}
                  {preferences?.wake_time && (
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Moon className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm font-medium text-white">Bedtime Reminder</span>
                      </div>
                      <p className="text-xs text-white/95">
                        Aim to be in bed by{' '}
                        <span className="text-white/95">
                          {(() => {
                            const [h, m] = preferences.wake_time!.split(':').map(Number)
                            let bedH = h - 8
                            if (bedH < 0) bedH += 24
                            const period = bedH >= 12 ? 'PM' : 'AM'
                            const display = bedH % 12 || 12
                            return `${display}:${(m || 0).toString().padStart(2, '0')} ${period}`
                          })()}
                        </span>
                        {' '}for 8 hours of rest
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Morning Flow Complete Celebration */}
      <MorningFlowComplete
        isOpen={showMorningComplete}
        onClose={() => setShowMorningComplete(false)}
        modulesCompleted={displayModules.length}
      />

      {/* Player overlay */}
      {activePlayer && (
        <GuidancePlayer
          segment={activePlayer.module as any}
          script={activePlayer.audio.script}
          audioBase64={activePlayer.audio.audioBase64}
          duration={activePlayer.audio.duration}
          withMusic={activePlayer.withMusic}
          musicGenre={activePlayer.musicGenre}
          onClose={handlePlayerClose}
          onComplete={handlePlayerComplete}
        />
      )}

      {/* XP Reward Toast */}
      <XPReward xp={xpRewardAmount} show={showXPReward} />
    </div>
  )
}
