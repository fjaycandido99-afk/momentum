'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Target,
  Sun,
  Moon,
  Leaf,
  Heart,
  Clock,
  Play,
  Pause,
  Check,
  Loader2,
  Zap,
  Brain,
  Sparkles,
  Lock,
  Crown,
  RotateCcw,
} from 'lucide-react'
import type { CheckpointConfig } from '@/lib/daily-guide/decision-tree'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { useAudioOptional } from '@/contexts/AudioContext'

interface CheckpointCardProps {
  checkpoint: CheckpointConfig
  script: string | null
  isAvailable: boolean
  isCompleted: boolean
  isLoading: boolean
  onPlay: () => void
  // For inline playback
  audioBase64?: string | null
  onComplete?: () => void
}

// Benefit types
type BenefitType = 'energy' | 'calm' | 'focus' | 'peace'

const BENEFIT_CONFIG: Record<BenefitType, { icon: typeof Zap; label: string; color: string }> = {
  energy: { icon: Zap, label: 'Energy', color: 'text-amber-400' },
  calm: { icon: Heart, label: 'Calm', color: 'text-blue-400' },
  focus: { icon: Brain, label: 'Focus', color: 'text-purple-400' },
  peace: { icon: Sparkles, label: 'Peace', color: 'text-teal-400' },
}

// Rich content for checkpoints
const CHECKPOINT_CONTENT: Record<string, {
  theme: string
  tagline: string
  defaultPreview: string
  benefit: { type: BenefitType; value: number }
  icon: typeof Target
}> = {
  'Focus Target': {
    theme: 'INTENTION',
    tagline: 'Lock in your priority',
    defaultPreview: '"What\'s the one thing that will make today a success?"',
    benefit: { type: 'focus', value: 2 },
    icon: Target,
  },
  'Midday Reset': {
    theme: 'RECALIBRATE',
    tagline: 'Check your course',
    defaultPreview: '"Pause. Assess. Are you still aligned with your intention?"',
    benefit: { type: 'focus', value: 2 },
    icon: Sun,
  },
  'Downshift': {
    theme: 'TRANSITION',
    tagline: 'Shift gears mindfully',
    defaultPreview: '"Begin to release the day\'s intensity. Soften your focus..."',
    benefit: { type: 'calm', value: 2 },
    icon: Moon,
  },
  'Nourish': {
    theme: 'SUSTAIN',
    tagline: 'Fuel your body',
    defaultPreview: '"Take this moment to eat mindfully. Notice each bite..."',
    benefit: { type: 'energy', value: 1 },
    icon: Leaf,
  },
  'Close the Loop': {
    theme: 'COMPLETION',
    tagline: 'Celebrate progress',
    defaultPreview: '"Acknowledge what you accomplished. Release what remains..."',
    benefit: { type: 'peace', value: 2 },
    icon: Heart,
  },
  'Gentle Movement': {
    theme: 'RESTORE',
    tagline: 'Move with intention',
    defaultPreview: '"Gentle stretches to release tension. Move slowly..."',
    benefit: { type: 'energy', value: 1 },
    icon: Heart,
  },
}

// Default content for unknown checkpoints
const DEFAULT_CHECKPOINT_CONTENT = {
  theme: 'CHECK-IN',
  tagline: 'Stay present',
  defaultPreview: '"Take a moment to check in with yourself..."',
  benefit: { type: 'focus' as BenefitType, value: 1 },
  icon: Clock,
}

function getCheckpointContent(name: string) {
  return CHECKPOINT_CONTENT[name] || DEFAULT_CHECKPOINT_CONTENT
}

