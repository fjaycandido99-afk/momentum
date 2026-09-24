'use client'

/**
 * Picking what goes in the day.
 *
 * It replaces "add a row, then choose a kind from a dropdown that says 'A
 * discipline'". Their disciplines are listed by the names they gave them,
 * their current book is there when nothing else carries it, and the things
 * Voxu has no screen for are plain ideas they can edit. The decisions live in
 * lib/routines/picker; this draws them.
 *
 * A sheet rather than an inline list: the editor is already a tall dialog on
 * a phone, and eight steps of three groups inside it would push Save off the
 * bottom. Centred, scroll-locked, dvh — the dialog rules.
 */

import { X } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { groupedStepOptions, type PickerBook, type StepOption } from '@/lib/routines/picker'
import type { PracticeLite } from './RoutineSection'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

export function StepPicker({
  practices,
  book,
  onPick,
  onClose,
}: {
  practices: PracticeLite[]
  book: PickerBook | null
  onPick: (option: StepOption) => void
  onClose: () => void
}) {
  const sections = groupedStepOptions({ practices, book })

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Add a step"
    >
      <ScrollLock />
      <button className="absolute inset-0 bg-black/90 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[80dvh] overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[22px] text-white leading-tight" style={{ ...SERIF, fontWeight: 600 }}>
            What goes in the day?
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {sections.map(section => (
          <div key={section.group} className="mt-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">{section.label}</p>
            <div className="mt-2 space-y-1.5">
              {section.options.map(option => (
                <button
                  key={option.id}
                  onClick={() => { haptic('light'); onPick(option) }}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.03] text-left active:scale-[0.99]"
                >
                  <span className="block text-[14px] text-white leading-snug truncate">{option.label}</span>
                  {option.hint && (
                    <span className="block text-[11px] text-white/40 mt-0.5 leading-snug truncate">
                      {option.hint}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
