'use client'

import { Orbit } from 'lucide-react'
import { getTransitsForSign } from '@/lib/astrology/planetary-transits'

interface PlanetaryTransitsProps {
  zodiacSign: string
}

export function PlanetaryTransits({ zodiacSign }: PlanetaryTransitsProps) {
  const transits = getTransitsForSign(zodiacSign)
  const signLabel = zodiacSign.charAt(0).toUpperCase() + zodiacSign.slice(1).toLowerCase()

  return (
    <div className="card-cosmic p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/30 to-cyan-500/30">
          <Orbit className="w-5 h-5 text-cyan-300" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="font-medium text-white">Planetary Transits</h2>
          <p className="text-xs text-white/50">Where the planets are right now</p>
        </div>
      </div>

      {/* Horizontal Scroll Row */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {transits.map((transit) => {
          const isInUserSign = transit.currentSign === signLabel
          return (
            <div
              key={transit.planet}
              className={`flex-shrink-0 w-36 p-3 rounded-xl border transition-all ${
                isInUserSign
                  ? 'bg-gradient-to-b from-indigo-500/20 to-purple-500/15 border-indigo-400/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                  : 'bg-white/5 border-white/15'
              }`}
            >
              {/* Planet Symbol + Name */}
              <div className="text-center mb-2">
                <div className={`text-2xl mb-1 ${isInUserSign ? 'text-indigo-300' : 'text-white/80'}`}>
                  {transit.symbol}
                </div>
                <div className="text-xs font-medium text-white">{transit.planet}</div>
                <div className={`text-[11px] mt-0.5 ${isInUserSign ? 'text-indigo-300' : 'text-white/70'}`}>
                  in {transit.currentSign}
                </div>
              </div>

              {/* Meaning */}
              <p className="text-[11px] text-white/80 leading-relaxed text-center">
                {transit.meaning}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
