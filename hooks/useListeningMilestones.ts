'use client'

import { useEffect, useRef, useCallback } from 'react'

const MILESTONES = [15, 30, 60] // minutes

export function useListeningMilestones(
  isPlaying: boolean,
  onMilestone: (minutes: number) => void
) {
  const elapsedRef = useRef(0) // seconds
  const firedRef = useRef<Set<number>>(new Set())
  const lastPauseRef = useRef<number>(Date.now())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const onMilestoneRef = useRef(onMilestone)
  onMilestoneRef.current = onMilestone

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isPlaying) {
      // Reset if paused for 5+ minutes
      const pauseDuration = Date.now() - lastPauseRef.current
      if (pauseDuration > 5 * 60 * 1000) {
        elapsedRef.current = 0
        firedRef.current.clear()
      }

      intervalRef.current = setInterval(() => {
        elapsedRef.current += 1
        const minutes = Math.floor(elapsedRef.current / 60)
        for (const milestone of MILESTONES) {
          if (minutes >= milestone && !firedRef.current.has(milestone)) {
            firedRef.current.add(milestone)
            onMilestoneRef.current(milestone)
          }
        }
      }, 1000)
    } else {
      cleanup()
      lastPauseRef.current = Date.now()
    }

    return cleanup
  }, [isPlaying, cleanup])
}
