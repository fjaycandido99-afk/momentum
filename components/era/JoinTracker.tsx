'use client'

import { useEffect } from 'react'
import { trackFeature } from '@/lib/analytics/track'

/**
 * Counts a visit to /join/<era>. The page is public and server-rendered, so
 * this is the only way to know a shared link was ever opened.
 *
 * Visitors usually aren't signed in, so these land as anonymous events: the
 * funnel counts them as VISITS, not people (lib/analytics/era-funnel).
 */
export function JoinTracker() {
  useEffect(() => { trackFeature('era', 'open', 'join_page') }, [])
  return null
}
