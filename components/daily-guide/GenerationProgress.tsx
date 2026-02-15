'use client'

import { useState, useEffect } from 'react'

const STEPS = [
  'Analyzing your energy...',
  'Personalizing your day...',
  'Preparing modules...',
  'Almost ready...',
]

const STEP_DELAY = 600

export function GenerationProgress() {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex(prev => (prev < STEPS.length - 1 ? prev + 1 : prev))
    }, STEP_DELAY)
    return () => clearInterval(timer)
  }, [])

  const progress = Math.min(((stepIndex + 1) / STEPS.length) * 100, 100)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-xs space-y-6">
        {/* Progress bar */}
        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/40 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step text */}
        <div className="text-center min-h-[2rem]">
          <p key={stepIndex} className="text-sm text-white/70 animate-fade-in-up">
            {STEPS[stepIndex]}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i <= stepIndex ? 'bg-white/60 scale-100' : 'bg-white/15 scale-75'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
