'use client'

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Footprints, MessageCircle, RefreshCw, X, Zap, type LucideIcon } from 'lucide-react'
import type { Loop } from '@/lib/psychology/lessons'

/**
 * A lesson's loop as a cycle, from the night mockup: Trigger → Thought →
 * What you do → What happens → back round. Cards, not circles — at 320px a
 * circle can't hold a sentence. The changed step sits underneath as "The
 * shift". A general pattern many people fall into, never anyone's own.
 */
const STEPS: { key: keyof Omit<Loop, 'newLoop'>; label: string; icon: LucideIcon }[] = [
  { key: 'trigger', label: 'Trigger', icon: Zap },
  { key: 'thought', label: 'Thought', icon: MessageCircle },
  { key: 'behavior', label: 'What you do', icon: Footprints },
  { key: 'outcome', label: 'What happens', icon: X },
]

function Step({ loop, i }: { loop: Loop; i: number }) {
  const s = STEPS[i]
  const Icon = s.icon
  return (
    <div className="rounded-2xl border border-white/[0.14] bg-white/[0.04] p-3 h-full">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-white/80" aria-hidden />
        <span className="text-px-10 uppercase tracking-[0.16em] text-white/65">{s.label}</span>
      </div>
      <p className="text-px-13 text-white/90 leading-snug mt-1.5">{loop[s.key]}</p>
    </div>
  )
}

export function LoopDiagram({ loop }: { loop: Loop }) {
  const arrow = 'w-4 h-4 text-white/45'
  return (
    <div className="mt-6 card-surface rounded-2xl p-4">
      <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">The loop</p>

      {/* Read in order by screen readers; the grid is the picture of it. */}
      <ol className="sr-only">
        {STEPS.map(s => <li key={s.key}>{s.label}: {loop[s.key]}</li>)}
        <li>Then it starts again.</li>
      </ol>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-y-1.5 gap-x-1" aria-hidden>
        <Step loop={loop} i={0} />
        <div className="flex items-center"><ArrowRight className={arrow} /></div>
        <Step loop={loop} i={1} />

        <div className="flex justify-center"><ArrowUp className={arrow} /></div>
        <div className="flex items-center justify-center"><RefreshCw className="w-4 h-4 text-white/30" /></div>
        <div className="flex justify-center"><ArrowDown className={arrow} /></div>

        <Step loop={loop} i={3} />
        <div className="flex items-center"><ArrowLeft className={arrow} /></div>
        <Step loop={loop} i={2} />
      </div>

      <div className="mt-4 rounded-2xl border p-3" style={{ borderColor: 'rgb(var(--era-accent, 255 255 255) / 0.45)', background: 'rgb(var(--era-accent, 255 255 255) / 0.08)' }}>
        <p className="text-px-10 uppercase tracking-[0.16em]" style={{ color: 'rgb(var(--era-accent, 255 255 255))' }}>The shift</p>
        <p className="text-px-14 text-white leading-snug mt-1">{loop.newLoop}</p>
      </div>
    </div>
  )
}
