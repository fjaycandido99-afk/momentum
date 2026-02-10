'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, SkipForward, CheckCircle, Wind, Music, Mic, Timer, CloudRain } from 'lucide-react'
import { logXPEventServer } from '@/lib/gamification'

const STEP_ICONS: Record<string, typeof Wind> = {
  soundscape: CloudRain,
  breathing: Wind,
  motivation: Mic,
  music: Music,
  focus: Timer,
}

interface RoutineStepData {
  id: string
  activity_type: string
  activity_id: string
  title: string
  subtitle?: string | null
  duration_minutes?: number | null
}

interface RoutinePlayerProps {
  routineId: string
  routineName: string
  steps: RoutineStepData[]
  onClose: () => void
}

export function RoutinePlayer({ routineId, routineName, steps, onClose }: RoutinePlayerProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const step = steps[currentStep]
  const duration = (step?.duration_minutes || 2) * 60
  const progress = Math.min(elapsed / duration, 1)

  useEffect(() => {
    setElapsed(0)
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [currentStep])

  // Auto-advance when timer completes
  useEffect(() => {
    if (elapsed >= duration) {
      handleNext()
    }
  }, [elapsed, duration]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Complete
      if (intervalRef.current) clearInterval(intervalRef.current)
      setCompleted(true)
      logXPEventServer('moduleComplete')
      fetch(`/api/routines/${routineId}/complete`, { method: 'POST' }).catch(() => {})
    }
  }, [currentStep, steps.length, routineId])

  if (completed) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center overlay-enter">
        <CheckCircle className="w-16 h-16 text-emerald-400 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-white mb-2">Routine Complete!</h2>
        <p className="text-white/60 mb-6">{routineName} - {steps.length} steps</p>
        <p className="text-emerald-400 text-sm mb-8">+30 XP earned</p>
        <button
          onClick={onClose}
          className="px-8 py-3 rounded-xl bg-white/15 hover:bg-white/20 text-white font-medium transition-colors press-scale"
        >
          Done
        </button>
      </div>
    )
  }

  const StepIcon = step ? (STEP_ICONS[step.activity_type] || Music) : Music
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col overlay-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <div>
          <p className="text-xs text-white/50">{routineName}</p>
          <p className="text-sm text-white/70">Step {currentStep + 1} of {steps.length}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors press-scale">
          <X className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-6 mb-2">
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white/60 transition-all duration-300"
                style={{ width: i < currentStep ? '100%' : i === currentStep ? `${progress * 100}%` : '0%' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="p-6 rounded-full glass-refined glass-elevated mb-6">
          <StepIcon className="w-12 h-12 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">{step?.title}</h3>
        {step?.subtitle && <p className="text-white/50 text-sm mb-4">{step.subtitle}</p>}
        <p className="text-3xl font-mono text-white/80">{formatTime(Math.max(0, duration - elapsed))}</p>
      </div>

      {/* Controls */}
      <div className="px-6 pb-12 flex justify-center">
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/15 hover:bg-white/20 transition-colors press-scale"
        >
          <span className="text-sm text-white font-medium">
            {currentStep < steps.length - 1 ? 'Next Step' : 'Complete'}
          </span>
          <SkipForward className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  )
}
