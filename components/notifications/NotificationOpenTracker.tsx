'use client'

import { useEffect } from 'react'
import { trackFeature } from '@/lib/analytics/track'

/**
 * Records that a web push was opened.
 *
 * The service worker adds `?n=<type>` to the URL it opens (public/sw.js);
 * this reads it once, counts it, and takes it back out of the address bar so
 * a reload or a shared link can't count a second open. The native app needs
 * none of this — it has the payload in the tap handler (useNativePush).
 */
export function NotificationOpenTracker() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const type = url.searchParams.get('n')
      if (!type) return
      trackFeature('notification', 'open', type.slice(0, 40))
      url.searchParams.delete('n')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    } catch {
      // A malformed URL is not worth an error on every page load.
    }
  }, [])
  return null
}
