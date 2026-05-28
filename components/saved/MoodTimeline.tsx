'use client'

import { useEffect, useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'

// Maps the in-app mood scales to 1..5 (journal: awful→great; check-in: low/medium/high).
const MOOD_VALUE: Record<string, number> = {
  awful: 1, low: 2, okay: 3, good: 4, great: 5,
  medium: 3, high: 4,
}
const MOOD_LABEL = ['—', 'Awful', 'Low', 'Okay', 'Good', 'Great']

interface Entry { date: string; journal_mood?: string | null }

// A monochrome mood line over the last ~30 days — the "Mood Timeline" from the
// memory-vault concept, on-brand (white line + soft area + aura glow). Fetches
// its own data and renders nothing until there are a few check-ins.
export function MoodTimeline() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    fetch(`/api/daily-guide/journal?startDate=${start.toISOString()}&endDate=${end.toISOString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.entries) setEntries(d.entries) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  const points = useMemo(() => {
    return entries
      .filter((e) => e.journal_mood && MOOD_VALUE[e.journal_mood])
      .map((e) => ({ date: e.date, v: MOOD_VALUE[e.journal_mood!] }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-20)
  }, [entries])

  if (!loaded || points.length < 3) return null

  const W = 320, H = 90, pad = 12
  const stepX = (W - pad * 2) / (points.length - 1)
  const y = (v: number) => H - pad - ((v - 1) / 4) * (H - pad * 2)
  const coords = points.map((p, i) => ({ x: pad + i * stepX, y: y(p.v) }))
  const line = 'M' + coords.map((c) => `${c.x},${c.y}`).join(' L')
  const area = `${line} L${coords[coords.length - 1].x},${H - pad} L${coords[0].x},${H - pad} Z`
  const last = points[points.length - 1].v

  return (
    <div className="relative overflow-hidden rounded-3xl card-surface-lg p-5 mt-2">
      <div className="absolute -bottom-16 -left-10 w-44 h-44 rounded-full bg-white/[0.05] blur-3xl pointer-events-none" aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-white/60" />
          <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Mood timeline</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-4" style={{ maxHeight: 110 }} aria-hidden>
          <defs>
            <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          {[1, 3, 5].map((v) => (
            <line key={v} x1={pad} x2={W - pad} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          ))}
          <path d={area} fill="url(#moodFill)" />
          <path d={line} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {coords.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3 : 1.8} fill="white" fillOpacity={i === coords.length - 1 ? 1 : 0.6} />
          ))}
        </svg>
        <div className="flex items-center justify-between mt-1 text-[10px] text-white/40">
          <span>{points.length} check-ins</span>
          <span>Now: <span className="text-white/70">{MOOD_LABEL[last]}</span></span>
        </div>
      </div>
    </div>
  )
}
