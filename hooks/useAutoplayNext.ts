'use client'

import { useCallback, useEffect, useState } from 'react'

const KEY = 'voxu_autoplay_next'

/**
 * "Keep playing" — whether finishing one track should roll into the next.
 *
 * One preference across guided sessions, motivation and music, because it is
 * one intention: the user has settled in and wants it to keep going. Having
 * to set it separately in three players would be three chances to give up.
 *
 * Defaults ON. Every one of these players already continued by itself when a
 * track ended — music advanced through its playlist, soundscapes looped — so
 * off would be the behaviour change, and silence at the end of a two-minute
 * breathing session is not what someone who pressed play was asking for.
 */
export function useAutoplayNext() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw !== null) setEnabled(raw === '1')
    } catch {
      // Private mode or blocked storage — the default stands.
    }
  }, [])

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      try { localStorage.setItem(KEY, next ? '1' : '0') } catch {}
      return next
    })
  }, [])

  return { enabled, toggle }
}

/** Read the preference outside React — playlist handlers live in callbacks. */
export function autoplayNextEnabled(): boolean {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === null ? true : raw === '1'
  } catch {
    return true
  }
}
