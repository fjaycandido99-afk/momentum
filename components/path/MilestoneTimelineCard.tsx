'use client'

import { Milestone } from 'lucide-react'
import { RANK_TABLES, PATH_ACCENT_COLORS } from '@/lib/path-journey'
import type { MindsetId } from '@/lib/mindset/types'

type NonScholarMindset = Exclude<MindsetId, 'scholar'>

interface MilestoneTimelineCardProps {
  mindsetId: NonScholarMindset
  totalDays: number
}

export function MilestoneTimelineCard({ mindsetId, totalDays }: MilestoneTimelineCardProps) {
  const ranks = RANK_TABLES[mindsetId]
  const accentColor = PATH_ACCENT_COLORS[mindsetId]

  // Find current rank index
  let currentRankIndex = 0
  for (let i = 0; i < ranks.length; i++) {
    if (totalDays >= ranks[i].minDays) {
      currentRankIndex = i
    } else {
      break
    }
  }

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-white/[0.07]">
          <Milestone className="w-4 h-4 text-white/80" />
        </div>
        <h3 className="text-sm font-medium text-white">Rank Progression</h3>
      </div>

      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-white/10" />

        {ranks.map((rank, i) => {
          const isAchieved = i <= currentRankIndex
          const isCurrent = i === currentRankIndex
          const isNext = i === currentRankIndex + 1
          const daysNeeded = rank.minDays - totalDays

          return (
            <div key={rank.title} className="relative flex items-start gap-3 mb-4 last:mb-0">
              {/* Dot */}
              <div
                className={`absolute -left-6 top-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center
                  ${isCurrent
                    ? 'border-white/60 bg-white/20'
                    : isAchieved
                      ? 'border-white/40 bg-white/10'
                      : 'border-white/12 bg-white/[0.07]'
                  }`}
              >
                {isAchieved && (
                  <svg className="w-2.5 h-2.5 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    isCurrent ? accentColor : isAchieved ? 'text-white/80' : 'text-white/40'
                  }`}>
                    {rank.title}
                  </span>
                  <span className={`text-[10px] ${
                    isAchieved ? 'text-white/60' : 'text-white/30'
                  }`}>
                    {rank.minDays === 0 ? 'Start' : `${rank.minDays} days`}
                  </span>
                </div>
                {isCurrent && (
                  <span className="text-[10px] text-white/60">Current rank</span>
                )}
                {isNext && daysNeeded > 0 && (
                  <span className="text-[10px] text-white/40">{daysNeeded} days to go</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
