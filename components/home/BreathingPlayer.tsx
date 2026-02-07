'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { getBreathingPhase, getTotalDuration, type BreathingTechnique } from '@/lib/breathing-exercises'
import { logXPEvent } from '@/lib/gamification'

interface BreathingPlayerProps {
  technique: BreathingTechnique
  onClose: () => void
}

export function BreathingPlayer({ technique, onClose }: BreathingPlayerProps) {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const startTimeRef = useRef(Date.now())
  const rafRef = useRef<number | null>(null)
  const totalDuration = getTotalDuration(technique)
  const hasLoggedXPRef = useRef(false)

  const tick = useCallback(() => {
    if (!isRunning) return
    const now = Date.now()
    setElapsedMs(now - startTimeRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [isRunning])

  useEffect(() => {
    if (isRunning) {
      rafRef.current = requestAnimationFrame(tick)
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isRunning, tick])

  const phase = getBreathingPhase(technique, elapsedMs)

  // Log XP on completion
  useEffect(() => {
    if (phase.isComplete && !hasLoggedXPRef.current) {
      hasLoggedXPRef.current = true
      logXPEvent('breathingSession')
    }
  }, [phase.isComplete])

  // Compute circle scale: inhale=expand, exhale=contract, hold=stay
  let circleScale = 1
  if (!phase.isComplete) {
    if (phase.phase === 'inhale') {
      circleScale = 1 + 0.6 * phase.progress
    } else if (phase.phase === 'hold1') {
      circleScale = 1.6
    } else if (phase.phase === 'exhale') {
      circleScale = 1.6 - 0.6 * phase.progress
    } else if (phase.phase === 'hold2') {
      circleScale = 1
    }
  }

  // Get current phase duration for smooth CSS transition
  const getPhaseSeconds = () => {
    if (phase.isComplete) return 0.3
    const p = technique.pattern
    switch (phase.phase) {
      case 'inhale': return p.inhale
      case 'hold1': return p.hold1
      case 'exhale': return p.exhale
      case 'hold2': return p.hold2
      default: return 1
    }
  }

  const elapsed = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-fade-in-up">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-12 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        aria-label="Close breathing exercise"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Technique name */}
      <p className="text-sm text-white/60 mb-2">{technique.name}</p>

      {/* Animated breathing circle */}
      <div className="relative flex items-center justify-center w-64 h-64 mb-8">
        {/* Outer glow */}
        <div
          className="absolute w-40 h-40 rounded-full bg-white/5 transition-transform"
          style={{
            transform: `scale(${circleScale})`,
            transitionDuration: `${getPhaseSeconds()}s`,
            transitionTimingFunction: phase.phase === 'inhale' || phase.phase === 'exhale' ? 'ease-in-out' : 'linear',
          }}
        />
        {/* Inner circle */}
        <div
          className="absolute w-32 h-32 rounded-full border-2 border-white/30 bg-white/[0.08] flex items-center justify-center transition-transform"
          style={{
            transform: `scale(${circleScale})`,
            transitionDuration: `${getPhaseSeconds()}s`,
            transitionTimingFunction: phase.phase === 'inhale' || phase.phase === 'exhale' ? 'ease-in-out' : 'linear',
          }}
        >
          <span className="text-lg font-medium text-white">
            {phase.isComplete ? 'Done' : phase.label}
          </span>
        </div>
      </div>

      {/* Round counter */}
      {!phase.isComplete && (
        <p className="text-sm text-white/60 mb-2">
          Round {phase.round} of {phase.totalRounds}
        </p>
      )}

      {/* Timer */}
      <p className="text-2xl font-light text-white/80 tabular-nums">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </p>

      {/* Session complete */}
      {phase.isComplete && (
        <div className="mt-8 text-center animate-fade-in-up">
          <p className="text-lg text-white mb-2">Session Complete</p>
          <p className="text-sm text-white/60 mb-6">{technique.description}</p>
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-full bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-colors press-scale"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
