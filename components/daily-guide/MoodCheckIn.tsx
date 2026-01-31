'use client'

import { useState } from 'react'
import { Frown, Meh, Smile } from 'lucide-react'

type MoodLevel = 'low' | 'medium' | 'high'

interface MoodCheckInProps {
  type: 'before' | 'after'
  onSelect: (mood: MoodLevel) => void
  selected?: MoodLevel | null
}

const MOOD_OPTIONS: { value: MoodLevel; label: string; icon: typeof Frown; color: string; bgColor: string }[] = [
  { value: 'low', label: 'Low', icon: Frown, color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30' },
  { value: 'medium', label: 'Okay', icon: Meh, color: 'text-amber-400', bgColor: 'bg-amber-500/20 border-amber-500/30' },
  { value: 'high', label: 'Great', icon: Smile, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 border-emerald-500/30' },
]

export function MoodCheckIn({ type, onSelect, selected }: MoodCheckInProps) {
  const [localSelected, setLocalSelected] = useState<MoodLevel | null>(selected || null)

  const handleSelect = (mood: MoodLevel) => {
    setLocalSelected(mood)
    onSelect(mood)
  }

  if (localSelected) {
    const option = MOOD_OPTIONS.find(o => o.value === localSelected)
    if (!option) return null
    const Icon = option.icon
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
        <Icon className={`w-4 h-4 ${option.color}`} />
        <span className="text-sm text-white/95">
          {type === 'before' ? 'Morning mood' : 'Evening mood'}: <span className="text-white">{option.label}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
      <p className="text-sm text-white/95 mb-3">
        {type === 'before' ? 'How are you feeling this morning?' : 'How are you feeling now?'}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {MOOD_OPTIONS.map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105 ${option.bgColor}`}
            >
              <Icon className={`w-6 h-6 ${option.color}`} />
              <span className={`text-xs font-medium ${option.color}`}>{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
