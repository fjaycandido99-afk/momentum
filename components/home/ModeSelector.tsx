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
            className="flex flex-col items-center gap-2 press-scale"
          >
            <div
              className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'border-white/60 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                  : 'border-white/15 bg-white/[0.03]'
              }`}
            >
              <Icon
                className={`w-6 h-6 transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-white/40'
                }`}
                strokeWidth={1.5}
              />
            </div>
            <span
              className={`text-xs transition-colors duration-200 ${
                isActive ? 'text-white font-medium' : 'text-white/40'
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
