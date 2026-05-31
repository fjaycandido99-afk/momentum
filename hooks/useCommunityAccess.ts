'use client'

/* ============================================================================
   useCommunityAccess — single-fetch boolean for Community staging gate.

   Calls /api/social/access once, caches the result per session in
   memory + sessionStorage so subsequent components don't refire. Returns
   `null` while unknown so callers can skeleton-hide and avoid flashing
   the surface in for non-allowed users.

   Adding/removing emails from the allow-list (see lib/social/access.ts)
   takes effect on next page load — the sessionStorage cache lives only
   for the current tab.
   ============================================================================ */

import { useEffect, useState } from 'react'

const SESSION_KEY = 'voxu.community.access'

let inFlight: Promise<boolean> | null = null
let cached: boolean | null = null

async function fetchAccess(): Promise<boolean> {
  if (cached !== null) return cached
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const res = await fetch('/api/social/access')
      if (!res.ok) return false
      const data = await res.json()
      const enabled = !!data?.enabled
      cached = enabled
      try { sessionStorage.setItem(SESSION_KEY, enabled ? '1' : '0') } catch {}
      return enabled
    } catch {
      cached = false
      return false
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

/**
 * Returns:
 *   null  — still loading (don't render community surfaces yet)
 *   true  — allowed (render normally)
 *   false — disallowed (hide community surfaces)
 */
export function useCommunityAccess(): boolean | null {
  // Hydrate from sessionStorage synchronously so SSR-to-client flash
  // is minimized on subsequent navigations within the tab.
  const [enabled, setEnabled] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null
    if (cached !== null) return cached
    try {
      const v = sessionStorage.getItem(SESSION_KEY)
      if (v === '1') { cached = true; return true }
      if (v === '0') { cached = false; return false }
    } catch {}
    return null
  })

  useEffect(() => {
    if (enabled !== null) return
    let alive = true
    void fetchAccess().then(v => { if (alive) setEnabled(v) })
    return () => { alive = false }
  }, [enabled])

  return enabled
}
