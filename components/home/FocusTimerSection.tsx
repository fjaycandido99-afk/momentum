'use client'

import { POMODORO_PRESETS, type PomodoroConfig } from '@/lib/pomodoro'
import { Timer } from 'lucide-react'

interface FocusTimerSectionProps {
  onSelect: (preset: PomodoroConfig) => void
}

export function FocusTimerSection({ onSelect }: FocusTimerSectionProps) {
  return (
    <div className="mb-8 scroll-reveal section-fade-bg">
      <h2 className="text-lg font-semibold text-white px-6 mb-4 parallax-header">Focus Timer</h2>
      <div className="grid grid-cols-3 gap-2 px-6 pb-2">
        {POMODORO_PRESETS.map((preset) => (
          <button
            key={preset.id}
            aria-label={`${preset.name} — ${preset.tagline}`}
            onClick={() => onSelect(preset)}
            className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl card-gradient-border press-scale transition-all"
          >
            <div className="p-1.5 rounded-lg bg-white/10">
              <Timer className="w-3 h-3 text-white" />
            </div>
            <p className="text-xs font-medium text-white">{preset.name}</p>
            <p className="text-[9px] text-white/60">{preset.tagline}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
