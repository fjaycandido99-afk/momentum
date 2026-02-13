'use client'

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { AchievementCelebration } from '@/components/progress/AchievementCelebration'
import { ACHIEVEMENTS } from '@/lib/achievements'

interface FullAchievement {
  id: string
  title: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  xpReward: number
}

/** Minimal shape returned by logXPEventServer */
interface MinimalAchievement {
  id: string
  title: string
  xpReward: number
}

function resolveAchievement(a: MinimalAchievement): FullAchievement {
  const full = ACHIEVEMENTS.find(x => x.id === a.id)
  if (full) return { id: full.id, title: full.title, description: full.description, icon: full.icon, rarity: full.rarity, xpReward: full.xpReward }
  return { id: a.id, title: a.title, description: 'Achievement unlocked!', icon: '🏆', rarity: 'common', xpReward: a.xpReward }
}

interface AchievementContextValue {
  triggerAchievements: (achievements: MinimalAchievement[]) => void
}

const AchievementContext = createContext<AchievementContextValue | null>(null)

export function useAchievement() {
  const ctx = useContext(AchievementContext)
  if (!ctx) throw new Error('useAchievement must be used within AchievementProvider')
  return ctx
}

export function useAchievementOptional() {
  return useContext(AchievementContext)
}

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<FullAchievement[]>([])
  const [current, setCurrent] = useState<FullAchievement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const showNext = useCallback((remaining: FullAchievement[]) => {
    if (remaining.length === 0) {
      setCurrent(null)
      return
    }
    const [next, ...rest] = remaining
    setCurrent(next)
    if (navigator.vibrate) navigator.vibrate([50, 100, 50])
    timerRef.current = setTimeout(() => showNext(rest), 4000)
  }, [])

  const triggerAchievements = useCallback((achievements: MinimalAchievement[]) => {
    if (achievements.length === 0) return
    const resolved = achievements.map(resolveAchievement)
    if (current) {
      setQueue(prev => [...prev, ...resolved])
      return
    }
    const [first, ...rest] = resolved
    setCurrent(first)
    if (navigator.vibrate) navigator.vibrate([50, 100, 50])
    setQueue(rest)
    timerRef.current = setTimeout(() => showNext(rest), 4000)
  }, [current, showNext])

  const handleClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (queue.length > 0) {
      const [next, ...rest] = queue
      setCurrent(next)
      setQueue(rest)
      if (navigator.vibrate) navigator.vibrate([50, 100, 50])
      timerRef.current = setTimeout(() => showNext(rest), 4000)
    } else {
      setCurrent(null)
    }
  }, [queue, showNext])

  return (
    <AchievementContext.Provider value={{ triggerAchievements }}>
      {children}
      {current && (
        <AchievementCelebration
          achievement={current}
          onClose={handleClose}
        />
      )}
    </AchievementContext.Provider>
  )
}
