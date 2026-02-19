'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Pause, Play, Square } from 'lucide-react'

interface FocusTimerProps {
  /** Total seconds for this interval */
  totalSeconds: number
  /** Seconds remaining */
  remaining: number
  /** Whether currently counting down */
  isRunning: boolean
  /** Whether this is a break interval */
  isBreak: boolean
  onPauseResume: () => void
  onEnd: () => void
}

export function FocusTimer({ totalSeconds, remaining, isRunning, isBreak, onPauseResume, onEnd }: FocusTimerProps) {
  const progress = totalSeconds > 0 ? 1 - remaining / totalSeconds : 0
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  // SVG ring params
  const size = 260
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  // Ring color
  const ringColor = isBreak ? '#34d399' : '#60a5fa'
  const ringGlow = isBreak ? 'drop-shadow(0 0 12px rgba(52,211,153,0.4))' : 'drop-shadow(0 0 12px rgba(96,165,250,0.4))'

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Break label */}
      {isBreak && (
        <div className="px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
          <span className="text-xs font-medium text-emerald-400 tracking-wide">Take a break</span>
        </div>
      )}

      {/* Timer ring */}
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90" style={{ filter: ringGlow }}>
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
            fill="none"
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-1000 linear"
          />
        </svg>

        {/* Center time */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-light text-white tracking-tight tabular-nums">{timeStr}</span>
          {!isBreak && (
            <span className="text-xs text-white/40 mt-1">remaining</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button
          onClick={onEnd}
          aria-label="End session"
          className="w-12 h-12 rounded-full bg-white/8 border border-white/15 flex items-center justify-center hover:bg-white/15 transition-colors press-scale"
        >
          <Square className="w-5 h-5 text-white/70" />
        </button>

        <button
          onClick={onPauseResume}
          aria-label={isRunning ? 'Pause' : 'Resume'}
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center transition-transform active:scale-95"
        >
          {isRunning ? (
            <Pause className="w-7 h-7 text-black" fill="black" />
          ) : (
            <Play className="w-7 h-7 text-black ml-0.5" fill="black" />
          )}
        </button>

        {/* Spacer for symmetry */}
        <div className="w-12 h-12" />
      </div>
    </div>
  )
}
