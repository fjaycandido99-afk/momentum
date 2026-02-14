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
          const path = url.pathname

          // Route deep links to the correct page
          if (path) {
            router.push(path)
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
