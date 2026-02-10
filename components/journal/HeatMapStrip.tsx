'use client'

import { useMemo } from 'react'

interface HeatMapEntry {
  date: string
  journal_win?: string | null
  journal_gratitude?: string | null
  journal_learned?: string | null
  journal_intention?: string | null
  journal_freetext?: string | null
}

interface HeatMapStripProps {
  entries: HeatMapEntry[]
}

function getWordCount(entry: HeatMapEntry): number {
  const count = (s: string | null | undefined) =>
    s ? s.trim().split(/\s+/).filter(Boolean).length : 0
  return count(entry.journal_win) + count(entry.journal_gratitude) +
    count(entry.journal_learned) + count(entry.journal_intention) +
    count(entry.journal_freetext)
}

function getIntensityClass(words: number): string {
  if (words === 0) return 'bg-white/5'
  if (words <= 50) return 'bg-amber-500/20'
  if (words <= 150) return 'bg-amber-500/40'
  if (words <= 300) return 'bg-amber-500/60'
  return 'bg-amber-500/80'
}

export function HeatMapStrip({ entries }: HeatMapStripProps) {
  const days = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const entryMap = new Map<string, HeatMapEntry>()
    for (const e of entries) {
      const d = new Date(e.date)
      d.setHours(0, 0, 0, 0)
      entryMap.set(d.toISOString().split('T')[0], e)
    }

    const result: { date: Date; words: number; dateStr: string }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const entry = entryMap.get(key)
      result.push({
        date: d,
        words: entry ? getWordCount(entry) : 0,
        dateStr: key,
      })
    }
    return result
  }, [entries])

  const startLabel = days[0]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel = days[days.length - 1]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="p-4 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
      <p className="text-xs text-white uppercase tracking-wider mb-3 font-medium">30-Day Activity</p>
      <div className="flex gap-[3px]">
        {days.map((day) => (
          <div
            key={day.dateStr}
            className={`flex-1 aspect-square rounded-[3px] ${getIntensityClass(day.words)} transition-colors`}
            title={`${day.date.toLocaleDateString()}: ${day.words} words`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-white/60">{startLabel}</span>
        <span className="text-[9px] text-white/60">{endLabel}</span>
      </div>
    </div>
  )
}
