'use client'

import type { PatternGroup } from '@/lib/patterns/rules'
import type { Bar } from '@/lib/patterns/charts'

/**
 * The bars on Your laws. Counts only: the faint bar is how many were
 * answered, the lit part how many were kept. No percentages, no axis that
 * invents a scale — the tallest bar is simply the busiest slot.
 */

/** A law's two sides, as bars: "Before 8am — kept 18 of 20". */
export function CountBars({ groups }: { groups: readonly PatternGroup[] }) {
  if (groups.length < 2) return null
  const max = Math.max(...groups.map(g => g.of), 1)
  return (
    <ul className="mt-3 space-y-2">
      {groups.map(g => (
        <li key={g.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-px-12 text-white/80 first-letter:uppercase">{g.label}</span>
            <span className="text-px-12 text-white/70 tabular-nums">kept {g.hits} of {g.of}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-white/[0.08] overflow-hidden" style={{ width: `${Math.max(12, (g.of / max) * 100)}%` }} aria-hidden>
            <div className="h-full rounded-full era-accent-bg" style={{ width: `${g.of ? (g.hits / g.of) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Columns for the hour and weekday charts. */
export function ColumnChart({ bars, label }: { bars: readonly Bar[]; label: string }) {
  const max = Math.max(...bars.map(b => b.answered), 1)
  return (
    <figure className="mt-3">
      <div className="flex items-end gap-1.5 h-24" role="img" aria-label={`${label}: ${bars.filter(b => b.answered).map(b => `${b.label} ${b.kept} of ${b.answered} kept`).join(', ') || 'nothing answered yet'}`}>
        {bars.map((b, i) => (
          <div key={i} className="flex-1 h-full flex flex-col justify-end" aria-hidden>
            <div className="w-full rounded-t-md bg-white/[0.08] flex flex-col justify-end overflow-hidden" style={{ height: `${(b.answered / max) * 100}%`, minHeight: b.answered ? 4 : 0 }}>
              <div className="w-full era-accent-bg" style={{ height: `${b.answered ? (b.kept / b.answered) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5" aria-hidden>
        {bars.map((b, i) => (
          <span key={i} className="flex-1 text-center text-px-10 text-white/55 tabular-nums">{b.label}</span>
        ))}
      </div>
    </figure>
  )
}

/** "Day 4 of 7" as a bar. */
export function DayProgress({ day, of = 7 }: { day: number; of?: number }) {
  return (
    <div className="mt-3" aria-hidden>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full era-accent-bg" style={{ width: `${Math.min(1, day / of) * 100}%` }} />
      </div>
    </div>
  )
}

/** A finished experiment: their four weeks before, and the seven days of it. */
export function ResultBars({ before, during }: { before: { hits: number; of: number }; during: { hits: number; of: number } }) {
  const rows = [
    { label: 'Before (4 weeks)', ...before },
    { label: 'During (7 days)', ...during },
  ]
  return (
    <ul className="mt-2 space-y-1.5">
      {rows.map(r => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-px-11 text-white/65">{r.label}</span>
            <span className="text-px-11 text-white/70 tabular-nums">kept {r.hits} of {r.of}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden" aria-hidden>
            <div className="h-full rounded-full era-accent-bg" style={{ width: `${r.of ? (r.hits / r.of) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
