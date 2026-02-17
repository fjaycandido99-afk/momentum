'use client'

import Link from 'next/link'
import { Settings, Sparkles } from 'lucide-react'
import { ZODIAC_SIGNS, ZODIAC_SYMBOLS, ELEMENT_COLORS } from '@/lib/astrology/constants'
import { ZODIAC_TRAITS } from '@/lib/ai/zodiac-traits'

interface ZodiacIdentityCardProps {
  zodiacSign?: string | null
}

export function ZodiacIdentityCard({ zodiacSign }: ZodiacIdentityCardProps) {
  if (!zodiacSign) {
    return (
      <div className="card-cosmic p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="font-medium text-white">Discover Your Sign</h2>
            <p className="text-xs text-white/95">Set your zodiac sign to unlock personalized cosmic guidance</p>
          </div>
        </div>
        <Link
          href="/settings"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition-all text-sm text-indigo-300 press-scale"
        >
          <Settings className="w-4 h-4" />
          Pick Your Sign in Settings
        </Link>
      </div>
    )
  }

  const signData = ZODIAC_SIGNS.find(s => s.id === zodiacSign)
  const traits = ZODIAC_TRAITS[zodiacSign]
  const symbol = ZODIAC_SYMBOLS[zodiacSign] || ''
  const elementColors = traits ? ELEMENT_COLORS[traits.element] : null

  if (!signData || !traits) return null

  return (
    <div className="card-cosmic p-5">
      {/* Sign Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{symbol}</div>
          <div>
            <h2 className="text-xl font-medium text-white">{signData.label}</h2>
            <p className="text-xs text-white/95">{signData.dates}</p>
          </div>
        </div>
        <Link
          href="/settings"
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          aria-label="Change zodiac sign"
        >
          <Settings className="w-4 h-4 text-white/95" />
        </Link>
      </div>

      {/* Element Badge */}
      {elementColors && (
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${elementColors.from} ${elementColors.to} ${elementColors.text} capitalize`}>
            {traits.element} Element
          </span>
        </div>
      )}

      {/* Traits */}
      <div className="flex flex-wrap gap-1.5">
        {traits.traits.split(', ').map((trait) => (
          <span
            key={trait}
            className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] text-white/95"
          >
            {trait}
          </span>
        ))}
      </div>
    </div>
  )
}
