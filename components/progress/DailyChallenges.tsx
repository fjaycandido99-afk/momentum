'use client'

import { Check } from 'lucide-react'

interface ChallengeData {
  id: string
  title: string
  description: string
  icon: string
  xpReward: number
  completed: boolean
  mindsetTag?: string
}

interface DailyChallengesProps {
  challenges: ChallengeData[]
}

export function DailyChallenges({ challenges }: DailyChallengesProps) {
  const completedCount = challenges.filter(c => c.completed).length

  return (
    <div className="glass-refined rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Daily Challenges</h3>
          <p className="text-[10px] text-white/60">Resets at midnight</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < completedCount ? 'bg-emerald-400' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-white/60">{completedCount}/3</span>
        </div>
      </div>

      <div className="space-y-2">
        {challenges.map(c => (
          <div
            key={c.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              c.completed
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-white/[0.03] border border-white/5'
            }`}
          >
            <span className="text-lg shrink-0">{c.icon}</span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={`text-xs font-medium ${c.completed ? 'text-emerald-400' : 'text-white'}`}>
                  {c.title}
                </p>
                {c.mindsetTag && (
                  <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-white/[0.08] border border-white/10 text-white/70 shrink-0">
                    {c.mindsetTag}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-white/60 truncate">{c.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-amber-400/70">+{c.xpReward}</span>
              {c.completed ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/5 border border-white/15" />
              )}
            </div>
          </div>
        ))}
      </div>

      {completedCount === 3 && (
        <div className="mt-3 text-center">
          <p className="text-xs text-emerald-400 font-medium">All challenges complete! Come back tomorrow</p>
        </div>
      )}
    </div>
  )
}
