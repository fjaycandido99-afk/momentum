'use client'

import { useState, useEffect, useCallback, type RefObject } from 'react'

interface ScrollHeaderState {
  scrolled: boolean
  scrollY: number
}

/**
 * Tracks scroll position on a scrollable container.
 * Returns `scrolled: true` when scrollY > threshold (default 60px).
 */
export function useScrollHeader(
  scrollRef: RefObject<HTMLElement | null>,
  threshold = 60
): ScrollHeaderState {
  const [state, setState] = useState<ScrollHeaderState>({ scrolled: false, scrollY: 0 })

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const y = el.scrollTop
    setState(prev => {
      const nowScrolled = y > threshold
      if (prev.scrolled === nowScrolled && Math.abs(prev.scrollY - y) < 2) return prev
      return { scrolled: nowScrolled, scrollY: y }
    })
  }, [scrollRef, threshold])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [scrollRef, handleScroll])

  return state
}
