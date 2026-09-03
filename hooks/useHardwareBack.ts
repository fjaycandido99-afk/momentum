'use client'

import { useEffect } from 'react'

/**
 * Android's hardware/gesture back button.
 *
 * Capacitor does NOT wire this to the webview's history by default — an
 * app with no `backButton` listener either does nothing or closes
 * outright, which is why back "wasn't working on the phone". Nothing in
 * this app listened for it.
 *
 * Behaviour: go back through in-app history while there is any; at the
 * root, minimise rather than exit. Closing the app on a stray back press
 * loses whatever the user was in the middle of, and Android users expect
 * minimise from a root screen anyway.
 *
 * iOS has no hardware back button, so this listener simply never fires
 * there — the swipe gesture is handled by the webview itself.
 */
export function useHardwareBack(): void {
  useEffect(() => {
    let cleanup: (() => void) | null = null

    async function setup() {
      try {
        const { App } = await import('@capacitor/app')

        const listener = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack || window.history.length > 1) {
            window.history.back()
          } else {
            void App.minimizeApp()
          }
        })

        cleanup = () => { listener.remove() }
      } catch {
        // Web, or the plugin is unavailable — the browser's own back works.
      }
    }

    void setup()
    return () => { cleanup?.() }
  }, [])
}
