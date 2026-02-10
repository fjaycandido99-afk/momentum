'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Enhanced scroll observer with staggered delays + blur-to-focus liquid reveal.
 * Uses MutationObserver to pick up dynamically rendered sections (e.g.
 * RecentlyPlayed, SavedMotivation) that appear after the initial mount.
 */
export function useSectionTransitions(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const tracked = new WeakSet<Element>()
    let nextIndex = 0

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = el.dataset.revealDelay || '0'
            el.style.animationDelay = `${delay}s`
            el.classList.add('revealed')
            io.unobserve(el)
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    )

    function observeNew() {
      container!.querySelectorAll('.liquid-reveal').forEach((el) => {
        if (!tracked.has(el) && !el.classList.contains('revealed')) {
          tracked.add(el)
          ;(el as HTMLElement).dataset.revealDelay = String(nextIndex * 0.06)
          nextIndex++
          io.observe(el)
        }
      })
    }

    // Initial scan
    observeNew()

    // Pick up sections that render after initial mount
    const mo = new MutationObserver(observeNew)
    mo.observe(container, { childList: true, subtree: true })

    return () => { io.disconnect(); mo.disconnect() }
  }, [containerRef])
}
