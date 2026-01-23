'use client'

import { useState } from 'react'
import { Play, Check, Clock, Loader2 } from 'lucide-react'
import type { GuideSegment } from '@/lib/daily-guide/day-type'

interface GuidanceCardProps {
  segment: GuideSegment
  script: string | null
  isAvailable: boolean
  availableTime: string
  isPlayed: boolean
  isLoading: boolean
  onPlay: () => void
}

const segmentConfig: Record<GuideSegment, {
  label: string
  gradient: string
  iconBg: string
}> = {
  morning: {
    label: 'MORNING',
    gradient: 'from-amber-500/20 to-orange-500/10',
    iconBg: 'bg-amber-500/20',
  },
  midday: {
    label: 'MIDDAY',
    gradient: 'from-cyan-500/20 to-blue-500/10',
    iconBg: 'bg-cyan-500/20',
  },
  afternoon: {
    label: 'AFTERNOON',
    gradient: 'from-purple-500/20 to-indigo-500/10',
    iconBg: 'bg-purple-500/20',
  },
  evening: {
    label: 'EVENING',
    gradient: 'from-slate-500/20 to-slate-600/10',
    iconBg: 'bg-slate-500/20',
  },
  morning_prime: {
    label: 'MORNING PRIME',
    gradient: 'from-amber-500/20 to-orange-500/10',
    iconBg: 'bg-amber-500/20',
  },
  workout: {
    label: 'WORKOUT',
    gradient: 'from-red-500/20 to-orange-500/10',
    iconBg: 'bg-red-500/20',
  },
  breath: {
    label: 'BREATHE',
    gradient: 'from-teal-500/20 to-cyan-500/10',
    iconBg: 'bg-teal-500/20',
  },
  micro_lesson: {
    label: 'MICRO LESSON',
    gradient: 'from-violet-500/20 to-purple-500/10',
    iconBg: 'bg-violet-500/20',
  },
  day_close: {
    label: 'DAY CLOSE',
    gradient: 'from-indigo-500/20 to-slate-500/10',
    iconBg: 'bg-indigo-500/20',
  },
  checkpoint_1: {
    label: 'CHECKPOINT 1',
    gradient: 'from-cyan-500/20 to-blue-500/10',
    iconBg: 'bg-cyan-500/20',
  },
  checkpoint_2: {
    label: 'CHECKPOINT 2',
    gradient: 'from-cyan-500/20 to-blue-500/10',
    iconBg: 'bg-cyan-500/20',
  },
  checkpoint_3: {
    label: 'CHECKPOINT 3',
    gradient: 'from-cyan-500/20 to-blue-500/10',
    iconBg: 'bg-cyan-500/20',
  },
  tomorrow_preview: {
    label: 'TOMORROW',
    gradient: 'from-purple-500/20 to-pink-500/10',
    iconBg: 'bg-purple-500/20',
  },
}

export function GuidanceCard({
  segment,
  script,
  isAvailable,
  availableTime,
  isPlayed,
  isLoading,
  onPlay,
}: GuidanceCardProps) {
  const config = segmentConfig[segment]

  // Preview of the script (first ~50 chars)
  const scriptPreview = script
    ? script.slice(0, 60) + (script.length > 60 ? '...' : '')
    : null

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border transition-all
        ${isAvailable ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-60'}
      `}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-50`} />

      <div className="relative p-4">
        <div className="flex items-center justify-between mb-3">
          {/* Segment label */}
          <span className="text-xs font-semibold tracking-wider text-white/60">
            {config.label}
          </span>

          {/* Status / Action */}
          {isPlayed ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              Done
            </span>
          ) : isAvailable ? (
            <button
              onClick={onPlay}
              disabled={isLoading || !script}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all
                ${isLoading
                  ? 'bg-white/10 text-white/40 cursor-wait'
                  : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'
                }
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Play
                </>
              )}
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <Clock className="w-3.5 h-3.5" />
              Available {availableTime}
            </span>
          )}
        </div>

        {/* Script preview */}
        {scriptPreview && isAvailable ? (
          <p className="text-sm text-white/60 leading-relaxed">
            &ldquo;{scriptPreview}&rdquo;
          </p>
        ) : !isAvailable ? (
          <p className="text-sm text-white/30 italic">
            Available at {availableTime}
          </p>
        ) : (
          <p className="text-sm text-white/30 italic">
            Generating...
          </p>
        )}
      </div>
    </div>
  )
}
