'use client'

import { Focus, Sparkles, Moon, Zap } from 'lucide-react'

type ModeId = 'focus' | 'relax' | 'sleep' | 'energy'

const MODES = [
  { id: 'focus' as ModeId, label: 'Focus', icon: Focus },
  { id: 'relax' as ModeId, label: 'Relax', icon: Sparkles },
  { id: 'sleep' as ModeId, label: 'Sleep', icon: Moon },
  { id: 'energy' as ModeId, label: 'Energy', icon: Zap },
]

interface ModeSelectorProps {
  activeMode: ModeId
  onSelectMode: (mode: ModeId) => void
}

export function ModeSelector({ activeMode, onSelectMode }: ModeSelectorProps) {
  return (
    <div className="flex justify-evenly pb-2">
      {MODES.map((mode) => {
        const Icon = mode.icon
        const isActive = activeMode === mode.id

        return (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            aria-pressed={isActive}
            aria-label={`${mode.label} mode`}
            className="flex flex-col items-center gap-2 press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none rounded-full"
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 card-gradient-border-round ${
                isActive
                  ? 'bg-white/8'
                  : 'bg-transparent'
              }`}
            >
              <Icon
                className={`w-6 h-6 transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-white/95'
                }`}
                strokeWidth={1.5}
              />
            </div>
            <span
              className={`text-xs transition-colors duration-200 ${
                isActive ? 'text-white font-medium' : 'text-white/95'
              }`}
            >
              {mode.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
