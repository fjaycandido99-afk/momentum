'use client'

import { useState, useEffect } from 'react'
import { Compass, Loader2 } from 'lucide-react'

interface AxisRead {
  id: string
  label: string
  low: string
  high: string
  value: number
  answers: number
}

interface ReadResponse {
  lean: string | null
  leanName: string | null
  leanIcon: string | null
  runnerUpName: string | null
  confidence: 'none' | 'early' | 'emerging' | 'clear'
  answered: number
  completeness: number
  current: string | null
  axes: AxisRead[]
}

const CONFIDENCE_COPY: Record<string, string> = {
  early: 'Early days — this can still move a lot.',
  emerging: 'A pattern is starting to show.',
  clear: 'This has held steady for a while.',
}

/**
 * The Daily Read panel.
 *
 * Deliberately says "leaning toward" and never "your type". These are ad-hoc
 * daily items, not a validated instrument, and a wellness app has no business
 * making a diagnostic-sounding claim. It is also the better product: a
 * direction you can watch move beats a label you are stuck with.
 */
export function DailyRead() {
  const [data, setData] = useState<ReadResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/assessment/read')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-white/40" />
      </div>
    )
  }

  if (!data) return null

  const pct = Math.round(data.completeness * 100)
  const diverges = data.lean && data.current && data.lean !== data.current

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.12]">
          <Compass className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Daily Read</h3>
          <p className="text-xs text-white/50">Built from your daily questions</p>
        </div>
      </div>

      {data.lean ? (
        <>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs text-white/50">Leaning toward</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{data.leanIcon}</span>
            <span className="text-xl font-semibold text-white">{data.leanName}</span>
          </div>
          <p className="text-xs text-white/60 mb-4">
            {CONFIDENCE_COPY[data.confidence]}
            {data.runnerUpName && data.confidence !== 'clear' && (
              <> Closest alternative is {data.runnerUpName}.</>
            )}
          </p>
          {diverges && (
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.15]">
              <p className="text-xs text-white/80">
                Your answers lean {data.leanName}, but your guide is set to something else.
                Neither is wrong — worth a look when you feel like it.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="mb-4">
          <p className="text-sm text-white/80 mb-1">Too early to say.</p>
          <p className="text-xs text-white/50">
            {data.answered === 0
              ? 'Answer a few daily questions and a picture starts forming here.'
              : `${data.answered} answered so far — a few more and this fills in.`}
          </p>
        </div>
      )}

      {/* Axis bars. Zero sits in the middle, so a bar that hasn't moved reads
          as balanced rather than empty. */}
      <div className="space-y-2.5 mb-4">
        {data.axes.map(axis => {
          const offset = Math.max(-1, Math.min(1, axis.value / 2))
          const width = Math.abs(offset) * 50
          const left = offset >= 0 ? 50 : 50 - width
          return (
            <div key={axis.id}>
              <div className="flex justify-between text-[10px] text-white/40 mb-1">
                <span>{axis.low}</span>
                <span>{axis.high}</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                {axis.answers > 0 && (
                  <div
                    className="absolute top-0 bottom-0 bg-white/70 rounded-full transition-all"
                    style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">{data.answered} answered</span>
        <span className="text-white/40">{pct}% of the picture</span>
      </div>
    </div>
  )
}
