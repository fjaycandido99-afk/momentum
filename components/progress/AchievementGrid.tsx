'use client'

import { useState } from 'react'
import { ChevronDown, Lock, Trophy } from 'lucide-react'
import {
  type Achievement,
  type AchievementCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  RARITY_COLORS,
  RARITY_BG,
  RARITY_TEXT,
  RARITY_GLOW,
} from '@/lib/achievements'

interface AchievementWithStatus extends Achievement {
  unlocked: boolean
  unlockedAt: string | null
}

interface AchievementGridProps {
  achievements: AchievementWithStatus[]
  onAchievementClick?: (achievement: AchievementWithStatus) => void
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AchievementGrid({ achievements, onAchievementClick }: AchievementGridProps) {
  const [expanded, setExpanded] = useState(false)

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length
  const pct = Math.round((unlockedCount / totalCount) * 100)

  // Group by category
  const categories = Object.entries(CATEGORY_LABELS) as [AchievementCategory, string][]
  const grouped = categories.map(([cat, label]) => ({
    category: cat,
    label,
    icon: CATEGORY_ICONS[cat],
    achievements: achievements.filter(a => a.category === cat),
  })).filter(g => g.achievements.length > 0)

  const visibleGroups = expanded ? grouped : grouped.slice(0, 3)
  const hiddenCount = grouped.slice(3).reduce((s, g) => s + g.achievements.length, 0)

  return (
    <div className="glass-refined rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">Achievements</h3>
            <p className="text-[10px] text-white/50">{unlockedCount} of {totalCount} unlocked</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-amber-400">{pct}%</span>
        </div>
      </div>

      {/* Category groups */}
      <div className="space-y-5">
        {visibleGroups.map(group => {
          const groupUnlocked = group.achievements.filter(a => a.unlocked).length
          return (
            <div key={group.category}>
              {/* Category header */}
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs">{group.icon}</span>
                <span className="text-[11px] font-medium text-white/80 uppercase tracking-wider">{group.label}</span>
                <span className="text-[10px] text-white/30 ml-auto">{groupUnlocked}/{group.achievements.length}</span>
              </div>

              {/* Achievement cards */}
              <div className="grid grid-cols-3 gap-2">
                {group.achievements.map(a => (
                  <button
                    key={a.id}
                    onClick={() => onAchievementClick?.(a)}
                    className={`
                      relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200
                      ${a.unlocked
                        ? `${RARITY_COLORS[a.rarity]} ${RARITY_BG[a.rarity]} ${RARITY_GLOW[a.rarity]} hover:scale-[1.03] active:scale-[0.97]`
                        : 'border-white/[0.06] bg-white/[0.02]'
                      }
                    `}
                  >
                    {/* Icon */}
                    <div className={`text-2xl leading-none ${a.unlocked ? '' : 'grayscale opacity-20'}`}>
                      {a.unlocked ? a.icon : <Lock className="w-5 h-5 text-white/20" />}
                    </div>

                    {/* Title */}
                    <span className={`text-[10px] font-medium text-center leading-tight line-clamp-2 ${
                      a.unlocked ? 'text-white' : 'text-white/25'
                    }`}>
                      {a.unlocked ? a.title : '???'}
                    </span>

                    {/* Rarity pill + XP */}
                    {a.unlocked ? (
                      <div className="flex items-center gap-1">
                        <span className={`text-[8px] font-semibold uppercase tracking-wider ${RARITY_TEXT[a.rarity]}`}>
                          {a.rarity}
                        </span>
                        <span className="text-[8px] text-amber-400/70">+{a.xpReward}</span>
                      </div>
                    ) : (
                      <span className="text-[8px] text-white/15">Locked</span>
                    )}

                    {/* Unlock date */}
                    {a.unlocked && a.unlockedAt && (
                      <span className="text-[7px] text-white/30">{formatDate(a.unlockedAt)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Expand/collapse */}
      {grouped.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-3 text-[11px] text-white/50 hover:text-white/70 transition-colors"
        >
          {expanded ? 'Show less' : `Show ${hiddenCount} more`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  )
}
