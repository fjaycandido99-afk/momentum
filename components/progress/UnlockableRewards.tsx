'use client'

import { Lock } from 'lucide-react'
import type { UnlockableReward } from '@/lib/unlockable-content'

interface UnlockableRewardsProps {
  unlockedRewards: UnlockableReward[]
  nextReward: UnlockableReward | null
  currentLevel: number
}

export function UnlockableRewards({ unlockedRewards, nextReward, currentLevel }: UnlockableRewardsProps) {
  return (
    <div className="glass-refined rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Rewards</h3>
        <span className="text-[10px] text-white/40">{unlockedRewards.length} unlocked</span>
      </div>

      {/* Next unlock highlight */}
      {nextReward && (
        <div className="mb-3 p-3 rounded-xl bg-amber-400/5 border border-amber-400/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-400/50" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-400">Next: {nextReward.title}</p>
              <p className="text-[10px] text-white/40">{nextReward.description}</p>
              <p className="text-[10px] text-amber-400/60 mt-0.5">Unlocks at Level {nextReward.requiredLevel}</p>
            </div>
          </div>
        </div>
      )}

      {/* Horizontal scroll of rewards */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {unlockedRewards.map(r => (
          <div
            key={r.id}
            className="flex-shrink-0 w-20 p-2 rounded-xl bg-white/[0.04] border border-white/10 text-center"
          >
            <span className="text-2xl block mb-1">{r.icon}</span>
            <p className="text-[8px] text-white/60 leading-tight">{r.title}</p>
          </div>
        ))}
        {unlockedRewards.length === 0 && (
          <p className="text-xs text-white/30 py-2">Level up to unlock rewards!</p>
        )}
      </div>
    </div>
  )
}