export function CheckpointCard({
  checkpoint,
  script,
  isAvailable,
  isCompleted,
  isLoading,
  onPlay,
  audioBase64,
  onComplete,
}: CheckpointCardProps) {
  const content = getCheckpointContent(checkpoint.name)
  const Icon = content.icon
  const benefit = BENEFIT_CONFIG[content.benefit.type]
  const BenefitIcon = benefit.icon
  const audioContext = useAudioOptional()

  // Inline audio player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(60)
  const [isAudioLoading, setIsAudioLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const playbackInitiatedRef = useRef(false)

  // Timer for tracking playback
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

  // Handle play - fetch audio if needed, then play
  const handlePlay = useCallback(async () => {
    if (isPlaying) return

    setIsAudioLoading(true)

    // If no audio data, fetch it first
    if (!audioBase64) {
      playbackInitiatedRef.current = true
      onPlay()
      return
    }

    // Cleanup any previous audio instance
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }

    // Create audio and play
    const audioSource = `data:audio/mpeg;base64,${audioBase64}`
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
      console.error('[CheckpointCard] Error playing audio:', error)
      setIsAudioLoading(false)
    }
  }, [audioBase64, isPlaying, onPlay, onComplete])

  // Auto-play when audioBase64 arrives (after fetch)
  useEffect(() => {
    if (isAudioLoading && !isPlaying && playbackInitiatedRef.current) {
      if (audioBase64) {
        playbackInitiatedRef.current = false
        handlePlay()
      }
    }
  }, [audioBase64, isAudioLoading, isPlaying, handlePlay])

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
    playbackInitiatedRef.current = false
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

  const formatPlaybackTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Extract preview from script or use default
  const preview = script
    ? `"${script.split(/[.!?]+/)[1]?.trim().slice(0, 60) || script.slice(0, 60)}..."`
    : content.defaultPreview

  return (
    <div
      className={`
        relative rounded-2xl border overflow-hidden transition-all
        ${isCompleted
          ? 'bg-white/[0.03] border-white/15'
          : isAvailable
            ? 'bg-gradient-to-br from-white/[0.06] to-white/[0.02] border-white/15 hover:border-white/25'
            : 'bg-white/[0.02] border-white/5 opacity-50'
        }
      `}
    >
      {/* Theme Header */}
      <div className={`px-4 pt-4 pb-2 ${isCompleted ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-sm font-semibold tracking-wider ${isCompleted ? 'text-white/50' : 'text-white'}`}>
              {content.theme}
            </h2>
            <p className={`text-xs ${isCompleted ? 'text-white/50' : 'text-white/70'}`}>
              {content.tagline}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Benefit indicator */}
            {!isCompleted && isAvailable && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 ${benefit.color}`}>
                <BenefitIcon className="w-3 h-3" />
                <span className="text-xs font-medium">+{content.benefit.value}</span>
              </div>
            )}
            {isCompleted && (
              <div className="p-1.5 rounded-full bg-white/10">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className={`px-4 py-3 ${isCompleted ? 'opacity-40' : ''}`}>
        <p className={`text-sm leading-relaxed ${isCompleted ? 'text-white/50' : 'text-white/70'} line-clamp-2`}>
          {preview}
        </p>
      </div>

      {/* Footer */}
      <div className={`px-4 pb-4 pt-2 ${isCompleted ? 'opacity-50' : ''}`}>
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
                <div className="text-xs text-white/50 font-mono">
                  {formatPlaybackTime(currentTime)} / {formatPlaybackTime(audioDuration)}
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
                <Check className="w-3.5 h-3.5 text-white" />
                <span className="text-xs text-white">Done</span>
              </button>
            </div>
          </div>
        ) : (
          /* Default view - not playing */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-xl transition-all
                ${isCompleted ? 'bg-white/5' : isAvailable ? 'bg-white/10 animate-pulse-glow' : 'bg-white/5'}
              `}>
                <Icon className={`
                  w-4 h-4 transition-all
                  ${isCompleted ? 'text-white/50' : isAvailable ? 'text-white animate-icon-bounce' : 'text-white/50'}
                `} />
              </div>
              <div>
                <p className={`text-sm font-medium ${isCompleted ? 'text-white/50' : 'text-white'}`}>
                  {checkpoint.name}
                </p>
                <span className={`text-xs ${isCompleted ? 'text-white/50' : 'text-white/50'}`}>
                  {formatTime(checkpoint.time)}
                </span>
              </div>
            </div>

            {/* Actions */}
            {isAvailable && !isCompleted && script ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePlay()
                }}
                disabled={isLoading || isAudioLoading}
                aria-label={`Play ${checkpoint.name}`}
                aria-busy={isLoading || isAudioLoading}
                className={`
                  p-3 rounded-xl transition-all
                  bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed
                  focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none
                `}
              >
                {isLoading || isAudioLoading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Play className="w-5 h-5 text-white fill-current" />
                )}
              </button>
            ) : isCompleted ? (
              // Replay button for completed checkpoints
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePlay()
                }}
                disabled={isLoading || isAudioLoading || !script}
                aria-label={`Replay ${checkpoint.name}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                title="Listen again"
              >
                {isLoading || isAudioLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-white/50 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-white/70" />
                )}
                <span className="text-xs text-white/70">Replay</span>
              </button>
            ) : !isAvailable ? (
              // Not available indicator
              <div className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/50">
                {formatTime(checkpoint.time)}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

// Audio data type for checkpoints
interface AudioData {
  script: string
  audioBase64: string | null
  duration: number
}

// Compact list of checkpoints
interface CheckpointListProps {
  checkpoints: CheckpointConfig[]
  scripts: Record<string, string | null>
  audioData?: Record<string, AudioData | undefined>
  completedCheckpoints: string[]
  currentTime: Date
  loadingCheckpoint: string | null
  onPlayCheckpoint: (checkpointId: string) => void
  onCompleteCheckpoint?: (checkpointId: string) => void
}

export function CheckpointList({
  checkpoints,
  scripts,
  audioData,
  completedCheckpoints,
  currentTime,
  loadingCheckpoint,
  onPlayCheckpoint,
  onCompleteCheckpoint,
}: CheckpointListProps) {
  const subscription = useSubscriptionOptional()
  const isPremium = subscription?.isPremium ?? false

  const isCheckpointAvailable = (checkpoint: CheckpointConfig) => {
    const [hours, minutes] = checkpoint.time.split(':').map(Number)
    const checkpointTime = new Date(currentTime)
    checkpointTime.setHours(hours, minutes, 0, 0)

    // Available if current time is within 30 minutes before or any time after
    const thirtyMinutesBefore = new Date(checkpointTime)
    thirtyMinutesBefore.setMinutes(thirtyMinutesBefore.getMinutes() - 30)

    return currentTime >= thirtyMinutesBefore
  }

  if (checkpoints.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-medium text-white uppercase tracking-wider">
          Checkpoints
        </h2>
        {!isPremium && (
          <button
            onClick={() => subscription?.openUpgradeModal()}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <Lock className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>
      <div className="space-y-3">
        {checkpoints.map((checkpoint, index) => (
          <div key={checkpoint.id} className={`animate-fade-in opacity-0 stagger-${Math.min(index + 1, 10)}`}>
            <CheckpointCard
              checkpoint={checkpoint}
              script={audioData?.[checkpoint.id]?.script || scripts[checkpoint.id] || null}
              isAvailable={isCheckpointAvailable(checkpoint)}
              isCompleted={completedCheckpoints.includes(checkpoint.id)}
              isLoading={loadingCheckpoint === checkpoint.id}
              onPlay={() => onPlayCheckpoint(checkpoint.id)}
              audioBase64={audioData?.[checkpoint.id]?.audioBase64}
              onComplete={() => onCompleteCheckpoint?.(checkpoint.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
