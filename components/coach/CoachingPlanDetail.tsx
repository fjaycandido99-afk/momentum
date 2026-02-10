'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { type CoachingPlan, getPlanProgress, markDayComplete } from '@/lib/coaching-plans'
import { logXPEventServer } from '@/lib/gamification'

interface CoachingPlanDetailProps {
  plan: CoachingPlan
  onBack: () => void
  onActivate: (planId: string) => void
}

export function CoachingPlanDetail({ plan, onBack, onActivate }: CoachingPlanDetailProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [completedDays, setCompletedDays] = useState<number[]>([])

  useEffect(() => {
    const progress = getPlanProgress(plan.id)
    if (progress) {
      setCompletedDays(progress.completedDays)
    }
    onActivate(plan.id)
  }, [plan.id, onActivate])

  const handleMarkDone = (day: number) => {
    markDayComplete(plan.id, day)
    setCompletedDays(prev => [...prev, day])
    logXPEventServer('moduleComplete')
  }

  const progressPercent = Math.round((completedDays.length / plan.days.length) * 100)

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-white/60 hover:text-white/80 transition-colors mb-3 press-scale"
        >
          <ChevronLeft className="w-4 h-4" />
          All Plans
        </button>
        <h2 className="text-xl font-semibold text-white mb-1">{plan.title}</h2>
        <p className="text-sm text-white/60 mb-4">{plan.description}</p>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-white/60 tabular-nums">{completedDays.length}/7</span>
        </div>
      </div>

      {/* Days list */}
      <div className="px-6 space-y-2">
        {plan.days.map((day) => {
          const isDone = completedDays.includes(day.day)
          const isExpanded = expandedDay === day.day

          return (
            <div key={day.day} className="rounded-2xl card-gradient-border overflow-hidden">
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                className="w-full flex items-center gap-3 p-4 press-scale"
              >
                {/* Day number / check */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isDone
                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                    : 'bg-white/10 border border-white/15'
                }`}>
                  {isDone ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <span className="text-xs font-medium text-white/60">{day.day}</span>
                  )}
                </div>

                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${isDone ? 'text-white/60' : 'text-white'}`}>
                    {day.title}
                  </p>
                </div>

                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-white/40" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/40" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 animate-fade-in-up">
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-white/[0.04]">
                      <p className="text-[10px] uppercase tracking-wider text-amber-400/70 mb-1">Morning</p>
                      <p className="text-sm text-white/80 leading-relaxed">{day.morning}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.04]">
                      <p className="text-[10px] uppercase tracking-wider text-blue-400/70 mb-1">Afternoon</p>
                      <p className="text-sm text-white/80 leading-relaxed">{day.afternoon}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.04]">
                      <p className="text-[10px] uppercase tracking-wider text-purple-400/70 mb-1">Evening</p>
                      <p className="text-sm text-white/80 leading-relaxed">{day.evening}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 mb-1">Reflection</p>
                      <p className="text-sm text-white/80 leading-relaxed italic">{day.reflection}</p>
                    </div>
                  </div>

                  {!isDone && (
                    <button
                      onClick={() => handleMarkDone(day.day)}
                      className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-all flex items-center justify-center gap-1.5 press-scale"
                    >
                      <Check className="w-4 h-4" />
                      Mark Day {day.day} Done
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
