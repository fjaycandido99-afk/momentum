'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Handles deep links from native app (Capacitor App plugin).
 * Listens for `appUrlOpen` events and navigates accordingly.
 */
export function useDeepLink() {
  const router = useRouter()

  useEffect(() => {
    let cleanup: (() => void) | null = null

    async function setupDeepLinks() {
      try {
        // Dynamic import — only loads on native platforms
        const { App } = await import('@capacitor/app')

        const listener = await App.addListener('appUrlOpen', (event) => {
          const url = new URL(event.url)
          // Keep the query string and hash. Dropping them silently broke
          // any deep link that carried state — a notification pointing at
          // /daily-guide?session=midday_reset landed on the page with the
          // segment lost, and picked one from the clock instead.
          const target = url.pathname + url.search + url.hash

          if (url.pathname) {
            router.push(target)
          }
        })

        cleanup = () => {
          listener.remove()
        }
      } catch {
        // Not running in Capacitor — no-op on web
      }
    }

    setupDeepLinks()

    return () => {
      cleanup?.()
    }
  }, [router])
}
