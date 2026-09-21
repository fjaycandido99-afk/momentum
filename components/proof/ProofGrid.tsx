'use client'

import { useMemo } from 'react'
import type { ProofDay, ProofYear } from '@/lib/proof/grid'

/**
 * The year, as rows of seven.
 *
 * Deliberately one meaning per dot: filled = you kept a promise that day.
 * Missions, check-ins and everything else live in the sheet — a grid that
 * encodes four things at once is a chart nobody reads twice.
 *
 * Rows of seven (not the 53-column heatmap on /progress) because at phone
 * width 53 columns is a 6px box nobody can hit with a thumb, and because a
 * week per line is how people already picture a year.
 */

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function dotClass(d: ProofDay): string {
  if (d.future) return 'bg-transparent'
  switch (d.state) {
    case 'kept':
      return 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.35)]'
    case 'missed':
      return 'bg-transparent border border-white/30'
    case 'open':
      // Promised, never answered. Not a failure — an unfinished sentence.
      return 'bg-transparent border border-dashed border-white/20'
    default:
      return d.inEra ? 'bg-white/[0.14]' : 'bg-white/[0.06]'
  }
}

function label(d: ProofDay): string {
  const date = d.day
  switch (d.state) {
    case 'kept': return `${date} — kept`
    case 'missed': return `${date} — missed`
    case 'open': return `${date} — no answer`
    default: return `${date} — no promise`
  }
}

export function ProofGrid({
  year,
  hasDetail,
  onPick,
}: {
  year: ProofYear
  /** Which days can be opened — the ones with a promise behind them. */
  hasDetail: (day: string) => boolean
  onPick: (day: string) => void
}) {
  const rows = useMemo(() => year.weeks, [year.weeks])

  return (
    <div>
      {/* The weekday header sits above the same 7 columns as every row. */}
      <div className="grid grid-cols-[1.75rem_repeat(7,1fr)] gap-y-1.5 gap-x-1.5 mb-1.5" aria-hidden>
        <span />
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-center text-[10px] text-white/30">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-[1.75rem_repeat(7,1fr)] gap-y-1.5 gap-x-1.5">
        {rows.map((week, wi) => (
          <div key={wi} className="contents">
            <span className="text-[10px] text-white/35 self-center tabular-nums">{week.label ?? ''}</span>
            {week.days.map((day, di) =>
              day === null ? (
                <span key={di} />
              ) : hasDetail(day.day) || (day.isToday && !day.future) ? (
                <button
                  key={di}
                  onClick={() => onPick(day.day)}
                  aria-label={label(day)}
                  className={`aspect-square w-full rounded-full transition-transform active:scale-90 ${dotClass(day)} ${
                    day.isToday ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-black' : ''
                  }`}
                />
              ) : (
                <span
                  key={di}
                  aria-label={label(day)}
                  className={`aspect-square w-full rounded-full ${dotClass(day)}`}
                />
              ),
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 text-[11px] text-white/45">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white" /> kept
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border border-white/30" /> missed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border border-dashed border-white/20" /> no answer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white/[0.14]" /> in an era, no promise
        </span>
      </div>
    </div>
  )
}
