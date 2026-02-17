'use client'

import { useMemo } from 'react'

const MOODS = [
  { value: 'awful', emoji: '😞', label: 'Awful', color: 'ring-red-400' },
  { value: 'low', emoji: '😔', label: 'Low', color: 'ring-orange-400' },
  { value: 'okay', emoji: '😐', label: 'Okay', color: 'ring-yellow-400' },
  { value: 'good', emoji: '😊', label: 'Good', color: 'ring-emerald-400' },
  { value: 'great', emoji: '😄', label: 'Great', color: 'ring-green-400' },
] as const

export type MoodValue = typeof MOODS[number]['value']

interface MoodEntry {
  date: string
  journal_mood?: string | null
}

interface MoodSelectorProps {
  mood: string | null
  onSelect: (mood: MoodValue) => void
  moodHistory: MoodEntry[]
  compact?: boolean
}

const MOOD_TO_Y: Record<string, number> = {
  awful: 4,
  low: 3,
  okay: 2,
  good: 1,
  great: 0,
}

export function MoodSelector({ mood, onSelect, moodHistory, compact = false }: MoodSelectorProps) {
  const sparklinePoints = useMemo(() => {
    const withMood = moodHistory
      .filter(e => e.journal_mood)
      .slice(-14)
    if (withMood.length < 3) return null

    const height = 24
    const width = 120
    const stepX = width / (withMood.length - 1)
    const stepY = height / 4

    return withMood.map((e, i) => ({
      x: i * stepX,
      y: (MOOD_TO_Y[e.journal_mood!] ?? 2) * stepY,
    }))
  }, [moodHistory])

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {MOODS.map((m) => (
          <button
            key={m.value}
            onClick={() => onSelect(m.value)}
            className={`p-1.5 rounded-lg transition-all ${
              mood === m.value
                ? `ring-1.5 ${m.color} bg-white/15 scale-110`
                : 'hover:bg-white/5 opacity-90'
            }`}
          >
            <span className="text-lg">{m.emoji}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 rounded-2xl bg-black border border-white/25 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
      <p className="text-xs text-white uppercase tracking-wider mb-3 font-medium">How are you feeling?</p>
      <div className="flex items-center justify-between gap-1">
        {MOODS.map((m) => (
          <button
            key={m.value}
            onClick={() => onSelect(m.value)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 ${
              mood === m.value
                ? `ring-2 ${m.color} bg-white/10 scale-105`
                : 'hover:bg-white/5'
            }`}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className={`text-[10px] ${mood === m.value ? 'text-white' : 'text-white/85'}`}>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Mini sparkline */}
      {sparklinePoints && (
        <div className="mt-3 flex justify-center">
          <svg width={120} height={28} viewBox="0 0 120 28" className="opacity-80">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-400"
              points={sparklinePoints.map(p => `${p.x},${p.y + 2}`).join(' ')}
            />
            {sparklinePoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y + 2}
                r={1.5}
                className="fill-amber-400"
              />
            ))}
          </svg>
        </div>
      )}
    </div>
  )
}
