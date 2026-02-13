'use client'

import { useState } from 'react'
import { Eye, ChevronRight, RotateCcw } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_VISUALIZATIONS } from '@/lib/mindset/visualizations'

interface GuidedVisualizationCardProps {
  mindsetId: Exclude<MindsetId, 'scholar'>
}

function getDailyIndex(total: number): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return dayOfYear % total
}

const ACCENT_BG: Record<Exclude<MindsetId, 'scholar'>, string> = {
  stoic: 'bg-slate-500/15',
  existentialist: 'bg-violet-500/15',
  cynic: 'bg-orange-500/15',
  hedonist: 'bg-emerald-500/15',
  samurai: 'bg-red-500/15',
}

export function GuidedVisualizationCard({ mindsetId }: GuidedVisualizationCardProps) {
  const visualizations = MINDSET_VISUALIZATIONS[mindsetId]
  const index = getDailyIndex(visualizations.length)
  const viz = visualizations[index]
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const accentBg = ACCENT_BG[mindsetId]

  const isComplete = currentStep !== null && currentStep >= viz.steps.length
  const isStarted = currentStep !== null

  const handleBegin = () => setCurrentStep(0)
  const handleNext = () => {
    if (currentStep !== null) {
      setCurrentStep(currentStep + 1)
    }
  }
  const handleReset = () => setCurrentStep(null)

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <Eye className="w-4 h-4 text-white/70" />
        <h3 className="text-sm font-medium text-white">Guided Visualization</h3>
        <span className="ml-auto text-[10px] text-white/50">{viz.duration}</span>
      </div>

      <h4 className="text-[14px] font-medium text-white mb-2">{viz.title}</h4>

      {!isStarted && (
        <div>
          <p className="text-[12px] text-white/70 mb-4 leading-relaxed">
            A guided mental exercise with {viz.steps.length} steps. Find a quiet moment and tap begin.
          </p>
          <button
            onClick={handleBegin}
            className={`w-full py-2.5 rounded-lg text-sm font-medium text-white ${accentBg} press-scale transition-all`}
          >
            Begin Visualization
          </button>
        </div>
      )}

      {isStarted && !isComplete && currentStep !== null && (
        <div>
          {/* Step indicator */}
          <div className="flex gap-1 mb-3">
            {viz.steps.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-all ${
                  i <= currentStep ? 'bg-white/25' : 'bg-white/[0.06]'
                }`}
              />
            ))}
          </div>

          {/* Current step */}
          <div className="animate-fade-in">
            <span className="text-[10px] text-white/50 uppercase tracking-wider">
              Step {currentStep + 1} of {viz.steps.length}
            </span>
            <p className="text-[13px] text-white leading-relaxed mt-2 mb-4">
              {viz.steps[currentStep]}
            </p>
          </div>

          <button
            onClick={handleNext}
            className={`w-full py-2.5 rounded-lg text-sm font-medium text-white ${accentBg} press-scale transition-all flex items-center justify-center gap-1.5`}
          >
            {currentStep < viz.steps.length - 1 ? (
              <>Next Step <ChevronRight className="w-4 h-4" /></>
            ) : (
              'Complete'
            )}
          </button>
        </div>
      )}

      {isComplete && (
        <div className="text-center animate-fade-in py-2">
          <div className="text-xl mb-2 opacity-60">✨</div>
          <p className="text-[13px] text-white mb-1">Visualization Complete</p>
          <p className="text-[11px] text-white/70 mb-4">Carry this clarity with you today.</p>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 mx-auto text-[11px] text-white/60 press-scale"
          >
            <RotateCcw className="w-3 h-3" />
            Start Over
          </button>
        </div>
      )}
    </div>
  )
}
