'use client'

import { useRef, useState, useCallback, type ReactNode } from 'react'

interface SwipeNavigatorProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  enabled?: boolean
}

export function SwipeNavigator({
  children,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: SwipeNavigatorProps) {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const [swiping, setSwiping] = useState(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setSwiping(false)
  }, [enabled])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || touchStartX.current === null || touchStartY.current === null) return

    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    const minSwipeDistance = 50

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX < 0) {
        onSwipeLeft?.()
      } else {
        onSwipeRight?.()
      }
    }

    touchStartX.current = null
    touchStartY.current = null
    setSwiping(false)
  }, [enabled, onSwipeLeft, onSwipeRight])

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full"
    >
      {children}
    </div>
  )
}
