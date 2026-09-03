'use client'

/* ============================================================================
   /portrait/[year] — "You in YYYY"

   The year-end (or any-time) review built from your Morning Minutes
   and journaling. Shows the full-size InkSpiral as the visual artifact
   you've earned, the show-up count + longest streak, your dominant
   moods, and your last 12 minutes as poetry.

   Built deliberately minimal in V1 — the AI theme extraction and the
   "your year in sentences" essay come in a follow-up. What's here is
   enough to make the artifact REAL.
   ============================================================================ */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Flame, Calendar, Loader2 } from 'lucide-react'
import { InkSpiral } from '@/components/portrait/InkSpiral'
import { createClient } from '@/lib/supabase/client'

interface PortraitData {
  year: number
  minute_count: number
  show_days: number
  longest_streak: number
  current_streak: number
  recent_minutes: Array<{
    date: string
    at: string | null
    transcript: string
    response: string
  }>
  dominant_moods: Array<{ mood: string; count: number; pct: number }>
}

// Next 14.2: params on client components is a plain object, not a Promise.
export default function YearPortraitPage({ params }: { params: { year: string } }) {
  const year = parseInt(params.year, 10)
  const [data, setData] = useState<PortraitData | null>(null)
  const [seed, setSeed] = useState<string>('me')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // Seed the spiral off the caller's id so it stays stable per user.
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (alive && user) setSeed(user.id)

        const res = await fetch(`/api/portrait/${year}`)
        if (res.ok) {
          const json = await res.json()
          if (alive) setData(json)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [year])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen text-white pb-24 px-6 pt-16 text-center">
        <p className="text-lg">Couldn&apos;t build your portrait.</p>
        <Link href="/" className="inline-block mt-4 text-sm text-white/60 hover:text-white">← Home</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white pb-24">
      <div className="px-6 pt-12 pb-3">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
      </div>

      <div className="px-6 lg:max-w-2xl lg:mx-auto">
        {/* Hero — title + spiral artifact */}
        <div className="text-center pt-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45 font-semibold">
            You in
          </p>
          <h1 className="text-5xl font-bold tracking-tight mt-1 mb-7">{data.year}</h1>

          <div className="mx-auto w-44 h-44 rounded-full bg-white/[0.03] grid place-items-center">
            <InkSpiral
              seed={seed}
              entryCount={data.minute_count + data.show_days /* slight density boost from all show-up days */}
              size={180}
              withFrame
            />
          </div>

          <p className="mt-5 text-[12.5px] text-white/55 italic max-w-xs mx-auto">
            One stroke for every time you showed up. Every ring you earned, you earned.
          </p>
        </div>

        {/* Big numbers */}
        <div className="grid grid-cols-3 gap-3 mt-9">
          <div className="text-center p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-3xl font-bold tabular-nums">{data.minute_count}</p>
            <p className="text-[10.5px] uppercase tracking-wider text-white/50 mt-1">minutes</p>
          </div>
          <div className="text-center p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-3xl font-bold tabular-nums">{data.show_days}</p>
            <p className="text-[10.5px] uppercase tracking-wider text-white/50 mt-1">days</p>
          </div>
          <div className="text-center p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-3xl font-bold tabular-nums inline-flex items-center justify-center gap-1">
              <Flame className="w-5 h-5 text-white/85" />
              {data.longest_streak}
            </p>
            <p className="text-[10.5px] uppercase tracking-wider text-white/50 mt-1">longest run</p>
          </div>
        </div>

        {/* Dominant moods (when data exists) */}
        {data.dominant_moods.length > 0 && (
          <div className="mt-8 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 font-semibold mb-3">
              How the year felt
            </p>
            <div className="space-y-2">
              {data.dominant_moods.map(m => (
                <div key={m.mood} className="flex items-center gap-3">
                  <span className="capitalize text-[13px] text-white/85 min-w-[80px]">{m.mood}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full bg-white/80 rounded-full"
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                  <span className="text-[11.5px] text-white/55 tabular-nums">{m.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent minutes as poetry */}
        {data.recent_minutes.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-3.5 h-3.5 text-white/45" />
              <p className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 font-semibold">
                Recent reflections
              </p>
            </div>
            <div className="space-y-5">
              {data.recent_minutes.map((m, i) => (
                <div key={i} className="pb-5 border-b border-white/[0.06] last:border-b-0">
                  <p className="text-[10.5px] text-white/40 uppercase tracking-wider mb-1.5">
                    {new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                  <p
                    className="text-[16px] leading-snug text-white font-medium italic"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    &ldquo;{m.response}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="mt-12 text-center text-[10.5px] text-white/35 italic">
          Built from your sixty-second minutes.
        </p>
      </div>
    </div>
  )
}
