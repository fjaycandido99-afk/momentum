'use client'

import { Check, X } from 'lucide-react'
import { SHELVES } from '@/lib/ui/shelves'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * What home shows.
 *
 * Both directions in one place, deliberately: the sheet you hide a shelf in
 * is the sheet you get it back from, and hidden shelves stay listed here
 * rather than disappearing from the app's own map of itself. Nothing is
 * deleted, and the line at the bottom says so.
 *
 * What is NOT in this list: the era block, today's audio, today's practice,
 * the promise. Those are the app. A screen where everything is optional has
 * no opinion about what matters.
 */
export function CustomiseHomeSheet({
  hidden,
  onToggle,
  onClose,
}: {
  hidden: string[]
  onToggle: (id: string) => void
  onClose: () => void
}) {
  const shownCount = SHELVES.length - hidden.length

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="What home shows"
    >
      <button className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className="rounded-t-3xl border-t border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Home</p>
            <h2 className="text-[26px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              What do you want to see?
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 -mr-1 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <p className="text-sm text-white/60 leading-relaxed mt-2">
          Turn off the shelves you never use. Your era, today&rsquo;s audio and today&rsquo;s
          practice always stay.
        </p>

        <div className="mt-4 space-y-2">
          {SHELVES.map(shelf => {
            const on = !hidden.includes(shelf.id)
            return (
              <button
                key={shelf.id}
                onClick={() => { haptic('light'); onToggle(shelf.id) }}
                aria-pressed={on}
                className={`w-full text-left p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                  on ? 'border-white/[0.18] bg-white/[0.04]' : 'border-white/[0.08]'
                }`}
              >
                <span
                  className={`w-5 h-5 mt-0.5 shrink-0 rounded-md flex items-center justify-center ${
                    on ? 'bg-white text-black' : 'border border-white/20'
                  }`}
                  aria-hidden
                >
                  {on && <Check className="w-3.5 h-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[15px] leading-snug ${on ? 'text-white' : 'text-white/45'}`}>
                    {shelf.label}
                  </span>
                  <span className="block text-[12px] text-white/40 mt-0.5">{shelf.detail}</span>
                </span>
              </button>
            )
          })}
        </div>

        {/* Careful with this line: soundscapes, music and motivation have no
            other route in, so "still reachable elsewhere" would be a lie.
            What is true is that this sheet keeps them listed and one tap
            away. */}
        <p className="text-[11px] text-white/35 mt-4 leading-relaxed">
          Nothing is deleted. Every shelf stays listed here and comes straight back on —
          {' '}{shownCount} of {SHELVES.length} showing.
        </p>
      </div>
    </div>
  )
}
