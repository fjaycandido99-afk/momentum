'use client'

import { useState, useEffect } from 'react'
import { getMoonPhase, type MoonPhaseData } from '@/lib/astrology/moon-phase'
import { MOON_PHASE_MEANINGS } from '@/lib/astrology/constants'

/**
 * SVG moon visual that shows illumination based on phase.
 * Left-to-right illumination for waxing, right-to-left for waning.
 */
function MoonSVG({ phase, illumination }: { phase: string; illumination: number }) {
  const isWaning = phase.startsWith('waning') || phase === 'last_quarter'
  const isFull = phase === 'full_moon'
  const isNew = phase === 'new_moon'

  // Calculate the curve of the terminator line
  // illumination 0 = new (dark), 50 = quarter, 100 = full
  const frac = illumination / 100
  // Sweep from -1 (new) through 0 (quarter) to 1 (full)
  const sweep = frac * 2 - 1

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]">
      <defs>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(199,210,254,0.2)" />
          <stop offset="100%" stopColor="rgba(199,210,254,0)" />
        </radialGradient>
        <clipPath id="moonClip">
          <circle cx="40" cy="40" r="36" />
        </clipPath>
      </defs>

      {/* Glow */}
      <circle cx="40" cy="40" r="44" fill="url(#moonGlow)" />

      {/* Moon body */}
      <circle cx="40" cy="40" r="36" fill="#1e1b4b" stroke="rgba(139,92,246,0.3)" strokeWidth="1" />

      {/* Illuminated portion */}
      {!isNew && (
        <g clipPath="url(#moonClip)">
          {isFull ? (
            <circle cx="40" cy="40" r="36" fill="#c7d2fe" opacity="0.9" />
          ) : (
            <path
              d={
                isWaning
                  ? `M 40 4 A 36 36 0 0 0 40 76 A ${36 * sweep} 36 0 0 ${sweep > 0 ? 1 : 0} 40 4`
                  : `M 40 4 A 36 36 0 0 1 40 76 A ${36 * sweep} 36 0 0 ${sweep > 0 ? 0 : 1} 40 4`
              }
              fill="#c7d2fe"
              opacity="0.85"
            />
          )}
        </g>
      )}

      {/* Surface texture dots */}
      <circle cx="30" cy="30" r="4" fill="rgba(99,102,241,0.15)" />
      <circle cx="50" cy="45" r="3" fill="rgba(99,102,241,0.12)" />
      <circle cx="35" cy="52" r="2.5" fill="rgba(99,102,241,0.1)" />
    </svg>
  )
}

export function MoonPhaseWidget() {
  const [moonData, setMoonData] = useState<MoonPhaseData | null>(null)

  useEffect(() => {
    setMoonData(getMoonPhase())
  }, [])

  if (!moonData) return null

  const phaseMeaning = MOON_PHASE_MEANINGS[moonData.phase]

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="card-cosmic p-5">
      <p className="text-[10px] font-medium tracking-widest text-indigo-400/80 uppercase mb-4">
        Moon Phase
      </p>

      <div className="flex items-center gap-5">
        {/* Moon SVG */}
        <div className="shrink-0">
          <MoonSVG phase={moonData.phase} illumination={moonData.illumination} />
        </div>

        {/* Phase Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-white mb-0.5">{moonData.phaseName}</h3>
          <p className="text-sm text-indigo-300/80 mb-2">{moonData.illumination}% illuminated</p>
          {phaseMeaning && (
            <p className="text-xs text-white/95 leading-relaxed">{phaseMeaning.meaning}</p>
          )}
        </div>
      </div>

      {/* Energy & upcoming phases */}
      {phaseMeaning && (
        <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-[10px] uppercase tracking-wider text-indigo-400/70 mb-1">Cosmic Energy</p>
          <p className="text-xs text-white/95 leading-relaxed">{phaseMeaning.energy}</p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-[11px] text-white/95">
        <span>Next Full Moon: <span className="text-white/95">{formatDate(moonData.nextFullMoon)}</span></span>
        <span>Next New Moon: <span className="text-white/95">{formatDate(moonData.nextNewMoon)}</span></span>
      </div>
    </div>
  )
}
