'use client'

import { useState } from 'react'
import { ChevronDown, Trophy } from 'lucide-react'
import {
  type Achievement,
  type AchievementCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  
} from '@/lib/achievements'
import { AchievementBadge, METAL, METAL_RGB } from './AchievementBadge'
import { nearest, remainingLabel, SECRET_CLUES } from '@/lib/relic-paths'

interface AchievementWithStatus extends Achievement {
  unlocked: boolean
  unlockedAt: string | null
  /** The coin's stamp — see achievementMark. */
  mark?: string | null
  /** How far a locked one is, where measurable — see achievementProgress. */
  progress?: { current: number; target: number } | null
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
  // Secret ones never count as "close": their requirement is the surprise.
  const closest = nearest(achievements.filter(a => a.category !== 'secret'))
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
          <Trophy className="w-4 h-4 text-[#e8c79a]" />
          <div>
            <h3 className="text-sm font-semibold text-white">Your relics</h3>
            <p className="text-px-11 text-white/60">{unlockedCount} of {totalCount} earned</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#a8743f] to-[#f3dcb8] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-px-11 font-medium text-white">{pct}%</span>
        </div>
      </div>

      {/* Closest to unlocking — real progress only, nearest first. */}
      {closest.length > 0 && (
        <div className="mb-6">
          <p className="text-px-11 font-medium text-white/80 uppercase tracking-[0.16em] mb-2">Closest to unlocking</p>
          <ul className="space-y-1.5">
            {closest.map(a => (
              <li key={a.id}>
                <button
                  onClick={() => onAchievementClick?.(a)}
                  className="tap-44 w-full flex items-center gap-3 p-2 rounded-xl border border-white/[0.08] text-left press-scale"
                >
                  <AchievementBadge id={a.id} category={a.category} icon={a.icon} rarity={a.rarity} unlocked={false} plain size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-px-13 text-white truncate">{a.title}</span>
                    <span className="block text-px-11 text-white/65">{remainingLabel(a, a.progress!)}</span>
                  </span>
                  <span className="text-px-11 text-white/60 tabular-nums shrink-0">{a.progress!.current}/{a.progress!.target}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Paths — one per family, with how far along it is. */}
      <div className="space-y-6">
        {visibleGroups.map(group => {
          const groupUnlocked = group.achievements.filter(a => a.unlocked).length
          return (
            <div key={group.category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs grayscale">{group.icon}</span>
                <span className="text-px-11 font-medium text-white/80 uppercase tracking-[0.16em]">{group.label}</span>
                <span className="text-px-11 text-white/45 ml-auto tabular-nums">{groupUnlocked}/{group.achievements.length}</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden -mt-1.5 mb-3" aria-hidden>
                <div className="h-full rounded-full bg-[#d6aa76]/70" style={{ width: `${Math.round((groupUnlocked / group.achievements.length) * 100)}%` }} />
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
                          // Earned tiles take their badge's metal — steel, silver or
                          // gold — as an edge over a faint glow. Locked stay grey.
                          ? 'bg-white/[0.02]'
                          : 'border-white/[0.06] bg-white/[0.015]'
                      }`}
                      style={a.unlocked ? {
                        borderColor: `rgb(${METAL_RGB[METAL[a.rarity]]} / ${METAL[a.rarity] === 'steel' ? 0.18 : 0.4})`,
                        backgroundImage: `radial-gradient(90% 70% at 50% 20%, rgb(${METAL_RGB[METAL[a.rarity]]} / 0.1), transparent)`,
                      } : undefined}
                      aria-label={
                        a.unlocked
                          ? `${a.title}, ${a.rarity}, unlocked`
                          : hidden ? 'Secret achievement, locked' : `${a.title}, locked. ${a.description}`
                      }
                    >
                      <AchievementBadge id={a.id} category={a.category} icon={a.icon} rarity={a.rarity} unlocked={a.unlocked} mark={hidden ? null : a.mark} size={48} />

                      <span className={`text-px-11 font-medium text-center leading-tight line-clamp-2 ${
                        a.unlocked ? 'text-white' : 'text-white/45'
                      }`}>
                        {hidden ? 'Secret' : a.title}
                      </span>

                      {a.unlocked ? (
                        <span className="flex items-center gap-1.5">
                          <span className="text-px-9 uppercase tracking-[0.16em] font-medium" style={{ color: `rgb(${METAL_RGB[METAL[a.rarity]]})` }}>
                            {a.rarity}
                          </span>
                          {a.unlockedAt && <span className="text-px-10 text-white/40">{formatDate(a.unlockedAt)}</span>}
                        </span>
                      ) : (
                        <>
                          <span className="text-px-10 text-white/35 text-center leading-snug line-clamp-2">
                            {hidden ? (SECRET_CLUES[a.id] ?? 'Keep going to find it') : a.description}
                          </span>
                          {!hidden && a.progress && a.progress.current > 0 && (
                            <span className="w-full flex items-center gap-1.5 mt-0.5">
                              <span className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                                <span
                                  className="block h-full rounded-full bg-[#d6aa76]/80"
                                  style={{ width: `${Math.round((a.progress.current / a.progress.target) * 100)}%` }}
                                />
                              </span>
                              <span className="text-px-10 text-white/55 tabular-nums">{a.progress.current}/{a.progress.target}</span>
                            </span>
                          )}
                        </>
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
          className="press-scale w-full flex items-center justify-center gap-1.5 py-2.5 mt-4 text-px-12 text-white/70 hover:text-white/85 transition-colors"
        >
          {expanded ? 'Show less' : `Show ${hiddenCount} more`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  )
}
