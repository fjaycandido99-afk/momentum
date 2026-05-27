'use client'

import { Compass } from 'lucide-react'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'
import { getJourney, JOURNEY_STAGES } from '@/lib/journey'

// Reframes raw streak/XP into a felt arc: "Day 12 of becoming more disciplined,"
// with named stages and a path you're moving along — a journey, not a counter.
export function JourneyCard({ day }: { day: number }) {
  const mindsetCtx = useMindsetOptional()
  const mindsetId = mindsetCtx?.mindset
  const name = mindsetId ? MINDSET_CONFIGS[mindsetId]?.name : undefined
  const j = getJourney(mindsetId, name, day)

  return (
    <div className="relative p-5 card-surface-lg overflow-hidden">
      {/* ambient glow — monochrome */}
      <div className="absolute -top-20 -right-12 w-44 h-44 rounded-full bg-white/[0.05] blur-3xl pointer-events-none" aria-hidden />

      <div className="relative">
        {/* Eyebrow: the path */}
        <div className="flex items-center gap-2">
          {mindsetId ? (
            <MindsetIcon mindsetId={mindsetId} className="w-3.5 h-3.5 text-white/60" />
          ) : (
            <Compass className="w-3.5 h-3.5 text-white/60" />
          )}
          <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">{j.pathName} Path</span>
        </div>

        {/* The arc */}
        {j.isBeginning ? (
          <div className="mt-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Begin your path</h2>
            <p className="text-sm text-white/70 mt-1 leading-snug">
              Show up today to take the first step toward becoming more {j.pursuit}.
            </p>
          </div>
        ) : (
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight tabular-nums">Day {j.day}</span>
              <span className="text-base font-medium text-white/85">· {j.stage}</span>
            </div>
            <p className="text-sm text-white/70 mt-1 leading-snug">
              You&rsquo;re becoming more <span className="text-white">{j.pursuit}</span>.
            </p>
          </div>
        )}

        {/* Milestone ladder — segments fill as you pass each stage */}
        <div className="mt-4 flex items-center gap-1">
          {JOURNEY_STAGES.map((stage, i) => {
            const reached = j.day >= stage.minDay
            const isCurrent = i === j.stageIndex
            return (
              <div key={stage.name} className="relative flex-1 h-1.5 rounded-full overflow-hidden bg-white/10">
                {/* fully-filled for passed stages; partial fill for the current band */}
                <div
                  className={`h-full rounded-full ${reached ? 'bg-white' : 'bg-white/0'}`}
                  style={isCurrent ? { width: `${Math.max(12, j.progressToNext * 100)}%` } : { width: reached ? '100%' : '0%' }}
                />
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full ring-1 ring-white/40" aria-hidden />
                )}
              </div>
            )
          })}
        </div>

        {/* Next milestone */}
        {j.nextStage ? (
          <p className="mt-2.5 text-xs text-white/55">
            Next: <span className="text-white/85 font-medium">{j.nextStage}</span>
            {j.daysToNext != null && (
              <> · {j.daysToNext === 0 ? 'today' : `${j.daysToNext} day${j.daysToNext === 1 ? '' : 's'} away`}</>
            )}
          </p>
        ) : (
          <p className="mt-2.5 text-xs text-white/55">You&rsquo;ve reached the summit — keep walking it.</p>
        )}
      </div>
    </div>
  )
}
