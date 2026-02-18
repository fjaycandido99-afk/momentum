'use client'

import { useMoodTint } from '@/hooks/useMoodTint'

interface MoodTintOverlayProps {
  mood: 1 | 2 | 3 | 4 | 5 | null | undefined
}

export function MoodTintOverlay({ mood }: MoodTintOverlayProps) {
  const tint = useMoodTint(mood)
  if (!tint) return null

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[1] transition-colors duration-[2000ms]"
      style={{ backgroundColor: tint }}
    />
  )
}
