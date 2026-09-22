'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import {
  MOVEMENT_STOP_NOTE,
  MOVEMENT_STOP_SIGNALS,
  MOVEMENT_TECHNIQUE_PENDING,
  PATTERN_LABELS,
  PATTERN_MEANS,
  REGION_LABELS,
  mechanicOf,
  regionsOf,
  type Movement,
} from '@/lib/movements/library'
import {
  HURTS_NOTE,
  SWAP_REASONS,
  samePattern,
  swapIntro,
  swapsFor,
  type SwapReason,
} from '@/lib/movements/swap'
import { artAlt, artFor, ownArt } from '@/lib/movements/images'
import { PatternGlyph } from '@/components/movements/PatternGlyph'
import { RegionMap } from '@/components/movements/RegionMap'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

const LEVEL_LABEL: Record<Movement['level'], string> = {
  simplest: 'Simplest of its kind',
  standard: 'Standard',
  advanced: 'Asks the most skill',
}

/**
 * One movement: what it trains, what its relatives are, and what to do
 * instead.
 *
 * Laid out like a movement page should be — identity, a visual, how to do
 * it, variations, safety — with one difference from the mockup: the
 * how-to-do-it block is empty and says why. Everything else on this screen
 * is a fact about the library (pattern, equipment, level, relatives). Form
 * cues, common mistakes and demo footage are the parts that need a real
 * body on camera and a qualified name attached, so they're a gap the app
 * admits to rather than content it invents.
 *
 * Variations are navigable: tapping one re-opens this sheet on that
 * movement, which is how someone walks from a barbell squat to the version
 * they can actually do today.
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
  /** The movement being shown, which variations can change. */
  const [current, setCurrent] = useState(movement)
  const [reason, setReason] = useState<SwapReason | null>(null)
  const swaps = reason ? swapsFor(current.id, reason) : []
  const variations = samePattern(current)
  const art = artFor(current)

  const show = (next: Movement) => {
    haptic('light')
    setCurrent(next)
    setReason(null)
  }

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/90 backdrop-blur-sm flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={current.name}
    >
      <button className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className="rounded-t-3xl border-t border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[88vh] overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">
              {PATTERN_LABELS[current.pattern]}
            </p>
            <h2 className="text-[28px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              {current.name}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* The indicators: what it needs, whether one joint moves or
            several, and how much practice it asks for. Facts about the
            movement — none of them tell anyone what to do. */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-[11px] text-white/65 rounded-full border border-white/15 px-2.5 py-0.5 capitalize">
            {mechanicOf(current)}
          </span>
          {current.equipment.map(e => (
            <span key={e} className="text-[11px] text-white/65 rounded-full border border-white/15 px-2.5 py-0.5">
              {e}
            </span>
          ))}
          <span className="text-[11px] text-white/45 rounded-full border border-white/10 px-2.5 py-0.5">
            {LEVEL_LABEL[current.level]}
          </span>
        </div>

        {/* Broad regions only. "Quads and glutes" is what's printed on the
            machine; a percentage per muscle head would be a claim about a
            body this app has never seen. */}
        <div className="mt-3">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/40">Works</p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {regionsOf(current).map(region => (
              <div
                key={region}
                className="rounded-lg bg-white/[0.05] border border-white/[0.1] px-3 py-2 flex flex-col items-center gap-1"
              >
                {/* Where it is, at one weight. Never a heat map — how much
                    a region does varies by person and load, and the app
                    knows neither. */}
                <span className="text-white/80">
                  <RegionMap region={region} className="w-7 h-16" />
                </span>
                <span className="text-[11px] text-white/70">{REGION_LABELS[region]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* The visual: art for the movement or its family where it exists,
            the pattern mark where it doesn't. Never a person mid-lift —
            see lib/movements/images.ts for why. */}
        {art ? (
          <div className="mt-4 rounded-2xl border border-white/[0.1] overflow-hidden relative">
            <img
              src={art.src}
              alt={artAlt(current, art)}
              className="w-full aspect-[4/3] object-cover"
              loading="lazy"
            />

            {/* Callouts: labels pinned to the picture, drawn by the app and
                only ever from reviewed guidance. No arrow points at a body
                on this screen unless a named person said it should. */}
            {current.technique?.callouts?.map(callout => (
              <div
                key={callout.label}
                className={`absolute max-w-[42%] ${callout.side === 'right' ? 'text-right' : 'text-left'}`}
                style={{
                  left: callout.side === 'left' ? '4%' : undefined,
                  right: callout.side === 'right' ? '4%' : undefined,
                  top: `${callout.y}%`,
                }}
              >
                <p className="text-[11px] text-white leading-tight font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  {callout.label}
                </p>
                {callout.detail && (
                  <p className="text-[10px] text-white/70 leading-snug mt-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    {callout.detail}
                  </p>
                )}
                <span
                  aria-hidden
                  className={`block h-px bg-white/45 mt-1 ${callout.side === 'right' ? 'ml-auto' : ''}`}
                  style={{ width: `${Math.max(12, Math.abs(callout.x - (callout.side === 'left' ? 4 : 96)))}%` }}
                />
              </div>
            ))}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pt-8 pb-3 flex items-end gap-2">
              <span className="text-white/70 shrink-0">
                <PatternGlyph pattern={current.pattern} className="w-5 h-5" />
              </span>
              <p className="text-[12px] text-white/75 leading-snug">
                {PATTERN_MEANS[current.pattern]}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.07] to-white/[0.01] px-5 py-7 flex flex-col items-center text-center">
            <span className="text-white/75">
              <PatternGlyph pattern={current.pattern} className="w-16 h-16" />
            </span>
            <p className="text-[13px] text-white/60 mt-3 leading-snug max-w-[26ch]">
              {PATTERN_MEANS[current.pattern]}
            </p>
          </div>
        )}

        {current.pick && <p className="text-[13px] text-white/60 mt-3 leading-snug">{current.pick}</p>}

        {/* How to do it: content with a reviewer's name on it, or the
            reason there isn't any. Never invented. */}
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 mt-6">How to do it</p>
        {current.technique ? (
          <div className="mt-2 rounded-2xl border border-white/[0.12] p-4">
            <p className="text-[10px] tracking-[0.18em] uppercase text-white/40">
              Reviewed by {current.technique.reviewedBy} · {current.technique.reviewedOn}
            </p>
            <ol className="mt-2.5 space-y-2">
              {current.technique.steps.map((step, i) => (
                <li key={i} className="text-[14px] text-white/80 leading-snug flex gap-2.5">
                  <span className="text-[11px] text-white/35 tabular-nums mt-0.5 shrink-0">{i + 1}</span>
                  <span className="min-w-0">{step}</span>
                </li>
              ))}
            </ol>

            {current.technique.cues && current.technique.cues.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/[0.08]">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/40">Key cues</p>
                <div className="mt-2 grid grid-cols-1 gap-1.5">
                  {current.technique.cues.map(cue => (
                    <div key={cue.label}>
                      <p className="text-[13px] text-white/85 leading-snug">{cue.label}</p>
                      {cue.detail && (
                        <p className="text-[11px] text-white/45 leading-snug">{cue.detail}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {current.technique.mistakes && current.technique.mistakes.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/[0.08]">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/40">Common mistakes</p>
                <div className="mt-2 space-y-1.5">
                  {current.technique.mistakes.map(m => (
                    <div key={m.label}>
                      <p className="text-[13px] text-white/85 leading-snug">{m.label}</p>
                      {m.detail && <p className="text-[11px] text-white/45 leading-snug">{m.detail}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-white/40 mt-2 leading-relaxed">{MOVEMENT_TECHNIQUE_PENDING}</p>
        )}

        {/* Variations: the relatives, navigable. */}
        {variations.length > 0 && (
          <>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 mt-6">Variations</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {variations.slice(0, 6).map(v => {
                const thumb = ownArt(v)
                return (
                <button
                  key={v.id}
                  onClick={() => show(v)}
                  className="rounded-xl border border-white/[0.12] overflow-hidden text-left hover:bg-white/[0.04]"
                >
                  {/* Its own art if it has any, its family's otherwise, and
                      the mark when there's neither. */}
                  {thumb ? (
                    <span className="block aspect-[16/10] relative">
                      <img src={thumb.src} alt="" aria-hidden className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    </span>
                  ) : (
                    <span className="flex aspect-[16/10] items-center justify-center text-white/35 bg-white/[0.03]">
                      <PatternGlyph pattern={v.pattern} className="w-6 h-6" />
                    </span>
                  )}
                  <span className="block p-3">
                    <span className="block text-[13px] text-white leading-snug">{v.name}</span>
                    <span className="block text-[11px] text-white/40 mt-0.5 truncate">
                      {v.equipment.join(' · ')}
                    </span>
                  </span>
                </button>
                )
              })}
            </div>
          </>
        )}

        {/* The substitution engine. */}
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 mt-6">Swap movement</p>
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
            <p className="text-[12px] text-white/50">{swapIntro(reason, current)}</p>
            {swaps.length > 0 ? (
              <div className="mt-2 space-y-2">
                {swaps.map(swap => (
                  <div key={swap.id} className="rounded-xl border border-white/[0.12] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() => show(swap)}
                        className="text-[15px] text-white leading-snug flex items-center gap-2 min-w-0 text-left"
                      >
                        <span className="text-white/45 shrink-0">
                          <PatternGlyph pattern={swap.pattern} className="w-4 h-4" />
                        </span>
                        <span className="min-w-0">{swap.name}</span>
                      </button>
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
