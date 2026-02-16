'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, Circle, Gift } from 'lucide-react'

interface DailyProgressRingProps {
  morningDone: boolean
  movementDone: boolean
  lessonDone: boolean
  closeDone: boolean
  hasJournaledToday: boolean
  dailyIntention: boolean
  dailyBonusClaimed?: boolean
}

const TASKS = [
  { key: 'morningDone', label: 'Morning Prime' },
  { key: 'movementDone', label: 'Movement' },
  { key: 'lessonDone', label: 'Micro Lesson' },
  { key: 'closeDone', label: 'Day Close' },
  { key: 'hasJournaledToday', label: 'Journal' },
  { key: 'dailyIntention', label: 'Intention' },
] as const

export function DailyProgressRing({
  morningDone,
  movementDone,
  lessonDone,
  closeDone,
  hasJournaledToday,
  dailyIntention,
  dailyBonusClaimed,
}: DailyProgressRingProps) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const statuses: Record<string, boolean> = {
    morningDone,
    movementDone,
    lessonDone,
    closeDone,
    hasJournaledToday,
    dailyIntention,
  }

  const completedCount = Object.values(statuses).filter(Boolean).length
  const totalCount = TASKS.length
  const allComplete = completedCount === totalCount
  const progress = completedCount / totalCount

  // Ring SVG params
  const size = 22
  const strokeWidth = 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - progress * circumference

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center"
        aria-label={`Daily progress: ${completedCount} of ${totalCount}`}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={allComplete ? '#34d399' : '#60a5fa'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute text-[9px] font-bold text-white">{completedCount}</span>

        {/* Bonus dot */}
        {dailyBonusClaimed === false && completedCount > 0 && (
          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 py-2 rounded-2xl bg-black border border-white/15 shadow-xl z-[60] animate-fade-in-up">
          <div className="px-3 py-1.5 mb-1">
            <p className="text-xs font-medium text-white/70 uppercase tracking-wider">Today's Progress</p>
          </div>
          {TASKS.map((task) => {
            const done = statuses[task.key]
            return (
              <div
                key={task.key}
                className="flex items-center gap-2.5 px-3 py-2"
              >
                {done ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-white/30 shrink-0" />
                )}
                <span className={`text-sm ${done ? 'text-white' : 'text-white/50'}`}>
                  {task.label}
                </span>
              </div>
            )
          })}

          {/* Bonus indicator */}
          {dailyBonusClaimed === false && completedCount > 0 && (
            <>
              <div className="mx-3 my-1 border-t border-white/15" />
              <div className="flex items-center gap-2.5 px-3 py-2">
                <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-400">Bonus XP unclaimed!</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
