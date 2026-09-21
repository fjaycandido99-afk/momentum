'use client'

import { Check } from 'lucide-react'
import { SHELVES } from '@/lib/ui/shelves'
import { useHiddenShelves } from '@/hooks/useHiddenShelves'
import { haptic } from '@/lib/haptics'

/**
 * "What home shows" — a preference, so it lives in Settings.
 *
 * It was briefly in the header menu, next to Daily Guide and Journal, which
 * put a setting in a list of places. Same toggles, right drawer.
 *
 * Both directions in one list: the place you turn a shelf off is the place
 * you turn it back on, and a hidden shelf stays listed rather than vanishing
 * from the app's own map of itself.
 */
export function HomeShelvesSetting() {
  const { hidden, isHidden, toggle } = useHiddenShelves()
  const showing = SHELVES.length - hidden.length

  return (
    <div>
      <p className="text-sm text-white/85 mb-1">What home shows</p>
      <p className="text-xs text-white/50 mb-3">
        Turn off the shelves you never use. Your era, today&rsquo;s audio and today&rsquo;s
        practice always stay.
      </p>

      <div className="space-y-2">
        {SHELVES.map(shelf => {
          const on = !isHidden(shelf.id)
          return (
            <button
              key={shelf.id}
              onClick={() => { haptic('light'); toggle(shelf.id) }}
              aria-pressed={on}
              className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 transition-colors ${
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
                <span className={`block text-sm leading-snug ${on ? 'text-white' : 'text-white/45'}`}>
                  {shelf.label}
                </span>
                <span className="block text-xs text-white/40 mt-0.5">{shelf.detail}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Careful with this line: soundscapes, music and motivation have no
          other route in, so "still available elsewhere" would be a lie. */}
      <p className="text-xs text-white/40 mt-3">
        Nothing is deleted — every shelf stays listed here. {showing} of {SHELVES.length} showing.
      </p>
    </div>
  )
}
