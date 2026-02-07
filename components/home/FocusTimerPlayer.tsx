'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Play, Pause, SkipForward } from 'lucide-react'
import { formatTimerDisplay, type PomodoroConfig } from '@/lib/pomodoro'
import { logXPEvent } from '@/lib/gamification'

type TimerPhase = 'focus' | 'break' | 'longBreak'

interface FocusTimerPlayerProps {
  preset: PomodoroConfig
  onClose: () => void
  onFocusStart?: () => void
  onBreakStart?: () => void
}

export function FocusTimerPlayer({ preset, onClose, onFocusStart, onBreakStart }: FocusTimerPlayerProps) {
  const [phase, setPhase] = useState<TimerPhase>('focus')
  const [session, setSession] = useState(1)
  const [secondsLeft, setSecondsLeft] = useState(preset.focusMinutes * 60)
  const [isPaused, setIsPaused] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasLoggedXPRef = useRef(false)

  const totalSessions = preset.sessionsBeforeLongBreak

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Start focus music on mount
  useEffect(() => {
    onFocusStart?.()
    return () => clearTimer()
  }, [clearTimer, onFocusStart])

  // Timer countdown
  useEffect(() => {
    if (isPaused || isComplete) {
      clearTimer()
      return
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          // Phase complete
          if (phase === 'focus') {
            // Log XP on focus complete
            if (!hasLoggedXPRef.current) {
              logXPEvent('focusSession')
              hasLoggedXPRef.current = true
            }

            if (session >= totalSessions) {
              // All sessions done
              setIsComplete(true)
              return 0
            }

            // Switch to break
            const isLongBreak = session % totalSessions === 0
            const nextPhase = isLongBreak ? 'longBreak' : 'break'
            setPhase(nextPhase)
            onBreakStart?.()
            return nextPhase === 'longBreak'
              ? preset.longBreakMinutes * 60
              : preset.breakMinutes * 60
          } else {
            // Break complete, start next focus
            setPhase('focus')
            setSession(s => s + 1)
            hasLoggedXPRef.current = false
            onFocusStart?.()
            return preset.focusMinutes * 60
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => clearTimer()
  }, [isPaused, isComplete, phase, session, totalSessions, preset, clearTimer, onFocusStart, onBreakStart])

  const handleSkip = () => {
    if (phase === 'focus') return // Can't skip focus
    // Skip break, go to next focus
    setPhase('focus')
    setSession(s => s + 1)
    hasLoggedXPRef.current = false
    setSecondsLeft(preset.focusMinutes * 60)
    onFocusStart?.()
  }

  const handleClose = () => {
    clearTimer()
    onClose()
  }

  // Phase total seconds for progress ring
  const phaseTotalSeconds =
    phase === 'focus' ? preset.focusMinutes * 60
    : phase === 'longBreak' ? preset.longBreakMinutes * 60
    : preset.breakMinutes * 60

  const progress = 1 - secondsLeft / phaseTotalSeconds
  const circumference = 2 * Math.PI * 110
  const strokeOffset = circumference * (1 - progress)

  return (
    <div className="fixed inset-0 z-[55] bg-black flex flex-col items-center justify-center animate-fade-in-up">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-12 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        aria-label="Close focus timer"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Phase label */}
      <div className={`px-4 py-1.5 rounded-full text-sm font-medium mb-6 ${
        phase === 'focus'
          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      }`}>
        {phase === 'focus' ? 'Focus' : phase === 'longBreak' ? 'Long Break' : 'Break'}
      </div>

      {/* Timer ring */}
      <div className="relative w-60 h-60 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
          <circle
            cx="120" cy="120" r="110"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="4"
          />
          <circle
            cx="120" cy="120" r="110"
            fill="none"
            stroke={phase === 'focus' ? 'rgba(168,85,247,0.6)' : 'rgba(52,211,153,0.6)'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-light text-white tabular-nums">
            {isComplete ? 'Done!' : formatTimerDisplay(secondsLeft)}
          </span>
        </div>
      </div>

      {/* Session counter */}
      <p className="text-sm text-white/60 mb-8">
        Session {session} of {totalSessions}
      </p>

      {/* Controls */}
      {!isComplete ? (
        <div className="flex items-center gap-6">
          {/* Skip break button */}
          {phase !== 'focus' && (
            <button
              onClick={handleSkip}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors press-scale"
              aria-label="Skip break"
            >
              <SkipForward className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Play/pause */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-5 rounded-full bg-white/15 border border-white/20 hover:bg-white/25 transition-colors press-scale"
            aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
          >
            {isPaused ? (
              <Play className="w-7 h-7 text-white ml-0.5" />
            ) : (
              <Pause className="w-7 h-7 text-white" />
            )}
          </button>
        </div>
      ) : (
        <div className="text-center animate-fade-in-up">
          <p className="text-lg text-white mb-2">Great work!</p>
          <p className="text-sm text-white/60 mb-6">
            {totalSessions} focus sessions completed
          </p>
          <button
            onClick={handleClose}
            className="px-8 py-3 rounded-full bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-colors press-scale"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
