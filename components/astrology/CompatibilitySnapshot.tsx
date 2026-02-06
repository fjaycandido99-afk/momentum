'use client'

import { ZODIAC_SIGNS, ZODIAC_SYMBOLS, ELEMENT_COMPATIBILITY } from '@/lib/astrology/constants'
import { ZODIAC_TRAITS } from '@/lib/ai/zodiac-traits'

interface CompatibilitySnapshotProps {
  zodiacSign?: string | null
}

/**
 * Get today's compatible signs based on element compatibility with day-seeded rotation.
 */
function getTodaysCompatibleSigns(sign: string): string[] {
  const traits = ZODIAC_TRAITS[sign]
  if (!traits) return []

  const compatibleElements = ELEMENT_COMPATIBILITY[traits.element] || []

  // Get all compatible signs (excluding the user's own sign)
  const allCompatible = Object.entries(ZODIAC_TRAITS)
    .filter(([id, t]) => id !== sign && compatibleElements.includes(t.element))
    .map(([id]) => id)

  // Seed-based rotation using day-of-year
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )

  // Shuffle deterministically based on day
  const shuffled = [...allCompatible].sort((a, b) => {
    const hashA = (a.charCodeAt(0) * 31 + dayOfYear) % 100
    const hashB = (b.charCodeAt(0) * 31 + dayOfYear) % 100
    return hashA - hashB
  })

  // Return top 3
  return shuffled.slice(0, 3)
}

export function CompatibilitySnapshot({ zodiacSign }: CompatibilitySnapshotProps) {
  if (!zodiacSign) return null

  const traits = ZODIAC_TRAITS[zodiacSign]
  if (!traits) return null

  const compatibleSigns = getTodaysCompatibleSigns(zodiacSign)
  const compatibleElements = ELEMENT_COMPATIBILITY[traits.element] || []

  return (
    <div className="card-cosmic p-5">
      <p className="text-[10px] font-medium tracking-widest text-indigo-400/80 uppercase mb-1">
        Compatibility Snapshot
      </p>
      <p className="text-xs text-white/95 mb-4">
        Today&apos;s harmonious signs for {ZODIAC_SIGNS.find(s => s.id === zodiacSign)?.label}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {compatibleSigns.map((signId) => {
          const signData = ZODIAC_SIGNS.find(s => s.id === signId)
          const signTraits = ZODIAC_TRAITS[signId]
          if (!signData || !signTraits) return null

          return (
            <div
              key={signId}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-center"
            >
              <span className="text-2xl block mb-1">{ZODIAC_SYMBOLS[signId]}</span>
              <p className="text-xs font-medium text-white">{signData.label}</p>
              <p className="text-[10px] text-white/95 capitalize mt-0.5">{signTraits.element}</p>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-white/95 mt-3 text-center">
        {traits.element === 'fire' || traits.element === 'air'
          ? 'Fire & Air signs fuel each other\u2019s energy'
          : 'Earth & Water signs ground and nourish each other'}
      </p>
    </div>
  )
}
