'use client'

import { useEffect, useState } from 'react'
import { Sparkles, TrendingUp, Heart, Lightbulb, Loader2, ChevronRight } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

interface Insights {
  themes: string[]
  emotionalTrend: string
  gratitudePatterns: string
  suggestion: string
  moodCorrelation: string
}

type State = 'loading' | 'locked' | 'insufficient' | 'ready' | 'error'

// "What your journal reveals about you" — surfaces the (premium, day-cached)
// /api/ai/journal-insights endpoint that previously had no UI at all. This is
// the longitudinal payoff the free per-entry reflection points toward: themes,
// emotional trend, and patterns across the last two weeks of entries.
export function JournalInsights() {
  const { openUpgradeModal } = useSubscription()
  const [state, setState] = useState<State>('loading')
  const [data, setData] = useState<Insights | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/ai/journal-insights')
        if (cancelled) return
        if (res.status === 403) { setState('locked'); return }
        if (!res.ok) { setState('error'); return }
        const d = await res.json()
        if (cancelled) return
        if (d.insufficient) { setState('insufficient'); return }
        setData(d)
        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (state === 'error') return null

  return (
    <div className="px-6 mt-4">
      <div className="relative p-5 card-surface-lg overflow-hidden">
        <div className="absolute -top-16 -right-10 w-40 h-40 rounded-full bg-white/[0.05] blur-3xl pointer-events-none" aria-hidden />

        <div className="relative">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-white/60" />
            <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">What your journal reveals</span>
          </div>

          {state === 'loading' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-white/60">
              <Loader2 className="w-4 h-4 animate-spin" /> Reading your last two weeks…
            </div>
          )}

          {state === 'locked' && (
            <button onClick={openUpgradeModal} className="mt-3 block w-full text-left press-scale">
              <p className="text-[15px] text-white/90 leading-snug">
                Unlock the <span className="text-white font-medium">themes, emotional trends and patterns</span> across your entries — the bigger picture only your journal can show.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-white mt-3">
                Unlock insights <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          )}

          {state === 'insufficient' && (
            <p className="mt-3 text-[15px] text-white/70 leading-snug">
              A few more entries and the patterns will surface here — keep showing up and your journal will start revealing its threads.
            </p>
          )}

          {state === 'ready' && data && (
            <div className="mt-3 space-y-4">
              {data.themes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.themes.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] text-xs text-white/90 capitalize">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {data.emotionalTrend && (
                <p className="text-[15px] text-white leading-relaxed">{data.emotionalTrend}</p>
              )}

              <div className="space-y-2.5">
                {data.moodCorrelation && (
                  <div className="flex items-start gap-2.5">
                    <TrendingUp className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
                    <p className="text-sm text-white/75 leading-snug">{data.moodCorrelation}</p>
                  </div>
                )}
                {data.gratitudePatterns && (
                  <div className="flex items-start gap-2.5">
                    <Heart className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
                    <p className="text-sm text-white/75 leading-snug">{data.gratitudePatterns}</p>
                  </div>
                )}
                {data.suggestion && (
                  <div className="flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
                    <p className="text-sm text-white/90 leading-snug">{data.suggestion}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
