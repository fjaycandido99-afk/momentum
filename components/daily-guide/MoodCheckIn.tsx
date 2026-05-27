'use client'

import { useState } from 'react'
import { Frown, Meh, Smile } from 'lucide-react'

type MoodLevel = 'low' | 'medium' | 'high'

interface MoodCheckInProps {
  type: 'before' | 'after'
  onSelect: (mood: MoodLevel) => void
  selected?: MoodLevel | null
}

// Monochrome, graded by intensity (dim → bright) so the row reads as
// "mood rising" without color — matching the journal mood selector.
const MOOD_OPTIONS: { value: MoodLevel; label: string; icon: typeof Frown; color: string; bgColor: string }[] = [
  { value: 'low', label: 'Low', icon: Frown, color: 'text-white/55', bgColor: 'bg-white/[0.04] border-white/10' },
  { value: 'medium', label: 'Okay', icon: Meh, color: 'text-white/80', bgColor: 'bg-white/[0.07] border-white/15' },
  { value: 'high', label: 'Great', icon: Smile, color: 'text-white', bgColor: 'bg-white/[0.12] border-white/20' },
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
      <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/15">
        <Icon className={`w-4 h-4 ${option.color}`} />
        <span className="text-sm text-white/70">
          {type === 'before' ? 'Morning mood' : 'Evening mood'}: <span className="text-white">{option.label}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/15 p-4">
      <p className="text-sm text-white/70 mb-3">
        {type === 'before' ? 'How are you feeling this morning?' : 'How are you feeling now?'}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {MOOD_OPTIONS.map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.value}
              aria-label={`Rate mood as ${option.label}`}
              onClick={() => handleSelect(option.value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${option.bgColor}`}
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
