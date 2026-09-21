'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import {
  MOVEMENT_STOP_NOTE,
  MOVEMENT_STOP_SIGNALS,
  MOVEMENT_TECHNIQUE_PENDING,
  PATTERN_LABELS,
  type Movement,
} from '@/lib/movements/library'
import { HURTS_NOTE, SWAP_REASONS, swapIntro, swapsFor, type SwapReason } from '@/lib/movements/swap'
import { PatternGlyph } from '@/components/movements/PatternGlyph'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * One movement: what it trains, and what you can do instead.
 *
 * The useful half of a movement library. It answers the question people
 * actually have mid-session — the bench is taken, the gym is shut, this
 * hurts — and it answers with other movements that train the same pattern.
 *
 * It does NOT teach the movement. Where technique would go it says so and
 * points elsewhere, because unreviewed form instruction is the one thing
 * this app could do that would actually hurt somebody.
 */
export function MovementSheet({
  movement,
  onSwap,
  onClose,
}: {
  movement: Movement
  /** Replace this row in the plan with another movement. */
  onSwap?: (replacement: Movement) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState<SwapReason | null>(null)
  const swaps = reason ? swapsFor(movement.id, reason) : []

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/90 backdrop-blur-sm flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={movement.name}
    >
      <button className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className="rounded-t-3xl border-t border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[88vh] overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* The mark for the pattern, not a picture of the lift. */}
            <span className="shrink-0 mt-0.5 w-11 h-11 rounded-xl border border-white/[0.14] bg-white/[0.04] flex items-center justify-center text-white/70">
              <PatternGlyph pattern={movement.pattern} className="w-6 h-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">
                {PATTERN_LABELS[movement.pattern]}
              </p>
              <h2 className="text-[26px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
                {movement.name}
              </h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {movement.equipment.map(e => (
            <span key={e} className="text-[11px] text-white/65 rounded-full border border-white/15 px-2 py-0.5">
              {e}
            </span>
          ))}
          <span className="text-[11px] text-white/45 rounded-full border border-white/10 px-2 py-0.5">
            {movement.level === 'simplest' ? 'simplest of its kind'
              : movement.level === 'advanced' ? 'asks the most skill'
              : 'standard'}
          </span>
        </div>

        {movement.pick && <p className="text-[13px] text-white/60 mt-2.5 leading-snug">{movement.pick}</p>}

        {/* Where technique would be. Said out loud rather than left blank:
            an empty space reads as "nothing to say", this reads as "we
            won't guess". */}
        {movement.technique ? (
          <div className="mt-4 rounded-2xl border border-white/[0.12] p-4">
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">
              How to do it · reviewed by {movement.technique.reviewedBy}
            </p>
            <ol className="mt-2 space-y-1.5">
              {movement.technique.steps.map((step, i) => (
                <li key={i} className="text-[14px] text-white/80 leading-snug">{step}</li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-[12px] text-white/40 mt-4 leading-relaxed">{MOVEMENT_TECHNIQUE_PENDING}</p>
        )}

        {/* The substitution engine. */}
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 mt-6">Do something else</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SWAP_REASONS.map(r => (
            <button
              key={r.key}
              onClick={() => { haptic('light'); setReason(reason === r.key ? null : r.key) }}
              className={`text-[13px] rounded-full px-3 py-1.5 border ${
                reason === r.key ? 'bg-white text-black border-white' : 'border-white/20 text-white/75'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {reason === 'hurts' && (
          <div className="mt-3 rounded-2xl border border-white/[0.14] bg-white/[0.04] p-4">
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/50">
              <AlertTriangle className="w-3.5 h-3.5" /> Before you swap
            </div>
            <p className="text-[13px] text-white/75 mt-1.5 leading-relaxed">{HURTS_NOTE}</p>
          </div>
        )}

        {reason && (
          <div className="mt-3">
            <p className="text-[12px] text-white/50">{swapIntro(reason, movement)}</p>
            {swaps.length > 0 ? (
              <div className="mt-2 space-y-2">
                {swaps.map(swap => (
                  <div key={swap.id} className="rounded-xl border border-white/[0.12] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[15px] text-white leading-snug flex items-center gap-2 min-w-0">
                        <span className="text-white/45 shrink-0">
                          <PatternGlyph pattern={swap.pattern} className="w-4 h-4" />
                        </span>
                        <span className="min-w-0">{swap.name}</span>
                      </p>
                      {onSwap && (
                        <button
                          onClick={() => { haptic('medium'); onSwap(swap) }}
                          className="text-[12px] text-black bg-white rounded-full px-2.5 py-1 font-medium shrink-0"
                        >
                          Use this
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-white/45 mt-0.5">
                      {swap.equipment.join(' · ')}
                      {swap.pick ? ` — ${swap.pick}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-white/45 mt-2">
                Nothing in the library fits that. Skipping the movement today costs you nothing.
              </p>
            )}
          </div>
        )}

        {/* Safety, which is not technique: a stop rule. */}
        <div className="mt-6 rounded-2xl border border-white/[0.1] p-4">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">Stop if</p>
          <ul className="mt-2 space-y-1">
            {MOVEMENT_STOP_SIGNALS.map(signal => (
              <li key={signal} className="text-[13px] text-white/70 leading-snug">{signal}</li>
            ))}
          </ul>
          <p className="text-[11px] text-white/40 mt-2.5 leading-relaxed">{MOVEMENT_STOP_NOTE}</p>
        </div>
      </div>
    </div>
  )
}
