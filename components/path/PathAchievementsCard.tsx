'use client'

import { useState, useEffect } from 'react'
import { Trophy, Lock, Zap } from 'lucide-react'
import { ACHIEVEMENTS, RARITY_COLORS, RARITY_BG, RARITY_TEXT, RARITY_GLOW } from '@/lib/achievements'

const PATH_ACHIEVEMENT_IDS = ['path_first', 'path_7', 'path_21', 'path_streak_7', 'path_streak_30', 'virtue_tracker']

const pathAchievements = ACHIEVEMENTS.filter(a => PATH_ACHIEVEMENT_IDS.includes(a.id))

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function PathAchievementsCard() {
  const [unlockedMap, setUnlockedMap] = useState<Record<string, string | null>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/gamification/status')
      .then(r => r.ok ? r.json() : { achievements: [] })
      .then(d => {
        const map: Record<string, string | null> = {}
        for (const a of d.achievements || []) {
          if (a.unlocked) map[a.id] = a.unlockedAt || null
        }
        setUnlockedMap(map)
      })
      .catch(() => {})
  }, [])

  const unlockedCount = pathAchievements.filter(a => a.id in unlockedMap).length
  const pct = Math.round((unlockedCount / pathAchievements.length) * 100)

  const handleTap = (id: string) => {
    if (id in unlockedMap) {
      setExpanded(expanded === id ? null : id)
    }
  }

  return (
    <div className="card-path p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">Path Achievements</h3>
            <p className="text-[10px] text-white/50">{unlockedCount} of {pathAchievements.length} unlocked</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-amber-400">{pct}%</span>
        </div>
      </div>

      {/* Achievement cards */}
      <div className="grid grid-cols-3 gap-2">
        {pathAchievements.map((a) => {
          const unlocked = a.id in unlockedMap
          const unlockedAt = unlockedMap[a.id] || null
          const isExpanded = expanded === a.id

          return (
            <button
              key={a.id}
              onClick={() => handleTap(a.id)}
              className={`
                relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200
                ${unlocked
                  ? `${RARITY_COLORS[a.rarity]} ${RARITY_BG[a.rarity]} ${RARITY_GLOW[a.rarity]} hover:scale-[1.03] active:scale-[0.97]`
                  : 'border-white/[0.06] bg-white/[0.02]'
                }
              `}
            >
              {/* Icon */}
              <div className={`text-2xl leading-none ${unlocked ? '' : 'grayscale opacity-20'}`}>
                {unlocked ? a.icon : <Lock className="w-5 h-5 text-white/20" />}
              </div>

              {/* Title */}
              <span className={`text-[10px] font-medium text-center leading-tight line-clamp-2 ${
                unlocked ? 'text-white' : 'text-white/25'
              }`}>
                {unlocked ? a.title : '???'}
              </span>

              {/* Rarity + XP */}
              {unlocked ? (
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
              {unlocked && unlockedAt && (
                <span className="text-[7px] text-white/30">{formatDate(unlockedAt)}</span>
              )}

              {/* Expanded description */}
              {isExpanded && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full z-10 w-[140%] rounded-xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)] p-2.5 text-center">
                  <p className="text-[10px] text-white/70 leading-relaxed">{a.description}</p>
                  <div className="flex items-center justify-center gap-1 mt-1.5">
                    <Zap className="w-2.5 h-2.5 text-amber-400" />
                    <span className="text-[9px] font-semibold text-amber-400">+{a.xpReward} XP</span>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
