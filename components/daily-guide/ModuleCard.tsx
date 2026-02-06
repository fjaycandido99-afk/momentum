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
  // Text-only mode: show script as readable text when no audio
  textOnly?: boolean
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
  textOnly,
}: ModuleCardProps) {
  const content = MODULE_CONTENT[module] || MODULE_CONTENT.morning_prime
  const Icon = content.icon
  const dayName = getDayName()
  const audioContext = useAudioOptional()

  // Text-only reading mode state
  const [isReadingMode, setIsReadingMode] = useState(false)
  const [readingScript, setReadingScript] = useState<string | null>(null)

  // Inline audio player state - simplified like MicroLessonVideo
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration)
  const [isAudioLoading, setIsAudioLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  // Track if playback was initiated from button click (prevents double-play from useEffect)
  const playbackInitiatedRef = useRef(false)

  // Timer for tracking playback (like MicroLessonVideo)
  useEffect(() => {
    if (isPlaying && !isPaused) {
      timerRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime)
        }
      }, 100)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isPlaying, isPaused])

  // Pause/resume background music when playing
  useEffect(() => {
    if (!audioContext) return

    if (isPlaying && !isPaused) {
      audioContext.pauseMusic()
    } else {
      audioContext.resumeMusic()
    }
  }, [isPlaying, isPaused, audioContext])

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Handle play - fetch audio if needed, then play (or enter reading mode for text-only)
  const handlePlay = useCallback(async () => {
    // If already playing or in reading mode, this shouldn't be called
    if (isPlaying || isReadingMode) return

    setIsAudioLoading(true)

    // If no audio data, fetch it first
    if (!audioBase64 && !audioUrl) {
      playbackInitiatedRef.current = true // Mark that we initiated playback from button
      onPlay() // This will fetch and update the audioBase64 prop
      return
    }

    // Cleanup any previous audio instance before creating new one (prevents overlapping audio)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }

    // Create audio and play
    const audioSource = audioBase64
      ? `data:audio/mpeg;base64,${audioBase64}`
      : audioUrl

    if (!audioSource) {
      setIsAudioLoading(false)
      return
    }

    const audio = new Audio(audioSource)
    audioRef.current = audio

    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration)
    }

    audio.onended = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setCurrentTime(0)
      onComplete?.()
    }

    try {
      await audio.play()
      setIsPlaying(true)
      setIsPaused(false)
      setIsAudioLoading(false)
    } catch (error) {
      console.error('[ModuleCard] Error playing audio:', error)
      setIsAudioLoading(false)
    }
  }, [audioBase64, audioUrl, isPlaying, isReadingMode, onPlay, onComplete])

  // Auto-play when audioBase64 arrives (after fetch), or enter reading mode for text-only
  // Only trigger if playback was initiated from button click (prevents auto-play on mount)
  useEffect(() => {
    if (isAudioLoading && !isPlaying && playbackInitiatedRef.current) {
      if (audioBase64) {
        playbackInitiatedRef.current = false // Reset ref after handling
        handlePlay()
      } else if (textOnly && script) {
        // Text-only mode: show script as readable text instead of playing audio
        playbackInitiatedRef.current = false // Reset ref after handling
        setReadingScript(script)
        setIsReadingMode(true)
        setIsAudioLoading(false)
      }
    }
  }, [audioBase64, script, textOnly, isAudioLoading, isPlaying, handlePlay])

  // Handle pause/resume toggle
  const handlePauseToggle = useCallback(() => {
    if (!audioRef.current) return

    if (isPaused) {
      audioRef.current.play()
      setIsPaused(false)
    } else {
      audioRef.current.pause()
      setIsPaused(true)
    }
  }, [isPaused])

  // Handle close/done
  const handleClose = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
    playbackInitiatedRef.current = false // Reset ref on close
    onComplete?.()
  }, [onComplete])

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
        relative rounded-2xl border overflow-hidden transition-all duration-300
        ${isCompleted
          ? 'bg-white/[0.03] border-white/10 transition-opacity duration-500'
          : isActive
            ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.03] border-white/20 ring-1 ring-white/10 shadow-[0_0_25px_rgba(255,255,255,0.1)] animate-card-appear'
            : 'bg-gradient-to-br from-white/[0.06] to-white/[0.02] border-white/15 shadow-[0_0_15px_rgba(255,255,255,0.06)] card-hover'
        }
      `}
    >
      {/* Theme Header */}
      <div className={`px-4 pt-4 pb-2 ${isCompleted ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-sm font-semibold tracking-wider ${isCompleted ? 'text-white/95' : 'text-white/95'}`}>
              {content.theme}
            </h2>
            <p className={`text-xs ${isCompleted ? 'text-white/95' : 'text-white/95'}`}>
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
                <Check className="w-4 h-4 text-white/95" />
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
              <p className="text-sm text-white/95 font-mono tracking-wide">
                {content.pattern}
              </p>
            )}
          </div>
        ) : (
          // Other modules - show preview quote
          <p className={`text-sm leading-relaxed ${isCompleted ? 'text-white/95' : 'text-white/95'} line-clamp-2`}>
            {preview}
          </p>
        )}
      </div>

      {/* Text-only reading mode — shown for free users without AI voice */}
      {isReadingMode && readingScript && !isCompleted && (
        <div className="px-4 pb-4">
          <div className="rounded-xl bg-amber-950/20 border border-white/10 border-l-2 border-l-amber-400/60 p-4 max-h-60 overflow-y-auto">
            <p className="text-sm text-white/95 leading-relaxed whitespace-pre-line">
              {readingScript}
            </p>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-amber-400/70">
              Text-only mode
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsReadingMode(false)
                setReadingScript(null)
                onComplete?.()
              }}
              aria-label="Done reading"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              <Check className="w-3.5 h-3.5 text-white/95" />
              <span className="text-xs text-white/95">Done</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer with label, duration, and actions */}
      <div className={`px-4 pb-4 pt-2 ${isCompleted || isReadingMode ? 'opacity-50' : ''}`}>
        {/* Inline Player - shown when audio is playing */}
        {isPlaying && !isCompleted ? (
          <div className="space-y-3">
            {/* Progress bar */}
            <div
              role="progressbar"
              aria-valuenow={Math.round(currentTime)}
              aria-valuemin={0}
              aria-valuemax={Math.round(audioDuration)}
              aria-label="Playback progress"
              className="relative h-1.5 bg-white/10 rounded-full cursor-pointer group"
              onClick={handleSeek}
            >
              <div
                className="absolute left-0 top-0 h-full bg-white/80 rounded-full transition-all shadow-[0_0_6px_rgba(255,255,255,0.15)]"
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
                    handlePauseToggle()
                  }}
                  aria-label={isPaused ? 'Resume' : 'Pause'}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  {isPaused ? (
                    <Play className="w-5 h-5 text-white fill-current" />
                  ) : (
                    <Pause className="w-5 h-5 text-white" />
                  )}
                </button>

                {/* Time display */}
                <div className="text-xs text-white/95 font-mono">
                  {formatTime(currentTime)} / {formatTime(audioDuration)}
                </div>
              </div>

              {/* Done button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose()
                }}
                aria-label="Done"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <Check className="w-3.5 h-3.5 text-white/95" />
                <span className="text-xs text-white/95">Done</span>
              </button>
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
                  ${isCompleted ? 'text-white/95' : isActive ? 'text-white animate-icon-bounce' : 'text-white/95'}
                `} />
              </div>
              <div>
                <p className={`text-sm font-medium ${isCompleted ? 'text-white/95' : 'text-white'}`}>
                  {content.label}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${isCompleted ? 'text-white/95' : 'text-white/95'}`}>
                    {formatDuration(duration)}
                  </span>
                  {content.metadata && (
                    <>
                      <span className="text-white/95">·</span>
                      <span className={`text-xs ${isCompleted ? 'text-white/95' : 'text-white/95'}`}>
                        {content.metadata}
                      </span>
                    </>
                  )}
                  {musicEnabled && musicGenre && !isCompleted && (
                    <>
                      <span className="text-white/95">·</span>
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
                    aria-label={`Skip ${content.label}`}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                    title="Skip this module"
                  >
                    <SkipForward className="w-4 h-4 text-white/95" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePlay()
                  }}
                  disabled={isLoading || isAudioLoading || !script}
                  aria-label={`Play ${content.label}`}
                  aria-busy={isLoading || isAudioLoading}
                  className={`
                    p-3 rounded-xl transition-all press-scale
                    bg-white/10 hover:bg-white/20 hover:scale-105
                    disabled:opacity-40 disabled:cursor-not-allowed
                    focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none
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
                  handlePlay()
                }}
                disabled={isLoading || isAudioLoading || !script}
                aria-label={`Replay ${content.label}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                title="Listen again"
              >
                {isLoading || isAudioLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-white/95 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-white/95" />
                )}
                <span className="text-xs text-white/95">Replay</span>
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
