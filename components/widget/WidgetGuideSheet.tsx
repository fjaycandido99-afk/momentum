'use client'

import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { WidgetSteps } from './WidgetSetup'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * "Keep today in view" — the widget, shown with THEIR day in it, and how to
 * add it (iOS gives apps no way to add a widget for you). Opened by the
 * one-time nudge after a first kept promise, the opener's Day 1 screen, and
 * Settings. Portalled: it opens from inside transformed cards.
 */
export function WidgetGuideSheet({ onClose, era }: {
  onClose: () => void
  /** Their real day for the preview; a generic one without it. */
  era?: { title: string; day: number; lengthDays: number; promise: string | null } | null
}) {
  if (typeof document === 'undefined') return null
  const title = era?.title ?? 'Your era'
  const day = era ? `Day ${era.day} of ${era.lengthDays}` : 'Day 1 of 30'
  const promise = era?.promise ?? 'Your promise for today, right where you’ll see it.'

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="Add the Voxu widget">
      <ScrollLock />
      <button className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div
        className="relative w-full md:max-w-md max-h-[88dvh] overflow-y-auto overflow-x-hidden overscroll-contain rounded-t-3xl md:rounded-3xl border-t md:border border-white/15 bg-[#0b0b0b] px-5 pt-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-px-11 tracking-[0.24em] uppercase text-white/55">Home screen widget</p>
            <h2 className="text-px-26 text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>Keep today in view</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="tap-44 p-2 rounded-full bg-white/10 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-px-14 text-white/70 mt-2 leading-snug">
          Your era day and today&rsquo;s promise on your home screen — and on iOS 17, mark it done right there.
        </p>

        {/* What it will look like: a medium widget, with their day in it. */}
        <div className="mt-5 mx-auto max-w-[340px] aspect-[2.15/1] rounded-[22px] border border-white/15 bg-gradient-to-br from-[#1b1f2b] to-[#0a0b10] p-4 flex flex-col shadow-2xl" aria-label="Preview of the Voxu widget">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/55">{title} · {day}</p>
          <p className="mt-1 text-[17px] text-white" style={{ ...SERIF, fontWeight: 600 }}>Today&rsquo;s Promise</p>
          <p className="mt-1 text-[12px] text-white/85 leading-snug line-clamp-2">{promise}</p>
          <span className="mt-auto self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.12] text-[11px] text-white">
            <Check className="w-3 h-3" aria-hidden /> Mark Done
          </span>
        </div>

        <div className="mt-6">
          <WidgetSteps />
        </div>

        <button onClick={onClose} className="tap-44 mt-6 w-full py-3.5 rounded-2xl bg-white text-black text-px-15 font-medium press-scale">
          Got it
        </button>
      </div>
    </div>,
    document.body,
  )
}
