'use client'

import { useEffect, useState } from 'react'
import { isSessionType, type SessionType } from '@/lib/daily-guide/decision-tree'

/**
 * `?session=<id>` from a push notification.
 *
 * Read from the URL rather than through useSearchParams so home doesn't need
 * a Suspense boundary for it — home is the app's first paint, and wrapping it
 * to read one optional query param would be the tail wagging the dog.
 *
 * This used to be the Daily Guide page's job. That page is gone, but the
 * notifications that point at it are on people's phones right now, so home
 * honours the param and opens the flow on the card the push was about.
 */
export function useSessionParam(): SessionType | null {
  const [session, setSession] = useState<SessionType | null>(null)

  useEffect(() => {
    try {
      const value = new URLSearchParams(window.location.search).get('session')
      if (value && isSessionType(value)) setSession(value)
    } catch {
      // No param, no problem: the clock picks the session.
    }
  }, [])

  return session
}
