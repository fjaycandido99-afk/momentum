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
  Briefcase,
  BookOpen,
  Volume2,
  VolumeX,
  SkipForward,
  Clock,
  Lock,
  Sunrise,
  Sun,
  Moon,
} from 'lucide-react'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'
import { DayTypeIndicator } from './DayTypeIndicator'
import { GuidancePlayer } from './GuidancePlayer'
import { EnergyPrompt, EnergySelector } from './EnergyPrompt'
import { ModuleCard, MorningFlowProgress } from './ModuleCard'
import { MicroLessonVideo } from './MicroLessonVideo'
import { QuoteCard } from './QuoteCard'
import { GoalTracker } from './GoalTracker'
import { SmartNudgeBanner } from './SmartNudgeBanner'
import { StreakDisplay } from './StreakDisplay'
import { JournalEntry } from './JournalEntry'
import { MorningFlowComplete } from './MorningFlowComplete'
import { CheckpointList } from './CheckpointCard'
import { MoodCheckIn } from './MoodCheckIn'
import { JournalLookback } from './JournalLookback'
import { RestDaySuggestion } from './RestDaySuggestion'
import { getFormattedDate } from '@/lib/daily-guide/day-type'
import { useThemeOptional } from '@/contexts/ThemeContext'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { useAudioOptional } from '@/contexts/AudioContext'
import { SessionLimitBanner } from '@/components/premium/SessionLimitBanner'
import { TrialBanner, TrialEndingBanner } from '@/components/premium/TrialBanner'
import { FeatureLock, LockIcon } from '@/components/premium/FeatureLock'
import { PremiumBadge } from '@/components/premium/PremiumBadge'
import type { DayType, TimeMode, EnergyLevel, ModuleType, CheckpointConfig } from '@/lib/daily-guide/decision-tree'

type UserType = 'professional' | 'student' | 'hybrid'

// Get time-based greeting with icon
function getTimeGreeting(): { text: string; icon: typeof Sunrise; period: 'morning' | 'afternoon' | 'evening' } {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', icon: Sunrise, period: 'morning' }
  if (hour < 17) return { text: 'Good afternoon', icon: Sun, period: 'afternoon' }
  return { text: 'Good evening', icon: Moon, period: 'evening' }
}

// Get day name
function getDayName(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date().getDay()]
}

// Get motivational message based on time and day type
function getMotivationalMessage(dayType: string, period: 'morning' | 'afternoon' | 'evening'): string {
  const messages: Record<string, Record<string, string>> = {
    work: {
      morning: 'Make today count',
      afternoon: 'Stay focused, you\'re doing great',
      evening: 'Time to wind down',
    },
    off: {
      morning: 'A day to recharge',
      afternoon: 'Enjoy your time off',
      evening: 'Rest well tonight',
    },
    recovery: {
      morning: 'Be gentle with yourself today',
      afternoon: 'Take it easy',
      evening: 'Rest and restore',
    },
    class: {
      morning: 'Ready to learn',
      afternoon: 'Keep absorbing',
      evening: 'Review and rest',
    },
    study: {
      morning: 'Deep focus mode',
      afternoon: 'Stay in the zone',
      evening: 'Consolidate what you learned',
    },
    exam: {
      morning: 'Trust your preparation',
      afternoon: 'You\'ve got this',
      evening: 'Well done, rest now',
    },
  }
  return messages[dayType]?.[period] || 'Make today meaningful'
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
]

interface DailyGuideHomeProps {
  embedded?: boolean
}

