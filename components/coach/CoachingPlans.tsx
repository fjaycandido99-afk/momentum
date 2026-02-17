'use client'

import { useState, useEffect } from 'react'
import { Shield, Heart, Target, Moon } from 'lucide-react'
import { COACHING_PLANS, getPlanProgress, setActivePlan, getActivePlan } from '@/lib/coaching-plans'
import { CoachingPlanDetail } from './CoachingPlanDetail'

const PLAN_ICONS: Record<string, typeof Shield> = {
  shield: Shield,
  heart: Heart,
  target: Target,
  moon: Moon,
}

export function CoachingPlans() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [activePlanId, setActivePlanId] = useState<string | null>(null)

  useEffect(() => {
    setActivePlanId(getActivePlan())
  }, [])

  const selectedPlan = COACHING_PLANS.find(p => p.id === selectedPlanId)

  if (selectedPlan) {
    return (
      <CoachingPlanDetail
        plan={selectedPlan}
        onBack={() => setSelectedPlanId(null)}
        onActivate={(planId) => {
          setActivePlan(planId)
          setActivePlanId(planId)
        }}
      />
    )
  }

  return (
    <div className="px-6 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Coaching Plans</h2>
        <p className="text-sm text-white/75">7-day guided programs for growth</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {COACHING_PLANS.map((plan) => {
          const Icon = PLAN_ICONS[plan.icon] || Shield
          const progress = getPlanProgress(plan.id)
          const completedDays = progress?.completedDays.length || 0
          const isActive = activePlanId === plan.id

          return (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className="text-left p-4 rounded-2xl bg-black border border-white/10 press-scale transition-all"
            >
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${plan.color} w-fit mb-3`}>
                <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-medium text-white mb-1">{plan.title}</h3>
              <p className="text-[10px] text-white/75 mb-2 line-clamp-2">{plan.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/60">7 days</span>
                {completedDays > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/10 text-white/75'
                  }`}>
                    {completedDays}/7
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
