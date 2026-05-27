'use client'

import { useMemo } from 'react'

const MOODS = [
  { value: 'awful', emoji: '😞', label: 'Awful' },
  { value: 'low', emoji: '😔', label: 'Low' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'good', emoji: '😊', label: 'Good' },
  { value: 'great', emoji: '😄', label: 'Great' },
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
      <div className="flex items-center gap-1.5">
        {MOODS.map((m) => {
          const isSelected = mood === m.value
          return (
            <button
              key={m.value}
              onClick={() => onSelect(m.value)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
                isSelected
                  ? 'bg-white/15 scale-105'
                  : 'hover:bg-white/5'
              }`}
            >
              <span
                className={`text-xl transition-opacity ${isSelected ? '' : 'opacity-40'}`}
              >
                {m.emoji}
              </span>
              <span className={`text-[9px] font-medium transition-colors ${
                isSelected ? 'text-white' : 'text-white/40'
              }`}>
                {m.label}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  // Prominent, full-width, monochrome mood check-in. Unselected faces
  // desaturate to grayscale + fade so only the chosen mood reads in color —
  // a calm, on-brand way to make the daily ritual feel deliberate.
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] text-white/50 uppercase tracking-wider font-medium">How are you feeling?</p>
      <div className="flex items-stretch gap-1.5">
        {MOODS.map((m) => {
          const isSelected = mood === m.value
          return (
            <button
              key={m.value}
              onClick={() => onSelect(m.value)}
              aria-pressed={isSelected}
              aria-label={m.label}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-2xl border transition-all press-scale ${
                isSelected
                  ? 'bg-white/[0.12] border-white/30 scale-[1.03]'
                  : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'
              }`}
            >
              <span
                className={`text-2xl leading-none transition-all ${isSelected ? 'opacity-100' : 'opacity-40 grayscale'}`}
              >
                {m.emoji}
              </span>
              <span className={`text-[10px] font-medium transition-colors ${isSelected ? 'text-white' : 'text-white/45'}`}>
                {m.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* 14-day trend — monochrome sparkline */}
      {sparklinePoints && (
        <div className="flex items-center gap-2 px-0.5 pt-0.5">
          <span className="text-[10px] text-white/40 shrink-0">14-day trend</span>
          <svg width={120} height={28} viewBox="0 0 120 28" className="text-white/60">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={sparklinePoints.map(p => `${p.x},${p.y + 2}`).join(' ')}
            />
            {sparklinePoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y + 2}
                r={1.5}
                className="fill-white/70"
              />
            ))}
          </svg>
        </div>
      )}
    </div>
  )
}
