'use client'

import { useState } from 'react'
import {
  Battery,
  BatteryLow,
  BatteryFull,
  Loader2,
  Sparkles,
  Zap,
  Leaf,
  Heart,
} from 'lucide-react'
import type { EnergyLevel } from '@/lib/daily-guide/decision-tree'

interface EnergyPromptProps {
  onSelect: (energy: EnergyLevel) => void
  isLoading?: boolean
}

// Get day name for dynamic messaging
function getDayName(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date().getDay()]
}

// Get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Benefit type
type BenefitType = 'gentle' | 'balanced' | 'energizing'

const BENEFIT_CONFIG: Record<BenefitType, { icon: typeof Heart; label: string; color: string }> = {
  gentle: { icon: Leaf, label: 'Gentle', color: 'text-teal-400' },
  balanced: { icon: Heart, label: 'Balanced', color: 'text-blue-400' },
  energizing: { icon: Zap, label: 'Energizing', color: 'text-amber-400' },
}

const ENERGY_OPTIONS: {
  value: EnergyLevel
  label: string
  description: string
  tagline: string
  icon: typeof Battery
  benefit: BenefitType
}[] = [
  {
    value: 'low',
    label: 'Low Energy',
    description: 'Need a gentle start',
    tagline: 'Ease into the day',
    icon: BatteryLow,
    benefit: 'gentle',
  },
  {
    value: 'normal',
    label: 'Moderate',
    description: 'Ready for my usual',
    tagline: 'Steady and focused',
    icon: Battery,
    benefit: 'balanced',
  },
  {
    value: 'high',
    label: 'High Energy',
    description: 'Feeling energized',
    tagline: 'Ready to conquer',
    icon: BatteryFull,
    benefit: 'energizing',
  },
]

export function EnergyPrompt({ onSelect, isLoading }: EnergyPromptProps) {
  const [selected, setSelected] = useState<EnergyLevel | null>(null)
  const dayName = getDayName()
  const greeting = getGreeting()

  const handleSelect = (energy: EnergyLevel) => {
    if (isLoading) return
    setSelected(energy)
    onSelect(energy)
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 overflow-hidden animate-scale-in">
      {/* Theme Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-white/95">
              CHECK-IN
            </h2>
            <p className="text-xs text-white/95">
              {greeting}, happy {dayName}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-white/10 animate-pulse-glow">
            <Sparkles className="w-4 h-4 text-white animate-icon-bounce" />
          </div>
        </div>
      </div>

      {/* Main Question */}
      <div className="px-6 pb-4">
        <p className="text-lg text-white/95 leading-relaxed">
          "How are you feeling this {dayName.toLowerCase()}?"
        </p>
        <p className="text-sm text-white/95 mt-1">
          This personalizes your experience
        </p>
      </div>

      {/* Energy Options */}
      <div className="px-6 pb-6 space-y-3">
        {ENERGY_OPTIONS.map(option => {
          const Icon = option.icon
          const isSelected = selected === option.value
          const isLoadingThis = isLoading && isSelected
          const benefit = BENEFIT_CONFIG[option.benefit]
          const BenefitIcon = benefit.icon

          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              disabled={isLoading}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl transition-all
                ${isSelected
                  ? 'bg-white/20 border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                  : 'bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/10'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-[0.98]
              `}
            >
              {/* Icon */}
              <div className={`
                p-2.5 rounded-xl transition-all
                ${isSelected ? 'bg-white/15 animate-pulse-glow' : 'bg-white/10'}
              `}>
                {isLoadingThis ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-white animate-icon-bounce' : 'text-white/95'}`} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${isSelected ? 'text-white' : 'text-white/95'}`}>
                    {option.label}
                  </span>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 ${benefit.color}`}>
                    <BenefitIcon className="w-3 h-3" />
                    <span className="text-xs">{benefit.label}</span>
                  </div>
                </div>
                <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/95' : 'text-white/95'}`}>
                  {option.tagline}
                </p>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Compact inline version
export function EnergySelector({
  value,
  onChange,
  disabled,
}: {
  value: EnergyLevel | null
  onChange: (energy: EnergyLevel) => void
  disabled?: boolean
}) {
  const selectedClass = 'bg-white/20 text-white border-white/30'

  return (
    <div className="flex items-center gap-2">
      {ENERGY_OPTIONS.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-all
            ${value === option.value
              ? `${selectedClass} border`
              : 'bg-white/5 text-white/95 border border-transparent hover:bg-white/10'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
