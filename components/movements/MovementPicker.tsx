'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import {
  MOVEMENT_TECHNIQUE_PENDING,
  PATTERN_LABELS,
  movementsByPattern,
  type Movement,
  type MovementPattern,
} from '@/lib/movements/library'
import { KIT_IMAGES } from '@/lib/movements/images'
import { PatternGlyph } from './PatternGlyph'
import { haptic } from '@/lib/haptics'
import { ScrollLock } from '@/components/ui/ScrollLock'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * Pick an exercise instead of typing one.
 *
 * Browsing by pattern rather than by muscle or by goal: pattern is the
 * thing the app actually knows, and it's the axis that makes a swap
 * possible later. Everything inside a pattern is one list, simplest first
 * — no "recommended", no "best for", no ranking of one lift over another.
 *
 * Typing your own is still the default path. This is for the person who
 * doesn't know what to write, and it only ever writes a NAME into the row.
 */
export function MovementPicker({
  onPick,
  onClose,
}: {
  onPick: (movement: Movement) => void
  onClose: () => void
}) {
  const groups = movementsByPattern()
  const [open, setOpen] = useState<MovementPattern | null>(groups[0]?.pattern ?? null)

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Pick an exercise"
    >
      <ScrollLock />
      <button className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className="rounded-t-3xl border-t border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[88dvh] overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">The library</p>
            <h2 className="text-[26px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              Pick an exercise
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <p className="text-[13px] text-white/55 mt-2 leading-relaxed">
          Grouped by what the movement trains. Tap one to put it in your day — you can still write
          your own instead.
        </p>

        <div className="mt-4 space-y-2">
          {groups.map(group => {
            const isOpen = open === group.pattern
            return (
              <div key={group.pattern} className="rounded-2xl border border-white/[0.1] overflow-hidden">
                <button
                  onClick={() => { haptic('light'); setOpen(isOpen ? null : group.pattern) }}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
                >
                  {/* The kit, where there's a shot of it; the mark otherwise. */}
                  {KIT_IMAGES[group.pattern] ? (
                    <span className="shrink-0 w-14 h-11 rounded-lg overflow-hidden relative">
                      <img
                        src={KIT_IMAGES[group.pattern]!}
                        alt=""
                        aria-hidden
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-white/85">
                        <PatternGlyph pattern={group.pattern} className="w-4 h-4" />
                      </span>
                    </span>
                  ) : (
                    <span className="shrink-0 w-14 h-11 rounded-lg border border-white/[0.12] flex items-center justify-center text-white/70">
                      <PatternGlyph pattern={group.pattern} className="w-5 h-5" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] text-white leading-snug">
                      {PATTERN_LABELS[group.pattern]}
                    </span>
                    <span className="block text-[11px] text-white/40 tabular-nums">
                      {group.movements.length} options
                    </span>
                  </span>
                </button>

                {isOpen && (
                  <ul className="border-t border-white/[0.08]">
                    {group.movements.map(movement => (
                      <li key={movement.id}>
                        <button
                          onClick={() => { haptic('medium'); onPick(movement) }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.04] flex items-baseline justify-between gap-3"
                        >
                          <span className="min-w-0 text-[14px] text-white/85 leading-snug">
                            {movement.name}
                          </span>
                          <span className="text-[11px] text-white/40 shrink-0">
                            {movement.equipment[0]}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[11px] text-white/35 mt-4 leading-relaxed">{MOVEMENT_TECHNIQUE_PENDING}</p>
      </div>
    </div>
  )
}
