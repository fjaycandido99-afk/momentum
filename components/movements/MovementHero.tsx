'use client'

import {
  PATTERN_MEANS,
  type Movement,
  type MovementTechnique,
} from '@/lib/movements/library'
import { artAlt, artFor } from '@/lib/movements/images'
import { layoutCallouts } from '@/lib/movements/technique'
import { PatternGlyph } from './PatternGlyph'

/**
 * The hero image with its callouts — the annotated picture from the design.
 *
 * Shared between the real screen and the reviewer's editor on purpose. A
 * preview that renders through different code is a preview that lies, and
 * the person writing the cues needs to see exactly what the reader will
 * see, including whether an arrow lands on the right part of the body.
 *
 * Art where it exists, the pattern mark where it doesn't. Never a
 * generated person mid-lift — see lib/movements/images.ts.
 */
export function MovementHero({
  movement,
  technique,
  className = 'mt-4',
}: {
  movement: Movement
  /** Reviewed guidance. Without it there are no callouts, by design. */
  technique?: MovementTechnique
  className?: string
}) {
  const art = artFor(movement)

  if (!art) {
    return (
      <div
        className={`${className} rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.07] to-white/[0.01] px-5 py-7 flex flex-col items-center text-center`}
      >
        <span className="text-white/75">
          <PatternGlyph pattern={movement.pattern} className="w-16 h-16" />
        </span>
        <p className="text-[13px] text-white/60 mt-3 leading-snug max-w-[26ch]">
          {PATTERN_MEANS[movement.pattern]}
        </p>
      </div>
    )
  }

  return (
    <div className={`${className} rounded-2xl border border-white/[0.1] overflow-hidden relative`}>
      <img
        src={art.src}
        alt={artAlt(movement, art)}
        className="w-full aspect-[4/3] object-cover"
        loading="lazy"
      />

      {/* Callouts: labels pinned to the picture, drawn by the app and only
          ever from reviewed guidance. No arrow points at a body on this
          screen unless a named person said it should.

          The leader line runs from the label's edge toward the point, and
          the dot marks the point itself — so a reviewer can tell whether
          x and y landed where they meant. */}
      {layoutCallouts(technique?.callouts ?? []).map(callout => (
        <div key={callout.label}>
          <div
            className={`absolute max-w-[42%] ${callout.side === 'right' ? 'text-right' : 'text-left'}`}
            style={{
              left: callout.side === 'left' ? '4%' : undefined,
              right: callout.side === 'right' ? '4%' : undefined,
              // The LABEL is nudged to clear its neighbours and the
              // caption; the dot below still marks the real point.
              top: `${callout.labelY}%`,
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
          <span
            aria-hidden
            className="absolute w-1.5 h-1.5 rounded-full bg-white/80 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${callout.x}%`, top: `${callout.y}%` }}
          />
        </div>
      ))}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pt-8 pb-3 flex items-end gap-2">
        <span className="text-white/70 shrink-0">
          <PatternGlyph pattern={movement.pattern} className="w-5 h-5" />
        </span>
        <p className="text-[12px] text-white/75 leading-snug">{PATTERN_MEANS[movement.pattern]}</p>
      </div>
    </div>
  )
}
