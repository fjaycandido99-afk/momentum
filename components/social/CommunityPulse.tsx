'use client'

/* ============================================================================
   CommunityPulse — top-of-feed visualization of how the community feels
   right now. Reads /api/social/pulse and renders:
     - A single horizontal bar split into mood segments by % share
     - Below it, the top 4 moods as labels (emoji + name + %)
     - Toggle between 24h / 7d windows
   Designed to be the first thing eyes land on when /community opens —
   addictive in the same way a weather forecast is.
   ============================================================================ */

import { useEffect, useState, useCallback } from 'react'
import { Activity } from 'lucide-react'

interface MoodRow {
  mood: string
  count: number
  pct: number
}

const MOOD_META: Record<string, { emoji: string; label: string; color: string }> = {
  anxious:     { emoji: '😟',   label: 'Anxious',     color: 'rgb(99, 102, 241)'   },
  overwhelmed: { emoji: '😵‍💫', label: 'Overwhelmed', color: 'rgb(139, 92, 246)'   },
  stuck:       { emoji: '🌀',   label: 'Stuck',       color: 'rgb(148, 163, 184)'  },
  hopeful:     { emoji: '🌱',   label: 'Hopeful',     color: 'rgb(52, 211, 153)'   },
  grateful:    { emoji: '🙏',   label: 'Grateful',    color: 'rgb(251, 191, 36)'   },
  lost:        { emoji: '🧭',   label: 'Lost',        color: 'rgb(244, 114, 182)'  },
}

const WINDOWS: { id: '24h' | '7d'; label: string }[] = [
  { id: '24h', label: 'Today' },
  { id: '7d',  label: 'This week' },
]

export function CommunityPulse() {
  const [windowSel, setWindowSel] = useState<'24h' | '7d'>('7d')
  const [moods, setMoods] = useState<MoodRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/social/pulse?window=${windowSel}`)
      if (res.ok) {
        const data = await res.json()
        setMoods(data.moods || [])
        setTotal(data.total || 0)
      }
    } catch (err) {
      console.error('[pulse] load failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [windowSel])

  useEffect(() => { void load() }, [load])

  // Nothing to show — quietly hide the whole component so the feed
  // doesn't open with an awkward "0 reflections" block.
  if (!isLoading && total === 0) return null

  const top = moods.slice(0, 4)

  return (
    <div className="px-6 pt-4">
      <div className="relative p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        {/* Eyebrow + window toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-white/60" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/55 font-semibold">
              Community pulse
            </span>
            {total > 0 && (
              <span className="text-[11px] text-white/40">· {total} reflections</span>
            )}
          </div>
          <div className="flex gap-0.5 p-0.5 rounded-md bg-white/[0.06]">
            {WINDOWS.map(w => (
              <button
                key={w.id}
                onClick={() => setWindowSel(w.id)}
                className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors ${
                  windowSel === w.id ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mood-share bar — each mood is a colored segment proportional
            to its % of total. One row, no scrubbing, just a glance. */}
        <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04] mb-3">
          {moods.map(m => {
            const meta = MOOD_META[m.mood] || { color: 'rgba(255,255,255,0.2)' }
            return (
              <div
                key={m.mood}
                title={`${meta.color} ${m.pct}%`}
                style={{ width: `${m.pct}%`, backgroundColor: meta.color, opacity: 0.85 }}
              />
            )
          })}
        </div>

        {/* Top 4 labels */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {top.map(m => {
            const meta = MOOD_META[m.mood]
            if (!meta) return null
            return (
              <div key={m.mood} className="flex items-center gap-1.5 text-[12px]">
                <span aria-hidden>{meta.emoji}</span>
                <span className="text-white/85">{meta.label}</span>
                <span className="text-white/45">{m.pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
