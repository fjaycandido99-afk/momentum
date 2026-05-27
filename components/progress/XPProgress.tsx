'use client'

import { getLevelFromXP } from '@/lib/gamification'
import { AuraRing } from '@/components/ui/Aura'

interface XPProgressProps {
  totalXP?: number
  todaysXP?: number
}

export function XPProgress({ totalXP = 0, todaysXP }: XPProgressProps) {
  const xp = totalXP
  const { current, next, progress } = getLevelFromXP(xp)

  return (
    <div className="glass-refined rounded-2xl p-4 flex items-center gap-4">
      {/* Circular ring — signature aura ring */}
      <div className="relative w-24 h-24 shrink-0 grid place-items-center">
        <AuraRing size={96} stroke={4} progress={progress} breathe={false}>
          <div className="flex flex-col items-center justify-center leading-tight">
            <span className="text-lg font-bold text-white">{xp}</span>
            <span className="text-[9px] text-white/60">XP</span>
          </div>
        </AuraRing>
      </div>

      {/* Level info */}
      <div>
        <p className="text-sm font-semibold text-white">Level {current.level}</p>
        <p className="text-white text-xs">{current.title}</p>
        {next && (
          <p className="text-[10px] text-white/60 mt-1">
            {next.minXP - xp} XP to {next.title}
          </p>
        )}
        {todaysXP !== undefined && todaysXP > 0 && (
          <p className="text-[10px] text-white/55 mt-0.5">
            +{todaysXP} today
          </p>
        )}
      </div>
    </div>
  )
}