export function DailyGuideHome({ embedded = false }: DailyGuideHomeProps) {
  const themeContext = useThemeOptional()
  const subscription = useSubscriptionOptional()
  const audioContext = useAudioOptional()
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
  // Mood tracking
  const [moodBefore, setMoodBefore] = useState<string | null>(null)
  const [moodAfter, setMoodAfter] = useState<string | null>(null)
  // Store fetched audio data for inline playback
  const [moduleAudioData, setModuleAudioData] = useState<Record<string, AudioData>>({})
  const isMountedRef = useRef(true)

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
    const genres = ['lofi', 'piano', 'jazz', 'classical', 'ambient', 'study']
    return genres[dayOfYear % genres.length]
  }

  const fetchData = useCallback(async () => {
    try {
      const [guideRes, prefsRes] = await Promise.all([
        fetch('/api/daily-guide/generate?date=' + today.toISOString(), { cache: 'no-store' }),
        fetch('/api/daily-guide/preferences', { cache: 'no-store' }),
      ])

      if (!isMountedRef.current) return

      let prefsData: any = null
      if (prefsRes.ok) {
        prefsData = await prefsRes.json()
        if (!isMountedRef.current) return
        setPreferences(prefsData)
        const genre = prefsData.preferred_music_genre || getTodaysMusicGenre(prefsData.preferred_music_genre)
        setCurrentMusicGenre(genre)
        // Sync with global audio context
        if (audioContext) {
          audioContext.setMusicGenre(genre)
          if (!embedded && prefsData.background_music_enabled && !audioContext.musicEnabled) {
            audioContext.setMusicEnabled(true)
          }
        }
      }

      if (!isMountedRef.current) return

      if (guideRes.ok) {
        const guideData = await guideRes.json()
        if (!isMountedRef.current) return
        if (guideData.data) {
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
          setGenerationError('Please sign in to generate your daily guide')
        } else {
          setGenerationError(errorData.error || 'Failed to generate guide. Please try again.')
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

  const handlePlayerComplete = () => {
    if (!activePlayer) return

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

  const getCurrentMorningModule = (): string | null => {
    for (const m of morningModules) {
      if (!completedModules.includes(m)) {
        return m
      }
    }
    return null
  }

  // Check for morning flow completion and trigger celebration
  useEffect(() => {
    if (!morningCompleteCelebrated && morningModules.length > 0) {
      const allCompleted = morningModules.every(m => completedModules.includes(m))
      if (allCompleted) {
        setShowMorningComplete(true)
        setMorningCompleteCelebrated(true)
      }
    }
  }, [completedModules, morningModules, morningCompleteCelebrated])

  // User type icon
  const UserTypeIcon = preferences?.user_type === 'student' ? GraduationCap
    : preferences?.user_type === 'hybrid' ? BookOpen
    : Briefcase

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

  return (
    <div className={embedded ? 'bg-black pb-8' : 'min-h-screen bg-black pb-32'}>
      {/* Trial Banner (hidden in embedded/drawer mode) */}
      {!embedded && <TrialBanner variant="compact" />}
      {!embedded && <TrialEndingBanner />}

      {/* Header */}
      <div className="p-6 animate-fade-in-down">
        {/* Greeting Section */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {(() => {
              const greeting = getTimeGreeting()
              const GreetingIcon = greeting.icon
              const dayName = getDayName()
              return (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-white/10 animate-pulse-glow">
                      <GreetingIcon className="w-4 h-4 text-white animate-icon-bounce" />
                    </div>
                    <span className="text-sm text-white/95">{greeting.text}</span>
                  </div>
                  <h1 className="text-2xl font-semibold text-white">
                    Happy {dayName}
                  </h1>
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
          </div>
        </div>

        {/* Day Type and Motivation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {guide && (
              <>
                <DayTypeIndicator dayType={guide.day_type as DayType} />
                <div>
                  <p className="text-sm font-medium text-white">
                    {DAY_TYPE_LABELS[guide.day_type]?.label || guide.day_type}
                  </p>
                  <p className="text-xs text-white/95">
                    {getMotivationalMessage(guide.day_type, getTimeGreeting().period)}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="p-2 rounded-xl bg-white/5">
            <UserTypeIcon className="w-4 h-4 text-white/95" />
          </div>
        </div>

        {/* Day type selector */}
        {guide && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 -mx-6 px-6">
            {getAvailableDayTypes().map(type => (
              <button
                key={type}
                onClick={() => toggleDayType(type)}
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

        {/* Energy selector (inline after initial selection) */}
        {guide && selectedEnergy && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-white/95">Energy level</span>
            <EnergySelector
              value={selectedEnergy}
              onChange={(e) => generateGuide(e)}
              disabled={isGenerating}
            />
          </div>
        )}

      </div>

      {/* Gradient divider */}
      <div className="mx-6 divider" />

      {/* Smart Nudge — inline card */}
      <div className="px-6 mb-4">
        <SmartNudgeBanner />
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
              <p className="text-sm text-red-400">{generationError}</p>
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
          {/* Rest Day Suggestion */}
          <RestDaySuggestion
            streak={streak}
            dayType={guide.day_type}
            onTakeRecoveryDay={() => toggleDayType('recovery')}
          />

          {/* Morning Mood Check-In */}
          {!moodBefore && getTimeGreeting().period === 'morning' && (
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
                        <h2 className="font-medium text-white">Morning Flow</h2>
                        <p className="text-xs text-white/95">
                          {completedModules.filter(m => morningModules.includes(m)).length}/{morningModules.length} complete
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MorningFlowProgress
                        modules={morningModules as ModuleType[]}
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
                      {morningModules.map((module, index) => {
                        // Use QuoteCard for movement/workout (Quote of the Day)
                        if (module === 'movement' || module === 'workout') {
                          return (
                            <div key={module} className={`animate-card-appear opacity-0 stagger-${Math.min(index + 1, 10)}`}>
                            <QuoteCard
                              isCompleted={completedModules.includes(module)}
                              mood={moodBefore}
                              energy={selectedEnergy}
                              dayType={guide.day_type}
                              onComplete={() => {
                                setCompletedModules(prev => [...prev, module])
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

                        // Use MicroLessonVideo for micro_lesson module to show Discover motivation videos
                        if (module === 'micro_lesson') {
                          return (
                            <div key={module} className={`animate-card-appear opacity-0 stagger-${Math.min(index + 1, 10)}`}>
                            <MicroLessonVideo
                              isCompleted={completedModules.includes(module)}
                              onComplete={() => {
                                setCompletedModules(prev => [...prev, module])
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
                          <div key={module} className={`animate-card-appear opacity-0 stagger-${Math.min(index + 1, 10)}`}>
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
            <CheckpointList
              checkpoints={checkpoints}
              scripts={{
                checkpoint_1: guide.checkpoint_1_script,
                checkpoint_2: guide.checkpoint_2_script,
                checkpoint_3: guide.checkpoint_3_script,
              }}
              completedCheckpoints={completedModules.filter(m => m.startsWith('checkpoint'))}
              currentTime={today}
              loadingCheckpoint={loadingModule?.startsWith('checkpoint') ? loadingModule : null}
              onPlayCheckpoint={(cp) => playModule(cp, musicEnabled)}
            />
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
        modulesCompleted={morningModules.length}
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
    </div>
  )
}
