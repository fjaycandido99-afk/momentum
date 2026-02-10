'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  type Achievement,
  type AchievementCategory,
  CATEGORY_LABELS,
  RARITY_COLORS,
  RARITY_BG,
  RARITY_TEXT,
} from '@/lib/achievements'

interface AchievementWithStatus extends Achievement {
  unlocked: boolean
  unlockedAt: string | null
}

interface AchievementGridProps {
  achievements: AchievementWithStatus[]
  onAchievementClick?: (achievement: AchievementWithStatus) => void
}

export function AchievementGrid({ achievements, onAchievementClick }: AchievementGridProps) {
  const [expanded, setExpanded] = useState(false)

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length

  // Group by category
  const categories = Object.entries(CATEGORY_LABELS) as [AchievementCategory, string][]
  const grouped = categories.map(([cat, label]) => ({
    category: cat,
    label,
    achievements: achievements.filter(a => a.category === cat),
  }))

  // Show first 2 categories when collapsed
  const visibleGroups = expanded ? grouped : grouped.slice(0, 2)

  return (
    <div className="glass-refined rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Achievements</h3>
          <p className="text-[10px] text-white/40">{unlockedCount}/{totalCount} unlocked</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
              style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-white/40">{Math.round((unlockedCount / totalCount) * 100)}%</span>
        </div>
      </div>

      {visibleGroups.map(group => (
        <div key={group.category} className="mb-3 last:mb-0">
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">{group.label}</p>
          <div className="grid grid-cols-4 gap-2">
            {group.achievements.map(a => (
              <button
                key={a.id}
                onClick={() => onAchievementClick?.(a)}
                className={`
                  relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all
                  ${a.unlocked
                    ? `${RARITY_COLORS[a.rarity]} ${RARITY_BG[a.rarity]} hover:scale-105`
                    : 'border-white/5 bg-white/[0.02] opacity-40'
                  }
                `}
              >
                <span className="text-lg">{a.unlocked ? a.icon : '?'}</span>
                <span className={`text-[8px] text-center leading-tight ${a.unlocked ? RARITY_TEXT[a.rarity] : 'text-white/30'}`}>
                  {a.unlocked ? a.title : '???'}
                </span>
                {a.unlocked && (
                  <span className={`text-[7px] capitalize ${RARITY_TEXT[a.rarity]}`}>{a.rarity}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {grouped.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2 mt-1 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          {expanded ? (
            <>Show Less <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Show All ({totalCount - visibleGroups.reduce((s, g) => s + g.achievements.length, 0)} more) <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
    </div>
  )
}
