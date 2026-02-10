'use client'

import { Check } from 'lucide-react'

interface MissionData {
  id: string
  title: string
  description: string
  icon: string
  xpReward: number
  progress: number
  target: number
  completed: boolean
}

interface WeeklyMissionsProps {
  missions: MissionData[]
}

export function WeeklyMissions({ missions }: WeeklyMissionsProps) {
  const completedCount = missions.filter(m => m.completed).length

  return (
    <div className="glass-refined rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Weekly Missions</h3>
          <p className="text-[10px] text-white/40">Resets every Monday</p>
        </div>
        <span className="text-[10px] text-white/40">{completedCount}/{missions.length} done</span>
      </div>

      <div className="space-y-3">
        {missions.map(m => (
          <div
            key={m.id}
            className={`p-3 rounded-xl transition-all ${
              m.completed
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-white/[0.03] border border-white/5'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg shrink-0">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${m.completed ? 'text-emerald-400' : 'text-white'}`}>
                  {m.title}
                </p>
                <p className="text-[10px] text-white/40 truncate">{m.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-amber-400/70">+{m.xpReward}</span>
                {m.completed && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    m.completed
                      ? 'bg-emerald-400'
                      : 'bg-gradient-to-r from-blue-400 to-cyan-400'
                  }`}
                  style={{ width: `${(m.progress / m.target) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-white/40 tabular-nums">{m.progress}/{m.target}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
