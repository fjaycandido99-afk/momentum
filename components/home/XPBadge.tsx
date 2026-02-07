'use client'

import { useState, useEffect } from 'react'
import { getTotalXP, getLevelFromXP } from '@/lib/gamification'

export function XPBadge() {
  const [xp, setXP] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setXP(getTotalXP())
  }, [])

  const { current, next, progress } = getLevelFromXP(xp)

  return (
    <div className="relative z-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 hover:bg-white/10 transition-colors press-scale"
        aria-label={`Level ${current.level}: ${current.title}. ${xp} XP total`}
      >
        <span className={`text-xs font-bold ${current.color}`}>Lv{current.level}</span>
        {/* Mini progress bar */}
        <div className="w-8 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </button>

      {/* Expanded dropdown */}
      {expanded && (
        <div className="absolute top-full right-0 mt-2 w-48 p-3 rounded-xl bg-[#111113] border border-white/15 shadow-lg z-[60] animate-fade-in-up">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-semibold ${current.color}`}>{current.title}</span>
            <span className="text-xs text-white/60">{xp} XP</span>
          </div>
          {next && (
            <>
              <div className="w-full h-2 rounded-full bg-white/10 mb-1.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-white/50">
                {next.minXP - xp} XP to {next.title}
              </p>
            </>
          )}
          {!next && (
            <p className="text-[10px] text-amber-400/80">Max level reached!</p>
          )}
        </div>
      )}
    </div>
  )
}
