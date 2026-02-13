'use client'

import { useState, useEffect } from 'react'
import { Award } from 'lucide-react'
import { ACHIEVEMENTS, RARITY_COLORS, RARITY_BG, type Achievement } from '@/lib/achievements'

const PATH_ACHIEVEMENT_IDS = ['path_first', 'path_7', 'path_21', 'path_streak_7', 'path_streak_30', 'virtue_tracker']

const pathAchievements = ACHIEVEMENTS.filter(a => PATH_ACHIEVEMENT_IDS.includes(a.id))

export function PathAchievementsCard() {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    // Fetch user's unlocked achievements from gamification status
    fetch('/api/gamification/status')
      .then(r => r.ok ? r.json() : { achievements: [] })
      .then(d => {
        const ids = new Set<string>(
          (d.achievements || [])
            .filter((a: { unlocked: boolean }) => a.unlocked)
            .map((a: { id: string }) => a.id)
        )
        setUnlockedIds(ids)
      })
      .catch(() => {})
  }, [])

  const handleTap = (id: string) => {
    if (unlockedIds.has(id)) {
      setExpanded(expanded === id ? null : id)
    }
  }

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-white/[0.07]">
          <Award className="w-4 h-4 text-white/80" />
        </div>
        <h3 className="text-sm font-medium text-white">Path Achievements</h3>
        <span className="ml-auto text-[10px] text-white/40">
          {pathAchievements.filter(a => unlockedIds.has(a.id)).length}/{pathAchievements.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {pathAchievements.map((achievement) => {
          const unlocked = unlockedIds.has(achievement.id)
          const isExpanded = expanded === achievement.id

          return (
            <button
              key={achievement.id}
              onClick={() => handleTap(achievement.id)}
              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all
                ${unlocked
                  ? `${RARITY_BG[achievement.rarity]} ${RARITY_COLORS[achievement.rarity]}`
                  : 'bg-white/[0.04] border-white/12'
                }
                ${unlocked ? 'press-scale' : 'opacity-50'}
              `}
            >
              <span className={`text-xl ${unlocked ? '' : 'grayscale'}`}>
                {unlocked ? achievement.icon : '?'}
              </span>
              <span className={`text-[10px] text-center leading-tight ${
                unlocked ? 'text-white/80' : 'text-white/30'
              }`}>
                {unlocked ? achievement.title : '???'}
              </span>

              {isExpanded && (
                <div className="absolute -bottom-1 left-0 right-0 translate-y-full z-10 bg-black/90 border border-white/12 rounded-lg p-2 text-[10px] text-white/60 text-center">
                  {achievement.description}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
