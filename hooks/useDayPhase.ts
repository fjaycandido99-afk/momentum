'use client'

import { useEffect, useState } from 'react'
import { dayPhase, type DayPhase } from '@/lib/home/time-of-day'

/**
 * The device clock's phase of the day, re-read every few minutes so an app
 * left open across 8pm turns to night by itself. null until mounted, so the
 * server and the first client render agree (no hydration mismatch) — the
 * backdrop simply fades in a beat after the page.
 *
 * A local timer, no network: nothing here multiplies by user count.
 */
export function useDayPhase(): DayPhase | null {
  const [phase, setPhase] = useState<DayPhase | null>(null)
  useEffect(() => {
    const read = () => setPhase(dayPhase(new Date().getHours()))
    read()
    const t = setInterval(read, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])
  return phase
}
