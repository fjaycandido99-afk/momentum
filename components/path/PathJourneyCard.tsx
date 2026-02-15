'use client'

import { useState, useEffect } from 'react'
import { Check, Flame, Trophy } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import {
  PATH_ACTIVITIES,
  PATH_GRADIENTS,
  PATH_ACCENT_COLORS,
  PATH_RING_COLORS,
  type PathStatus,
} from '@/lib/path-journey'

interface PathJourneyCardProps {
  mindsetId: MindsetId
  refreshKey?: number
}

const ACCENT_BORDERS: Record<MindsetId, string> = {
  stoic: 'border-slate-400/20',
  existentialist: 'border-violet-400/20',
  cynic: 'border-orange-400/20',
  hedonist: 'border-emerald-400/20',
  samurai: 'border-red-400/20',
  scholar: 'border-blue-400/20',
}

const DONE_COLORS: Record<MindsetId, { bg: string; border: string; text: string }> = {
  stoic: { bg: 'bg-slate-400/10', border: 'border-slate-400/25', text: 'text-slate-300' },
  existentialist: { bg: 'bg-violet-400/10', border: 'border-violet-400/25', text: 'text-violet-300' },
  cynic: { bg: 'bg-orange-400/10', border: 'border-orange-400/25', text: 'text-orange-300' },
  hedonist: { bg: 'bg-emerald-400/10', border: 'border-emerald-400/25', text: 'text-emerald-300' },
  samurai: { bg: 'bg-red-400/10', border: 'border-red-400/25', text: 'text-red-300' },
  scholar: { bg: 'bg-blue-400/10', border: 'border-blue-400/25', text: 'text-blue-300' },
}

const CHECK_COLORS: Record<MindsetId, string> = {
  stoic: 'text-slate-400',
  existentialist: 'text-violet-400',
  cynic: 'text-orange-400',
  hedonist: 'text-emerald-400',
  samurai: 'text-red-400',
  scholar: 'text-blue-400',
}

export function PathJourneyCard({ mindsetId, refreshKey }: PathJourneyCardProps) {
  const [status, setStatus] = useState<PathStatus | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [prevCompleted, setPrevCompleted] = useState(0)

  const config = MINDSET_CONFIGS[mindsetId]

  useEffect(() => {
    let cancelled = false
    fetch('/api/path/status')
      .then(r => r.ok ? r.json() : null)
      .then((data: PathStatus | null) => {
        if (cancelled || !data) return
        if (data.completedCount === 4 && prevCompleted < 4 && prevCompleted > 0) {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 2500)
        }
        setPrevCompleted(data.completedCount)
        setStatus(data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!status) {
    return (
      <div className="card-path p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
            <div className="h-2 w-16 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-full bg-white/[0.03] animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-9 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const gradient = PATH_GRADIENTS[mindsetId]
  const accentColor = PATH_ACCENT_COLORS[mindsetId]
  const ringColor = PATH_RING_COLORS[mindsetId]
  const accentBorder = ACCENT_BORDERS[mindsetId]
  const doneStyle = DONE_COLORS[mindsetId]
  const checkColor = CHECK_COLORS[mindsetId]
  const progress = status.completedCount / 4
  const radius = 38
  const stroke = 3.5
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)
  const isComplete = status.completedCount === 4

  const activityStatus: Record<string, boolean> = {
    reflection: status.reflection,
    exercise: status.exercise,
    quote: status.quote,
    soundscape: status.soundscape,
  }

  return (
    <div className={`card-path relative ${showConfetti ? 'confetti-burst' : ''}`}>
      <div className={`bg-gradient-to-br ${gradient} p-5`}>

        {/* Header: icon + title + rank badge */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <p className="text-[13px] font-semibold text-white">Today&apos;s Journey</p>
              {status.streak > 0 ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span className="text-xs font-semibold shimmer-text">{status.streak}-day streak</span>
                </div>
              ) : (
                <p className="text-[11px] text-white/60 mt-0.5">Start your streak today</p>
              )}
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${accentBorder} bg-white/[0.03]`}>
            <Trophy className={`w-3 h-3 ${accentColor}`} />
            <span className={`text-[11px] font-medium ${accentColor}`}>{status.rank}</span>
          </div>
        </div>

        {/* Center ring + count */}
        <div className="flex justify-center mb-5">
          <div className={`relative w-[100px] h-[100px] ${isComplete ? 'success-ring' : 'breathing-glow'}`}>
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {/* Background ring */}
              <circle
                cx="50" cy="50" r={radius}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}
              />
              {/* Progress ring */}
              <circle
                cx="50" cy="50" r={radius}
                fill="none" stroke={ringColor} strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isComplete ? (
                <>
                  <Check className={`w-6 h-6 ${checkColor} mb-0.5`} />
                  <span className="text-[10px] text-white/70 font-medium">Complete!</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-white tracking-tight">{status.completedCount}<span className="text-white/50 font-normal">/4</span></span>
                  <span className="text-[10px] text-white/50 -mt-0.5">today</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Activity checklist */}
        <div className="grid grid-cols-2 gap-2">
          {PATH_ACTIVITIES.map((act) => {
            const done = activityStatus[act.id]
            return (
              <div
                key={act.id}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-300 ${
                  done
                    ? `${doneStyle.bg} ${doneStyle.border} animate-scale-in`
                    : 'bg-white/[0.04] border-white/10'
                }`}
              >
                {done ? (
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${doneStyle.bg}`}>
                    <Check className={`w-2.5 h-2.5 ${checkColor}`} strokeWidth={3} />
                  </div>
                ) : (
                  <span className="text-sm leading-none">{act.icon}</span>
                )}
                <span className={`text-xs font-medium ${done ? doneStyle.text : 'text-white/70'}`}>
                  {act.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* 4/4 celebration message */}
        {isComplete && (
          <div className="mt-3 text-center animate-fade-in">
            <p className="text-[11px] text-white/60">All activities complete — see you tomorrow</p>
          </div>
        )}
      </div>
    </div>
  )
}
