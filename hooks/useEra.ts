'use client'

import { useCallback, useEffect, useState } from 'react'
import type { EraTodayWire } from '@/lib/era/service'

export type EraToday = EraTodayWire

/**
 * The active era for the home card and the /era page.
 *
 * `loaded` separates "no era" from "not fetched yet", so home doesn't flash
 * the start prompt at someone who is on day 20.
 */
export function useEra() {
  const [era, setEra] = useState<EraToday | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/era', { cache: 'no-store' })
      const body = res.ok ? await res.json() : null
      setEra(body?.era ?? null)
    } catch {
      // Card falls back to the start prompt; nothing to surface on home.
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { era, loaded, setEra, refresh }
}
