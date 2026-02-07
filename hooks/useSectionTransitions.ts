'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Enhanced scroll observer with staggered delays + blur-to-focus liquid reveal.
 * Replaces `scroll-reveal` with `liquid-reveal` for smoother entry.
 */
export function useSectionTransitions(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = el.dataset.revealDelay || '0'
            el.style.animationDelay = `${delay}s`
            el.classList.add('revealed')
            observer.unobserve(el)
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    )

    const elements = container.querySelectorAll('.liquid-reveal')
    elements.forEach((el, i) => {
      ;(el as HTMLElement).dataset.revealDelay = String(i * 0.06)
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [containerRef])
}
