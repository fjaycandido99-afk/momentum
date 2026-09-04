'use client'

import { useEffect } from 'react'

let locks = 0

/**
 * Freezes whatever is behind a fullscreen overlay.
 *
 * Most screens use app-shell scrolling: the document does NOT scroll, an
 * inner container marked `data-app-shell` does. There, the lock is purely a
 * class — `modal-open` on <html>, which globals.css turns into
 * `overflow: hidden` on the container.
 *
 * The <body> half below is ONLY for screens that still scroll the document,
 * and must not run otherwise. `position: fixed` on <body> makes WKWebView
 * re-resolve the page box against the safe area and shove everything down by
 * the inset — that is what dropped Home's header ~59px the moment the Daily
 * Spark popup appeared, and left it there after dismiss. On an app-shell
 * screen it also freezes nothing: scrollY is permanently 0.
 *
 * Overlays stack (a spark over a player), so locks are counted and only the
 * last release unlocks.
 *
 * Pass `active` for an overlay that stays mounted while hidden; omit it when
 * the component itself is mounted conditionally.
 */
export function useBodyScrollLock(active: boolean = true) {
  useEffect(() => {
    if (!active) return

    locks += 1
    document.documentElement.classList.add('modal-open')

    const documentScrolls = !document.querySelector('[data-app-shell]')
    let restoreBody: (() => void) | undefined

    if (documentScrolls) {
      const scrollY = window.scrollY
      const prev = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        width: document.body.style.width,
        top: document.body.style.top,
      }
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${scrollY}px`

      restoreBody = () => {
        document.body.style.overflow = prev.overflow
        document.body.style.position = prev.position
        document.body.style.width = prev.width
        document.body.style.top = prev.top
        window.scrollTo(0, scrollY)
      }
    }

    return () => {
      restoreBody?.()
      locks = Math.max(0, locks - 1)
      if (locks === 0) document.documentElement.classList.remove('modal-open')
    }
  }, [active])
}
