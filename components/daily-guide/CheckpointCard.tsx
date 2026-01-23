'use client'

import {
  Target,
  Sun,
  Moon,
  Leaf,
  Heart,
  Clock,
  Play,
  Check,
  Loader2,
  Zap,
  Brain,
  Sparkles,
} from 'lucide-react'
import type { CheckpointConfig } from '@/lib/daily-guide/decision-tree'

interface CheckpointCardProps {
  checkpoint: CheckpointConfig
  script: string | null
  isAvailable: boolean
  isCompleted: boolean
  isLoading: boolean
  onPlay: () => void
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
}: CheckpointCardProps) {
  const content = getCheckpointContent(checkpoint.name)
  const Icon = content.icon
  const benefit = BENEFIT_CONFIG[content.benefit.type]
  const BenefitIcon = benefit.icon

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
          ? 'bg-white/[0.03] border-white/10'
          : isAvailable
            ? 'bg-gradient-to-br from-white/[0.06] to-white/[0.02] border-white/10 hover:border-white/20'
            : 'bg-white/[0.02] border-white/5 opacity-50'
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
                <Check className="w-4 h-4 text-white/70" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className={`px-4 py-3 ${isCompleted ? 'opacity-40' : ''}`}>
        <p className={`text-sm leading-relaxed ${isCompleted ? 'text-white/40' : 'text-white/80'} line-clamp-2`}>
          {preview}
        </p>
      </div>

      {/* Footer */}
      <div className={`px-4 pb-4 pt-2 flex items-center justify-between ${isCompleted ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-3">
          <div className={`
            p-2 rounded-xl transition-all
            ${isCompleted ? 'bg-white/5' : isAvailable ? 'bg-white/10 animate-pulse-glow' : 'bg-white/5'}
          `}>
            <Icon className={`
              w-4 h-4 transition-all
              ${isCompleted ? 'text-white/50' : isAvailable ? 'text-white animate-icon-bounce' : 'text-white/40'}
            `} />
          </div>
          <div>
            <p className={`text-sm font-medium ${isCompleted ? 'text-white/50' : 'text-white'}`}>
              {checkpoint.name}
            </p>
            <span className={`text-xs ${isCompleted ? 'text-white/30' : 'text-white/50'}`}>
              {formatTime(checkpoint.time)}
            </span>
          </div>
        </div>

        {/* Play button */}
        {isAvailable && !isCompleted && script && (
          <button
            onClick={onPlay}
            disabled={isLoading}
            className={`
              p-3 rounded-xl transition-all
              bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Play className="w-5 h-5 text-white fill-current" />
            )}
          </button>
        )}

        {/* Not available indicator */}
        {!isAvailable && !isCompleted && (
          <div className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/50">
            {formatTime(checkpoint.time)}
          </div>
        )}
      </div>
    </div>
  )
}

// Compact list of checkpoints
interface CheckpointListProps {
  checkpoints: CheckpointConfig[]
  scripts: Record<string, string | null>
  completedCheckpoints: string[]
  currentTime: Date
  loadingCheckpoint: string | null
  onPlayCheckpoint: (checkpointId: string) => void
}

export function CheckpointList({
  checkpoints,
  scripts,
  completedCheckpoints,
  currentTime,
  loadingCheckpoint,
  onPlayCheckpoint,
}: CheckpointListProps) {
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
      <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider px-1">
        Checkpoints
      </h2>
      <div className="space-y-3">
        {checkpoints.map((checkpoint, index) => (
          <div key={checkpoint.id} className={`animate-fade-in opacity-0 stagger-${Math.min(index + 1, 10)}`}>
            <CheckpointCard
              checkpoint={checkpoint}
              script={scripts[checkpoint.id] || null}
              isAvailable={isCheckpointAvailable(checkpoint)}
              isCompleted={completedCheckpoints.includes(checkpoint.id)}
              isLoading={loadingCheckpoint === checkpoint.id}
              onPlay={() => onPlayCheckpoint(checkpoint.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
