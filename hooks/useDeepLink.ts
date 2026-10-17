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

        const handle = (href: string) => {
          const url = new URL(href)
          // Keep the query string and hash. Dropping them silently broke
          // any deep link that carried state — a notification pointing at
          // /daily-guide?session=midday_reset landed on the page with the
          // segment lost, and picked one from the clock instead.
          const target = url.pathname + url.search + url.hash

          // An invite link (voxu.app/i/<code>) that opened the app: a full
          // load, so the server can count it and set the claim cookie here.
          if (url.pathname.startsWith('/i/')) {
            window.location.assign(`${url.pathname}?app=1`)
            return
          }

          // The widget's "Unlock with Premium".
          if (url.searchParams.get('upgrade') === '1') {
            router.push(url.pathname || '/')
            window.dispatchEvent(new CustomEvent('voxu:open-upgrade', { detail: { reason: 'widget' } }))
            return
          }
          // The widget's ▶ (voxu://app/?play=guide:<id>). Home plays a
          // ?play= link as it opens (ImmersiveHome); already open on Home,
          // it won't reopen, so it's asked directly.
          const play = url.searchParams.get('play')
          if (play?.startsWith('guide:') && window.location.pathname === '/') {
            window.dispatchEvent(new CustomEvent('voxu:play-guide', { detail: { id: play.slice('guide:'.length) } }))
            return
          }

          if (url.pathname) {
            router.push(target)
          }
        }

        const listener = await App.addListener('appUrlOpen', (event) => handle(event.url))

        // Android doesn't send appUrlOpen for the link that STARTED the app
        // (a widget tap while Voxu was closed), only for links while it's
        // open; it has to be asked for. iOS sends both, so this is Android
        // only — asking there too would open the link twice. Once per launch
        // link, so a reload of the page doesn't replay it.
        const { Capacitor } = await import('@capacitor/core')
        if (Capacitor.getPlatform() === 'android') {
          const href = (await App.getLaunchUrl())?.url
          if (href?.startsWith('voxu://')) {
            let seen = ''
            try { seen = sessionStorage.getItem('voxu.launch-url') ?? '' } catch { /* storage off */ }
            if (seen !== href) {
              try { sessionStorage.setItem('voxu.launch-url', href) } catch { /* storage off */ }
              handle(href)
            }
          }
        }

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
