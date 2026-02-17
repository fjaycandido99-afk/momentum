'use client'

import { PenLine, Flame, CheckCircle2, TrendingUp } from 'lucide-react'
import { calculateClientWellness, getWellnessZone } from '@/lib/smart-home-feed'

interface WellnessWidgetProps {
  journalMood?: string | null
  streak: number
  modulesCompletedToday: number
  hasJournaledToday: boolean
}

export function WellnessWidget({ journalMood, streak, modulesCompletedToday, hasJournaledToday }: WellnessWidgetProps) {
  const wellness = calculateClientWellness({
    journalMood,
    streak,
    modulesCompletedToday,
    hasJournaledToday,
  })

  const zone = getWellnessZone(wellness.score)

  const categories = [
    { label: 'Mood', value: wellness.mood, max: 25, icon: PenLine, done: !!journalMood },
    { label: 'Streak', value: wellness.consistency, max: 25, icon: Flame, done: streak >= 3 },
    { label: 'Today', value: wellness.engagement, max: 25, icon: CheckCircle2, done: modulesCompletedToday >= 2 && hasJournaledToday },
    { label: 'Trend', value: wellness.trend, max: 25, icon: TrendingUp, done: wellness.trend >= 18 },
  ]

  const tip = !journalMood && !hasJournaledToday
    ? 'Journal to boost Mood & Today'
    : modulesCompletedToday === 0
    ? 'Complete a module to boost Today'
    : streak < 3
    ? 'Keep your streak going'
    : 'You\'re doing great — keep it up'

  return (
    <div className="relative p-4 rounded-2xl border border-white/25 bg-black h-full flex flex-col overflow-hidden">
      {/* Top: title + score */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-white">Daily Wellness</h2>
          <p className="text-[10px] text-white/70">{zone.label}</p>
        </div>
        <div className="relative w-10 h-10 shrink-0">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="2.5" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              strokeWidth="2.5" strokeLinecap="round"
              stroke="white"
              strokeDasharray={`${(wellness.score / 100) * 94} 94`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white">{wellness.score}</span>
          </div>
        </div>
      </div>

      {/* Category bars */}
      <div className="mt-2 space-y-1.5 flex-1">
        {categories.map(cat => {
          const Icon = cat.icon
          const pct = Math.round((cat.value / cat.max) * 100)
          return (
            <div key={cat.label} className="flex items-center gap-1.5">
              <Icon className={`w-2.5 h-2.5 shrink-0 ${cat.done ? 'text-white' : 'text-white/50'}`} />
              <span className="text-[9px] text-white/85 w-9 shrink-0">{cat.label}</span>
              <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cat.done ? 'bg-white' : 'bg-white/50'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[8px] text-white/60 w-5 text-right shrink-0">{cat.value}</span>
            </div>
          )
        })}
      </div>

      {/* Tip */}
      <p className="text-[9px] text-white/60 mt-1.5 truncate">{tip}</p>
    </div>
  )
}
