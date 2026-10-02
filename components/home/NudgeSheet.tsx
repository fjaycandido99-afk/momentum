'use client'

import { X } from 'lucide-react'
import { ScrollLock } from '@/components/ui/ScrollLock'
import type { RightNow } from '@/lib/pulse/engine'
import { SpeakReplyButton } from '@/components/journal/SpeakReplyButton'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * The Pulse nudge: a bottom sheet, not a centre modal — lighter, and closer
 * to the thumb. One serif line, one sentence of why, one action and a way
 * to put it off. It is the moment's one interruption for this app open
 * (lib/home/moment.ts), so it never stacks with anything else.
 */
export function NudgeSheet({
  rightNow,
  primary,
  onPrimary,
  onLater,
  onOff,
  animating,
  dismissing,
}: {
  rightNow: RightNow
  primary: string
  onPrimary: () => void
  onLater: () => void
  onOff: () => void
  animating: boolean
  dismissing: boolean
}) {
  const subscription = useSubscriptionOptional()
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={rightNow.eyebrow}
      className={`fixed inset-0 z-[60] flex items-end justify-center transition-opacity duration-300 ${
        animating && !dismissing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <ScrollLock />
      <button aria-label="Later" onClick={onLater} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-[520px] mx-3 mb-[calc(env(safe-area-inset-bottom)+0.75rem)] rounded-3xl border border-white/[0.14] bg-[#0d0d0f]/95 backdrop-blur-xl p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/45 pt-1">{rightNow.eyebrow}</p>
          <button onClick={onLater} aria-label="Close" className="tap-44 p-1.5 -m-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[24px] leading-[1.15] text-white mt-1.5" style={{ ...SERIF, fontWeight: 500 }}>
          {rightNow.title}
        </p>
        {rightNow.context && <p className="text-[13px] text-white/60 mt-2 leading-snug">{rightNow.context}</p>}
        {rightNow.push && (
          <div className="mt-3">
            <SpeakReplyButton label="Talk me into it" text={rightNow.push} onUpgrade={subscription?.openUpgradeModal} />
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onPrimary}
            className="py-3 rounded-xl bg-white text-black text-[14px] font-medium active:scale-[0.98] transition-all"
          >
            {primary}
          </button>
          <button
            onClick={onLater}
            className="py-3 rounded-xl border border-white/[0.16] text-white/80 text-[14px] active:scale-[0.98] transition-all"
          >
            Later
          </button>
        </div>
        <button onClick={onOff} className="block mx-auto mt-3 text-[11px] text-white/35 hover:text-white/60">
          Don&rsquo;t nudge me about disciplines
        </button>
      </div>
    </div>
  )
}
