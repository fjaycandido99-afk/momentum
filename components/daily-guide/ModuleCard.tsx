'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import {
  Sun,
  Dumbbell,
  Wind,
  Lightbulb,
  Moon,
  Sunrise,
  Play,
  Pause,
  Check,
  Loader2,
  SkipForward,
  Activity,
  Zap,
  Heart,
  Brain,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import type { ModuleType } from '@/lib/daily-guide/decision-tree'
import { useAudioOptional } from '@/contexts/AudioContext'

// Get day name for dynamic messaging
function getDayName(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date().getDay()]
}

// Get time of day for context
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

interface ModuleCardProps {
  module: ModuleType
  script: string | null
  duration: number
  isCompleted: boolean
  isLoading: boolean
  isActive?: boolean
  musicEnabled?: boolean
  musicGenre?: string
  onPlay: () => void
  onSkip?: () => void
  onComplete?: () => void
  // For inline playback
  audioBase64?: string | null
  audioUrl?: string | null
}

// Genre display labels
const GENRE_LABELS: Record<string, string> = {
  lofi: 'Lo-Fi',
  piano: 'Piano',
  jazz: 'Jazz',
  classical: 'Classical',
  ambient: 'Ambient',
  study: 'Study',
}

// Benefit types for mood/energy indicators
type BenefitType = 'energy' | 'calm' | 'focus' | 'peace' | 'confidence'

const BENEFIT_CONFIG: Record<BenefitType, { icon: typeof Zap; label: string; color: string }> = {
  energy: { icon: Zap, label: 'Energy', color: 'text-amber-400' },
  calm: { icon: Heart, label: 'Calm', color: 'text-blue-400' },
  focus: { icon: Brain, label: 'Focus', color: 'text-purple-400' },
  peace: { icon: Sparkles, label: 'Peace', color: 'text-teal-400' },
  confidence: { icon: Zap, label: 'Confidence', color: 'text-orange-400' },
}

// Rich content configuration for each module
const MODULE_CONTENT: Record<
  string,
  {
    theme: string
    tagline: string | ((day: string) => string)
    label: string
    icon: typeof Sun
    defaultPreview: string
    metadata?: string
    technique?: string
    pattern?: string
    benefit?: { type: BenefitType; value: number }
  }
> = {
  morning_prime: {
    theme: 'WELCOME',
    tagline: (day) => `Good morning, beautiful ${day}`,
    label: 'Morning Greeting',
    icon: Sunrise,
    defaultPreview: '"You woke up today. That\'s already a win. Let\'s make it count..."',
    metadata: 'Start your day right',
    benefit: { type: 'confidence', value: 2 },
  },
  workout: {
    theme: 'WISDOM',
    tagline: 'Daily inspiration',
    label: 'Quote of the Day',
    icon: Sparkles,
    defaultPreview: '"The only way to do great work is to love what you do." - Steve Jobs',
    metadata: 'Inspiration',
    benefit: { type: 'focus', value: 2 },
  },
  movement: {
    theme: 'WISDOM',
    tagline: 'Daily inspiration',
    label: 'Quote of the Day',
    icon: Sparkles,
    defaultPreview: '"The only way to do great work is to love what you do." - Steve Jobs',
    metadata: 'Inspiration',
    benefit: { type: 'focus', value: 2 },
  },
  breath: {
    theme: 'CALM',
    tagline: 'Center yourself',
    label: 'Grounding Breath',
    icon: Wind,
    defaultPreview: 'Box Breathing',
    technique: 'Box Breathing',
    pattern: '4 in · 4 hold · 4 out · 4 hold',
    benefit: { type: 'calm', value: 3 },
  },
  micro_lesson: {
    theme: 'MOTIVATION',
    tagline: 'Get inspired',
    label: 'Motivation Video',
    icon: Lightbulb,
    defaultPreview: 'Watch a short motivational clip to fuel your day',
    metadata: 'Video',
    benefit: { type: 'energy', value: 3 },
  },
  day_close: {
    theme: 'PEACE',
    tagline: 'Release the day',
    label: 'Evening Reflection',
    icon: Moon,
    defaultPreview: '"Acknowledge what you accomplished. Release what you cannot control..."',
    metadata: 'Wind down',
    benefit: { type: 'peace', value: 3 },
  },
  checkpoint_1: {
    theme: 'CHECK-IN',
    tagline: 'Stay on track',
    label: 'Midday Reset',
    icon: Sun,
    defaultPreview: '"Pause. Breathe. How are you showing up right now?"',
    benefit: { type: 'focus', value: 1 },
  },
  checkpoint_2: {
    theme: 'CHECK-IN',
    tagline: 'Stay on track',
    label: 'Afternoon Boost',
    icon: Sun,
    defaultPreview: '"You\'re past the midpoint. Keep the momentum going..."',
    benefit: { type: 'energy', value: 1 },
  },
  checkpoint_3: {
    theme: 'CHECK-IN',
    tagline: 'Stay on track',
    label: 'Final Push',
    icon: Sun,
    defaultPreview: '"The home stretch. Finish strong..."',
    benefit: { type: 'energy', value: 2 },
  },
  pre_study: {
    theme: 'FOCUS',
    tagline: 'Prepare your mind',
    label: 'Pre-Study Focus',
    icon: Lightbulb,
    defaultPreview: '"Clear your mental space. Set your learning intention..."',
    benefit: { type: 'focus', value: 3 },
  },
  study_break: {
    theme: 'REFRESH',
    tagline: 'Reset and recharge',
    label: 'Study Break',
    icon: Sun,
    defaultPreview: '"Step back. Let your mind consolidate what you\'ve learned..."',
    benefit: { type: 'calm', value: 2 },
  },
  exam_calm: {
    theme: 'CONFIDENCE',
    tagline: 'Trust yourself',
    label: 'Exam Calm',
    icon: Wind,
    defaultPreview: '"You\'ve prepared for this. Trust your knowledge..."',
    technique: 'Calming Breath',
    benefit: { type: 'confidence', value: 3 },
  },
}

