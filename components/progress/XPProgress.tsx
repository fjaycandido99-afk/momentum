'use client'

import { getLevelFromXP } from '@/lib/gamification'

interface XPProgressProps {
  totalXP?: number
  todaysXP?: number
}

export function XPProgress({ totalXP = 0, todaysXP }: XPProgressProps) {
  const xp = totalXP
  const { current, next, progress } = getLevelFromXP(xp)

  const radius = 40
  const stroke = 4
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="glass-refined rounded-2xl p-4 flex items-center gap-4">
      {/* Circular ring */}
      <div className="relative w-24 h-24 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Background ring */}
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          {/* Progress ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{xp}</span>
          <span className="text-[9px] text-white/40">XP</span>
        </div>
      </div>

      {/* Level info */}
      <div>
        <p className={`text-sm font-semibold ${current.color}`}>Level {current.level}</p>
        <p className="text-white text-xs">{current.title}</p>
        {next && (
          <p className="text-[10px] text-white/40 mt-1">
            {next.minXP - xp} XP to {next.title}
          </p>
        )}
        {todaysXP !== undefined && todaysXP > 0 && (
          <p className="text-[10px] text-cyan-400/60 mt-0.5">
            +{todaysXP} today
          </p>
        )}
      </div>
    </div>
  )
}
