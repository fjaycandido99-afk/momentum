'use client'

import { useEffect } from 'react'

let locks = 0

/**
 * Freezes whatever is behind a fullscreen overlay.
 *
 * Two things make this more than `body { overflow: hidden }`:
 *
 * 1. Most screens now use app-shell scrolling — the document does NOT scroll,
 *    an inner container marked `data-app-shell` does. The body technique below
 *    is a no-op on those screens (scrollY is permanently 0), which is how the
 *    Daily Spark popup ended up with a live, scrollable Home behind it. The
 *    `modal-open` class covers the container; see globals.css. The body half
 *    is kept for the screens that still scroll the document.
 * 2. Overlays stack — a spark over a player over a sheet. Unbalanced
 *    add/remove would let the first one to close unlock everything, so locks
 *    are counted and only the last release unlocks.
 *
 * Pass `active` for an overlay that stays mounted while hidden; omit it when
 * the component itself is mounted conditionally.
 */
export function useBodyScrollLock(active: boolean = true) {
  useEffect(() => {
    if (!active) return

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

    locks += 1
    document.documentElement.classList.add('modal-open')

    return () => {
      document.body.style.overflow = prev.overflow
      document.body.style.position = prev.position
      document.body.style.width = prev.width
      document.body.style.top = prev.top
      window.scrollTo(0, scrollY)

      locks = Math.max(0, locks - 1)
      if (locks === 0) document.documentElement.classList.remove('modal-open')
    }
  }, [active])
}
