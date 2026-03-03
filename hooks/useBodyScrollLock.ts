'use client'

import { useEffect } from 'react'

/**
 * Locks body scroll while a fullscreen overlay is mounted.
 * Prevents iOS WKWebView from scrolling the page behind fixed overlays.
 */
export function useBodyScrollLock() {
  useEffect(() => {
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
    return () => {
      document.body.style.overflow = prev.overflow
      document.body.style.position = prev.position
      document.body.style.width = prev.width
      document.body.style.top = prev.top
      window.scrollTo(0, scrollY)
    }
  }, [])
}
