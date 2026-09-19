'use client'

import { useState } from 'react'
import { ChevronDown, Trophy } from 'lucide-react'
import {
  type Achievement,
  type AchievementCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  RARITY_TEXT,
} from '@/lib/achievements'
import { AchievementBadge } from './AchievementBadge'

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

/**
 * The achievements grid on Progress.
 *
 * Locked achievements say how to earn them. A wall of "???" gives nobody
 * anything to aim at, and a visible next step is most of what makes an
 * achievement worth chasing. Only the Secret category stays hidden — the
 * surprise is the point there.
 *
 * Every size here is 10px or larger: the old 7–8px labels were unreadable
 * on a phone.
 */
export function AchievementGrid({ achievements, onAchievementClick }: AchievementGridProps) {
  const [expanded, setExpanded] = useState(false)

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  // CATEGORY_LABELS' order is the display order — Era first.
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
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-4 h-4 text-white" />
          <div>
            <h3 className="text-sm font-semibold text-white">Achievements</h3>
            <p className="text-[11px] text-white/60">{unlockedCount} of {totalCount} unlocked</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-white/60 to-white transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-white">{pct}%</span>
        </div>
      </div>

      {/* Category groups */}
      <div className="space-y-6">
        {visibleGroups.map(group => {
          const groupUnlocked = group.achievements.filter(a => a.unlocked).length
          return (
            <div key={group.category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs grayscale">{group.icon}</span>
                <span className="text-[11px] font-medium text-white/80 uppercase tracking-[0.16em]">{group.label}</span>
                <span className="text-[11px] text-white/45 ml-auto tabular-nums">{groupUnlocked}/{group.achievements.length}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {group.achievements.map(a => {
                  const hidden = !a.unlocked && a.category === 'secret'
                  return (
                    <button
                      key={a.id}
                      onClick={() => onAchievementClick?.(a)}
                      className={`press-scale relative flex flex-col items-center gap-2 px-2 pt-3 pb-2.5 rounded-xl border transition-all duration-200 ${
                        a.unlocked
                          ? 'border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.07]'
                          : 'border-white/[0.06] bg-white/[0.015]'
                      }`}
                      aria-label={
                        a.unlocked
                          ? `${a.title}, ${a.rarity}, unlocked`
                          : hidden ? 'Secret achievement, locked' : `${a.title}, locked. ${a.description}`
                      }
                    >
                      <AchievementBadge category={a.category} icon={a.icon} rarity={a.rarity} unlocked={a.unlocked} size={48} />

                      <span className={`text-[11px] font-medium text-center leading-tight line-clamp-2 ${
                        a.unlocked ? 'text-white' : 'text-white/45'
                      }`}>
                        {hidden ? 'Secret' : a.title}
                      </span>

                      {a.unlocked ? (
                        <span className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${RARITY_TEXT[a.rarity]}`}>
                            {a.rarity}
                          </span>
                          {a.unlockedAt && <span className="text-[10px] text-white/40">{formatDate(a.unlockedAt)}</span>}
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/35 text-center leading-snug line-clamp-2">
                          {hidden ? 'Keep going to find it' : a.description}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {grouped.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="press-scale w-full flex items-center justify-center gap-1.5 py-2.5 mt-4 text-[12px] text-white/70 hover:text-white/85 transition-colors"
        >
          {expanded ? 'Show less' : `Show ${hiddenCount} more`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  )
}
