'use client'

import { useMemo } from 'react'

type MoodLevel = 1 | 2 | 3 | 4 | 5 | null | undefined

const MOOD_TINTS: Record<number, string> = {
  1: 'rgba(150, 170, 200, 0.03)',
  2: 'rgba(160, 160, 170, 0.02)',
  3: 'transparent',
  4: 'rgba(200, 190, 170, 0.02)',
  5: 'rgba(220, 210, 190, 0.03)',
}

export function useMoodTint(mood: MoodLevel) {
  return useMemo(() => {
    if (!mood || mood === 3) return null
    return MOOD_TINTS[mood] || null
  }, [mood])
}
