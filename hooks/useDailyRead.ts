'use client'

import { useCallback, useEffect, useState } from 'react'

export interface DailyReadToday {
  show: boolean
  item: { id: string; text: string } | null
  scale: readonly { score: number; label: string }[]
  answered: number
  needed: number
  answeredToday: boolean
}

/**
 * Powers the home hero card.
 *
 * Home decides whether to mount the slide at all, so this has to be a hook
 * rather than state inside the card — a card that renders null after its own
 * fetch would still occupy a slot in the carousel and put a blank page in the
 * dots.
 */
export function useDailyRead() {
  const [data, setData] = useState<DailyReadToday | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/assessment/today')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { /* card simply doesn't appear */ })
    return () => { cancelled = true }
  }, [])

  /** Optimistically fold the answer in so the card updates on tap. */
  const recordLocally = useCallback((answered: number) => {
    setData(prev => (prev ? { ...prev, answered, answeredToday: true, item: null } : prev))
  }, [])

  return { data, recordLocally }
}
