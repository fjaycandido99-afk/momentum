'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, X } from 'lucide-react'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * The era and journal moments — one line, one action, one way out.
 *
 * Deliberately plainer than the quote card: those two are about something
 * the person already started, so the card's job is to name it and get out of
 * the way, not to perform. Same shell, same off switch, same single
 * interruption per app open.
 */
export function MomentCard({
  label,
  line,
  action,
  href,
  onAction,
  onClose,
  onOff,
  dismissing,
  animating,
}: {
  label: string
  line: string
  action: string
  /** Set when the action is a place to go; otherwise it just closes. */
  href?: string
  onAction: () => void
  onClose: () => void
  onOff: () => void
  dismissing: boolean
  animating: boolean
}) {
  const body = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/10">
            <Sparkles className="w-4 h-4 text-white/80" />
          </div>
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">{label}</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      <p className="text-[22px] text-white leading-snug" style={{ ...SERIF, fontWeight: 600 }}>
        {line}
      </p>

      {href ? (
        <Link
          href={href}
          onClick={onAction}
          className="flex items-center justify-center gap-1.5 w-full mt-5 py-3 rounded-xl bg-white text-black text-sm font-medium"
        >
          {action} <ArrowRight className="w-4 h-4" />
        </Link>
      ) : (
        <button
          onClick={onAction}
          className="flex items-center justify-center gap-1.5 w-full mt-5 py-3 rounded-xl bg-white text-black text-sm font-medium"
        >
          {action} <ArrowRight className="w-4 h-4" />
        </button>
      )}

      <button onClick={onOff} className="block mx-auto mt-3 text-[11px] text-white/35 hover:text-white/60">
        Don&rsquo;t show these
      </button>
    </>
  )

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center px-6 ${
        animating && !dismissing ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-w-sm w-full rounded-2xl overflow-hidden glass-refined glass-elevated">
        <div className="absolute inset-0 bg-[#141416]/90" />
        <div className="absolute inset-0 rounded-2xl border border-white/15" />
        <div className="relative p-6">{body}</div>
      </div>
    </div>
  )
}