// Extract a preview quote from script
function extractPreview(script: string | null, defaultPreview: string): string {
  if (!script) return defaultPreview

  // Try to find a compelling sentence from the script
  const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 20 && s.trim().length < 100)
  if (sentences.length > 0) {
    // Get a sentence from the first third of the script (usually the hook)
    const hookSentence = sentences[Math.min(1, sentences.length - 1)]?.trim()
    if (hookSentence) {
      return `"${hookSentence}..."`
    }
  }

  return defaultPreview
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes === 0) {
    return `${remainingSeconds}s`
  }
  if (remainingSeconds === 0) {
    return `${minutes}m`
  }
  return `${minutes}m ${remainingSeconds}s`
}

export function ModuleCard({
  module,
  script,
  duration,
  isCompleted,
  isLoading,
  isActive,
  musicEnabled,
  musicGenre,
  onPlay,
  onSkip,
  onComplete,
  audioBase64,
  audioUrl,
}: ModuleCardProps) {
  const content = MODULE_CONTENT[module] || MODULE_CONTENT.morning_prime
  const Icon = content.icon
  const dayName = getDayName()
  const audioContext = useAudioOptional()

  // Inline audio player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration)
  const [isAudioLoading, setIsAudioLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pendingPlayRef = useRef(false) // Use ref to avoid closure issues

  // Pause/resume background music when inline audio plays/stops
  useEffect(() => {
    if (!audioContext) return

    if (isPlaying) {
      // Pause background music when module audio plays
      console.log('[ModuleCard] Pausing background music')
      audioContext.pauseMusic()
    } else if (hasStarted && !isPlaying) {
      // Resume background music when module audio pauses/stops
      console.log('[ModuleCard] Resuming background music')
      audioContext.resumeMusic()
    }
  }, [isPlaying, hasStarted, audioContext])

  // Get dynamic tagline
  const tagline = typeof content.tagline === 'function'
    ? content.tagline(dayName)
    : content.tagline

  // Get preview text - either from script or default
  const preview = useMemo(() => {
    return extractPreview(script, content.defaultPreview)
  }, [script, content.defaultPreview])

  // Check if this is a breath module to show pattern
  const isBreathModule = module === 'breath' || module === 'exam_calm'

  // Get benefit config if exists
  const benefit = content.benefit ? BENEFIT_CONFIG[content.benefit.type] : null
  const BenefitIcon = benefit?.icon

  // Initialize audio when we have audio data
  useEffect(() => {
    const audioSource = audioBase64
      ? `data:audio/mpeg;base64,${audioBase64}`
      : audioUrl

    console.log('[ModuleCard] Audio effect running, source:', audioSource ? 'yes' : 'no', 'pendingPlayRef:', pendingPlayRef.current)

    if (!audioSource) return

    // Create audio element if not exists
    if (!audioRef.current) {
      audioRef.current = new Audio()
      console.log('[ModuleCard] Created new Audio element')
    }

    const audio = audioRef.current
    audio.src = audioSource
    console.log('[ModuleCard] Set audio source')

    const handleLoadedMetadata = () => {
      console.log('[ModuleCard] loadedmetadata, duration:', audio.duration)
      setAudioDuration(audio.duration)
      setIsAudioLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      console.log('[ModuleCard] Audio ended')
      setIsPlaying(false)
      setCurrentTime(0)
      onComplete?.()
    }

    const handlePlay = () => {
      console.log('[ModuleCard] Audio playing')
      setIsPlaying(true)
    }
    const handlePause = () => {
      console.log('[ModuleCard] Audio paused')
      setIsPlaying(false)
    }

    // Handle canplaythrough - auto-play if we were waiting (use ref for latest value)
    const handleCanPlay = () => {
      console.log('[ModuleCard] canplaythrough, pendingPlayRef:', pendingPlayRef.current)
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false
        setHasStarted(true)
        setIsAudioLoading(false)
        console.log('[ModuleCard] Auto-playing...')
        audio.play().catch(e => console.error('[ModuleCard] Play error:', e))
      }
    }

    // Also try loadeddata as fallback
    const handleLoadedData = () => {
      console.log('[ModuleCard] loadeddata, pendingPlayRef:', pendingPlayRef.current)
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false
        setHasStarted(true)
        setIsAudioLoading(false)
        console.log('[ModuleCard] Auto-playing from loadeddata...')
        audio.play().catch(e => console.error('[ModuleCard] Play error:', e))
      }
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('canplaythrough', handleCanPlay)
    audio.addEventListener('loadeddata', handleLoadedData)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('canplaythrough', handleCanPlay)
      audio.removeEventListener('loadeddata', handleLoadedData)
    }
  }, [audioBase64, audioUrl, onComplete])

  // Cleanup on unmount
  useEffect(() => {
    const ctx = audioContext
    const started = hasStarted
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      // Resume background music if we were playing
      if (ctx && started) {
        console.log('[ModuleCard] Cleanup - resuming background music')
        ctx.resumeMusic()
      }
    }
  }, [audioContext, hasStarted])

  const handlePlayPause = useCallback(async () => {
    console.log('[ModuleCard] handlePlayPause called, audioBase64:', !!audioBase64, 'audioUrl:', !!audioUrl, 'isPlaying:', isPlaying)

    // If no audio data loaded yet, call onPlay to fetch it
    if (!audioBase64 && !audioUrl) {
      console.log('[ModuleCard] No audio data, fetching... setting pendingPlayRef to true')
      setIsAudioLoading(true)
      pendingPlayRef.current = true // Will auto-play once data arrives
      onPlay()
      return
    }

    if (!audioRef.current) {
      console.log('[ModuleCard] No audio ref!')
      return
    }

    if (isPlaying) {
      console.log('[ModuleCard] Pausing audio')
      audioRef.current.pause()
    } else {
      console.log('[ModuleCard] Playing audio')
      setIsAudioLoading(true)
      try {
        await audioRef.current.play()
        setHasStarted(true)
        console.log('[ModuleCard] Play started')
      } catch (error) {
        console.error('[ModuleCard] Error playing audio:', error)
      }
      setIsAudioLoading(false)
    }
  }, [audioBase64, audioUrl, isPlaying, onPlay])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * audioDuration

    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [audioDuration])

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Has inline audio capability
  const hasInlineAudio = !!(audioBase64 || audioUrl)

  return (
    <div
      className={`
        relative rounded-2xl border overflow-hidden transition-all
        ${isCompleted
          ? 'bg-white/[0.03] border-white/10'
          : isActive
            ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.03] border-white/20 ring-1 ring-white/10'
            : 'bg-gradient-to-br from-white/[0.06] to-white/[0.02] border-white/10 hover:border-white/20'
        }
      `}
    >
      {/* Theme Header */}
      <div className={`px-4 pt-4 pb-2 ${isCompleted ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-sm font-semibold tracking-wider ${isCompleted ? 'text-white/50' : 'text-white/90'}`}>
              {content.theme}
            </h2>
            <p className={`text-xs ${isCompleted ? 'text-white/30' : 'text-white/50'}`}>
              {tagline}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Benefit indicator */}
            {benefit && content.benefit && !isCompleted && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 ${benefit.color}`}>
                {BenefitIcon && <BenefitIcon className="w-3 h-3" />}
                <span className="text-xs font-medium">+{content.benefit.value}</span>
              </div>
            )}
            {isCompleted && (
              <div className="p-1.5 rounded-full bg-white/10">
                <Check className="w-4 h-4 text-white/70" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Preview */}
      <div className={`px-4 py-3 ${isCompleted ? 'opacity-40' : ''}`}>
        {isBreathModule && content.technique ? (
          // Breath module - show technique and pattern
          <div className="space-y-2">
            <p className="text-white font-medium">{content.technique}</p>
            {content.pattern && (
              <p className="text-sm text-white/70 font-mono tracking-wide">
                {content.pattern}
              </p>
            )}
          </div>
        ) : (
          // Other modules - show preview quote
          <p className={`text-sm leading-relaxed ${isCompleted ? 'text-white/40' : 'text-white/80'} line-clamp-2`}>
            {preview}
          </p>
        )}
      </div>

      {/* Footer with label, duration, and actions */}
      <div className={`px-4 pb-4 pt-2 ${isCompleted ? 'opacity-50' : ''}`}>
        {/* Inline Player - shown when audio is playing, loading, or has been started */}
        {(isPlaying || hasStarted || isAudioLoading) && (hasInlineAudio || isAudioLoading) && !isCompleted ? (
          <div className="space-y-3">
            {/* Progress bar */}
            <div
              className="relative h-1.5 bg-white/10 rounded-full cursor-pointer group"
              onClick={handleSeek}
            >
              <div
                className="absolute left-0 top-0 h-full bg-white/80 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Play/Pause button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePlayPause()
                  }}
                  disabled={isAudioLoading}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                >
                  {isAudioLoading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white fill-current" />
                  )}
                </button>

                {/* Time display */}
                <div className="text-xs text-white/60 font-mono">
                  {formatTime(currentTime)} / {formatTime(audioDuration)}
                </div>
              </div>

              {/* Module info */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/5">
                  <Icon className="w-3.5 h-3.5 text-white/60" />
                </div>
                <span className="text-xs text-white/50">{content.label}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Default view - not playing */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-xl transition-all
                ${isCompleted ? 'bg-white/5' : isActive ? 'bg-white/15 animate-pulse-glow' : 'bg-white/10'}
              `}>
                <Icon className={`
                  w-4 h-4 transition-all
                  ${isCompleted ? 'text-white/50' : isActive ? 'text-white animate-icon-bounce' : 'text-white/80'}
                `} />
              </div>
              <div>
                <p className={`text-sm font-medium ${isCompleted ? 'text-white/50' : 'text-white'}`}>
                  {content.label}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${isCompleted ? 'text-white/30' : 'text-white/50'}`}>
                    {formatDuration(duration)}
                  </span>
                  {content.metadata && (
                    <>
                      <span className="text-white/30">·</span>
                      <span className={`text-xs ${isCompleted ? 'text-white/30' : 'text-white/50'}`}>
                        {content.metadata}
                      </span>
                    </>
                  )}
                  {musicEnabled && musicGenre && !isCompleted && (
                    <>
                      <span className="text-white/30">·</span>
                      <span className="text-xs text-purple-400/80">
                        {GENRE_LABELS[musicGenre] || musicGenre}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            {!isCompleted ? (
              <div className="flex items-center gap-2">
                {onSkip && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSkip()
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    title="Skip this module"
                  >
                    <SkipForward className="w-4 h-4 text-white/50" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePlayPause()
                  }}
                  disabled={isLoading || isAudioLoading || !script}
                  className={`
                    p-3 rounded-xl transition-all
                    bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${isActive ? 'ring-2 ring-white/30' : ''}
                  `}
                >
                  {isLoading || isAudioLoading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Play className="w-5 h-5 text-white fill-current" />
                  )}
                </button>
              </div>
            ) : (
              // Replay button for completed modules
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePlayPause()
                }}
                disabled={isLoading || isAudioLoading || !script}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                title="Listen again"
              >
                {isLoading || isAudioLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-white/50 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-white/50" />
                )}
                <span className="text-xs text-white/50">Replay</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active indicator line */}
      {isActive && !isCompleted && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/60 rounded-r-full" />
      )}
    </div>
  )
}

// Morning flow progress indicator
interface MorningFlowProps {
  modules: ModuleType[]
  completedModules: string[]
  currentModule: ModuleType | null
}

export function MorningFlowProgress({ modules, completedModules, currentModule }: MorningFlowProps) {
  const morningModules = modules.filter(m =>
    ['morning_prime', 'workout', 'movement', 'breath', 'micro_lesson'].includes(m)
  )

  return (
    <div className="flex items-center justify-center gap-2">
      {morningModules.map((module, index) => {
        const isCompleted = completedModules.includes(module)
        const isCurrent = currentModule === module

        return (
          <div key={module} className="flex items-center">
            <div
              className={`
                w-2.5 h-2.5 rounded-full transition-all
                ${isCompleted
                  ? 'bg-white'
                  : isCurrent
                    ? 'bg-white/60 animate-pulse'
                    : 'bg-white/20'
                }
              `}
            />
            {index < morningModules.length - 1 && (
              <div className={`w-6 h-0.5 ${isCompleted ? 'bg-white/50' : 'bg-white/10'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
