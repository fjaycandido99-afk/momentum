'use client'

/* ============================================================================
   CommunityPulse — top-of-feed read on how the community feels right now.

   Polished pass (per user feedback on community visual design):
     - All-monochrome: bar segments are white at different intensities
       (no indigo/violet/emerald/amber) so the Pulse stops being the
       single splash of color in an otherwise monochrome surface.
     - Collapsed by default — renders as a single eyebrow line:
         "Pulse · 24 reflections · 38% hopeful  [chevron]"
       Tap to expand the full bar + top-4 labels + window toggle.
     - When expanded, the bar + labels look identical to before but in
       monochrome with mood-specific opacity instead of color.
   ============================================================================ */

import { useEffect, useState, useCallback } from 'react'
import { Activity, ChevronDown } from 'lucide-react'

interface MoodRow {
  mood: string
  count: number
  pct: number
}

// Monochrome intensities per mood. Heavier moods (anxious/overwhelmed/lost)
// get slightly darker whites so the bar still reads as ordinal even
// without color. Hopeful + grateful brighten the bar; stuck + lost dim it.
const MOOD_META: Record<string, { emoji: string; label: string; alpha: number }> = {
  anxious:     { emoji: '😟',    label: 'Anxious',     alpha: 0.42 },
  overwhelmed: { emoji: '😵‍💫', label: 'Overwhelmed', alpha: 0.38 },
  stuck:       { emoji: '🌀',    label: 'Stuck',       alpha: 0.32 },
  hopeful:     { emoji: '🌱',    label: 'Hopeful',     alpha: 0.78 },
  grateful:    { emoji: '🙏',    label: 'Grateful',    alpha: 0.68 },
  lost:        { emoji: '🧭',    label: 'Lost',        alpha: 0.28 },
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
  // Collapsed by default — Pulse is informational, not the point of
  // the feed. Tap to expand.
  const [expanded, setExpanded] = useState(false)

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

  if (!isLoading && total === 0) return null

  const top = moods.slice(0, 4)
  const dominant = moods[0]
  const dominantMeta = dominant ? MOOD_META[dominant.mood] : null

  return (
    <div className="px-6 pt-3">
      <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] overflow-hidden">
        {/* Collapsed eyebrow — always visible, doubles as the toggle. */}
        <button
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.025] transition-colors"
        >
          <Activity className="w-3.5 h-3.5 text-white/55 shrink-0" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-white/55 font-semibold shrink-0">
            Pulse
          </span>
          {total > 0 && (
            <span className="text-[11px] text-white/40 shrink-0">· {total} reflections</span>
          )}
          {dominant && dominantMeta && !expanded && (
            <span className="text-[11px] text-white/55 truncate">
              · {dominant.pct}% {dominantMeta.label.toLowerCase()}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-white/45 ml-auto shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Expanded body — bar + top-4 labels + window toggle. */}
        {expanded && (
          <div className="px-3 pb-3">
            <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.04] mb-2.5">
              {moods.map(m => {
                const meta = MOOD_META[m.mood]
                const alpha = meta ? meta.alpha : 0.25
                return (
                  <div
                    key={m.mood}
                    title={`${meta?.label || m.mood} ${m.pct}%`}
                    style={{ width: `${m.pct}%`, backgroundColor: `rgba(255,255,255,${alpha})` }}
                  />
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-x-3 gap-y-1 min-w-0">
                {top.map(m => {
                  const meta = MOOD_META[m.mood]
                  if (!meta) return null
                  return (
                    <div key={m.mood} className="flex items-center gap-1 text-[11.5px]">
                      <span aria-hidden>{meta.emoji}</span>
                      <span className="text-white/80">{meta.label}</span>
                      <span className="text-white/40 tabular-nums">{m.pct}%</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-0.5 p-0.5 rounded-md bg-white/[0.06] shrink-0">
                {WINDOWS.map(w => (
                  <button
                    key={w.id}
                    onClick={(e) => { e.stopPropagation(); setWindowSel(w.id) }}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      windowSel === w.id ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
