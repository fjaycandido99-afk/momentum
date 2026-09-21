'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { KIT_LABELS, TEMPLATES, missingNote, sessionsFor, type Kit } from '@/lib/movements/templates'
import { PatternGlyph } from './PatternGlyph'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

const KITS: Kit[] = ['gym', 'home', 'bodyweight']

/**
 * Start from a session shape instead of a blank row.
 *
 * The honest version of a "preset workout": it fills in WHICH movements,
 * chosen by what you have to train with, and leaves how much to you. No
 * sets, no reps, no weeks — those are a prescription for a body this app
 * has never seen, and they're the part people actually own.
 *
 * Everything it writes is a library movement, so every row it creates
 * opens the movement screen and can be swapped from there.
 */
export function TemplatePicker({
  slotLabels,
  onApply,
  onClose,
}: {
  /** The days this discipline has, in order — the template is laid across them. */
  slotLabels: string[]
  /** Sessions in the same order as slotLabels; only movement names are written. */
  onApply: (sessions: { names: string[] }[], templateName: string) => void
  onClose: () => void
}) {
  const [kit, setKit] = useState<Kit>('gym')
  const [openKey, setOpenKey] = useState<string | null>(TEMPLATES[0]?.key ?? null)

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Start from a session"
    >
      <button className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className="rounded-t-3xl border-t border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[88vh] overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Instead of writing it</p>
            <h2 className="text-[26px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              Start from a session
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <p className="text-[13px] text-white/55 mt-2 leading-relaxed">
          Pick what you train with and a shape for the week. Voxu fills in which movements — how
          much is yours to write, and you can change any row afterwards.
        </p>

        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 mt-4">What you have</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {KITS.map(k => (
            <button
              key={k}
              onClick={() => { haptic('light'); setKit(k) }}
              className={`text-[13px] rounded-full px-3 py-1.5 border ${
                kit === k ? 'bg-white text-black border-white' : 'border-white/20 text-white/75'
              }`}
            >
              {KIT_LABELS[k]}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {TEMPLATES.map(template => {
            const sessions = sessionsFor(template, Math.max(1, slotLabels.length), kit)
            const isOpen = openKey === template.key
            const missing = [...new Set(sessions.flatMap(s => s.missing))]
            const note = missingNote(missing)
            const empty = sessions.every(s => s.movements.length === 0)

            return (
              <div key={template.key} className="rounded-2xl border border-white/[0.1] overflow-hidden">
                <button
                  onClick={() => { haptic('light'); setOpenKey(isOpen ? null : template.key) }}
                  aria-expanded={isOpen}
                  className="w-full text-left px-3.5 py-3"
                >
                  <span className="block text-[15px] text-white leading-snug">{template.name}</span>
                  <span className="block text-[12px] text-white/45 mt-0.5 leading-snug">{template.what}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-white/[0.08] px-3.5 py-3">
                    {sessions.map((session, i) => (
                      <div key={i} className={i > 0 ? 'mt-3 pt-3 border-t border-white/[0.06]' : ''}>
                        <p className="text-[10px] tracking-[0.18em] uppercase text-white/40">
                          {slotLabels[i] ?? session.label} · {session.label}
                        </p>
                        {session.movements.length > 0 ? (
                          <ul className="mt-1.5 space-y-1">
                            {session.movements.map(m => (
                              <li key={m.id} className="flex items-center gap-2 text-[13px] text-white/80">
                                <span className="text-white/35 shrink-0">
                                  <PatternGlyph pattern={m.pattern} className="w-3.5 h-3.5" />
                                </span>
                                <span className="min-w-0">{m.name}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[12px] text-white/35 mt-1">Nothing fits that kit.</p>
                        )}
                      </div>
                    ))}

                    {note && <p className="text-[11px] text-white/40 mt-3 leading-snug">{note}</p>}

                    {!empty && (
                      <button
                        onClick={() => {
                          haptic('medium')
                          onApply(
                            sessions.map(s => ({ names: s.movements.map(m => m.name) })),
                            template.name,
                          )
                        }}
                        className="w-full mt-3 py-2.5 rounded-xl bg-white text-black text-[14px] font-medium"
                      >
                        Use this
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[11px] text-white/35 mt-4 leading-relaxed">
          A shape, not a programme. Voxu doesn’t know your body, so it writes no sets, reps or
          weights — and it won’t tell you this one works better than another.
        </p>
      </div>
    </div>
  )
}
