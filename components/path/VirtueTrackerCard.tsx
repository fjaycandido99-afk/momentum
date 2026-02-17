'use client'

import { useState, useEffect, useCallback } from 'react'
import { Leaf, Star } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_VIRTUES } from '@/lib/mindset/virtues'

interface VirtueTrackerCardProps {
  mindsetId: MindsetId
}

interface VirtueDay {
  date: string
  virtue_focus: string | null
  virtue_rating: number | null
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function VirtueTrackerCard({ mindsetId }: VirtueTrackerCardProps) {
  const virtues = MINDSET_VIRTUES[mindsetId]
  const [selectedVirtue, setSelectedVirtue] = useState<string | null>(null)
  const [rating, setRating] = useState<number>(0)
  const [weekData, setWeekData] = useState<VirtueDay[]>([])
  const [saving, setSaving] = useState(false)

  // Fetch this week's virtue data
  useEffect(() => {
    fetch('/api/path/virtue')
      .then(r => r.ok ? r.json() : { weekData: [] })
      .then(d => {
        setWeekData(d.weekData || [])
        // Set today's virtue as selected if exists
        const today = d.weekData?.[d.weekData.length - 1]
        if (today?.virtue_focus) {
          setSelectedVirtue(today.virtue_focus)
          if (today.virtue_rating) setRating(today.virtue_rating)
        }
      })
      .catch(() => {})
  }, [])

  const saveVirtue = useCallback(async (virtue: string, newRating?: number) => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = { virtue }
      if (newRating !== undefined) body.rating = newRating
      await fetch('/api/path/virtue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      // fire-and-forget
    } finally {
      setSaving(false)
    }
  }, [])

  const handleSelectVirtue = (name: string) => {
    setSelectedVirtue(name)
    setRating(0) // reset rating when switching virtue
    saveVirtue(name)
  }

  const handleRate = (stars: number) => {
    setRating(stars)
    if (selectedVirtue) {
      saveVirtue(selectedVirtue, stars)
    }
  }

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <Leaf className="w-4 h-4 text-white/85" />
        <h3 className="text-sm font-medium text-white">Virtue Tracker</h3>
        {saving && <span className="ml-auto text-[10px] text-white/70">Saving...</span>}
      </div>

      {/* Virtue selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {virtues.map((v) => (
          <button
            key={v.name}
            onClick={() => handleSelectVirtue(v.name)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] border transition-all press-scale
              ${selectedVirtue === v.name
                ? 'bg-white/10 border-white/25 text-white'
                : 'bg-white/[0.03] border-white/[0.08] text-white/85'
              }`}
          >
            {v.name}
          </button>
        ))}
      </div>

      {/* Selected virtue description */}
      {selectedVirtue && (
        <p className="text-[11px] text-white/85 leading-relaxed mb-3">
          {virtues.find(v => v.name === selectedVirtue)?.description}
        </p>
      )}

      {/* Star rating */}
      <div className="mb-4">
        <p className="text-[10px] text-white/75 mb-2">How well did you practice this today?</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRate(star)}
              className="press-scale transition-all"
              disabled={!selectedVirtue}
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  star <= rating
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-white/10'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Weekly chart */}
      <div className="pt-3 border-t border-white/[0.06]">
        <p className="text-[10px] text-white/70 uppercase tracking-wider mb-2">This Week</p>
        <div className="flex items-end justify-between gap-1.5 h-12">
          {weekData.map((day, i) => {
            const hasRating = day.virtue_rating !== null && day.virtue_rating > 0
            const height = hasRating ? (day.virtue_rating! / 5) * 100 : 8
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm transition-all ${
                    hasRating ? 'bg-amber-400/40' : 'bg-white/[0.07]'
                  }`}
                  style={{ height: `${height}%` }}
                />
                <span className="text-[9px] text-white/60">{DAY_LABELS[i]}</span>
              </div>
            )
          })}
          {/* Fill remaining days if less than 7 */}
          {Array.from({ length: Math.max(0, 7 - weekData.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-sm bg-white/[0.07]" style={{ height: '8%' }} />
              <span className="text-[9px] text-white/60">{DAY_LABELS[weekData.length + i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
