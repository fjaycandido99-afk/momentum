'use client'

import { BREATHING_TECHNIQUES, type BreathingTechnique } from '@/lib/breathing-exercises'

interface BreathingSectionProps {
  onSelect: (technique: BreathingTechnique) => void
}

export function BreathingSection({ onSelect }: BreathingSectionProps) {
  return (
    <div className="mb-8 liquid-reveal section-fade-bg">
      <h2 className="text-lg font-semibold text-white px-6 mb-4 parallax-header">Breathwork</h2>
      <div className="flex justify-evenly px-2 pb-2">
        {BREATHING_TECHNIQUES.map((technique) => (
          <button
            key={technique.id}
            aria-label={`${technique.name} breathing exercise`}
            onClick={() => onSelect(technique)}
            className="flex flex-col items-center gap-2 press-scale"
          >
            <div className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 card-gradient-border-round">
              <span className="text-lg font-bold text-white">{technique.icon}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[11px] text-white">{technique.name}</span>
              <span className="text-[9px] text-white/60">{technique.tagline}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
