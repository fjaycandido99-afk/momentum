import { useState, useEffect, useRef } from 'react'

export function useKeyboardAware() {
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0,
  )

  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    // Initialize
    setViewportHeight(vv.height)
    document.documentElement.style.setProperty(
      '--visual-viewport-height',
      `${vv.height}px`,
    )

    const onResize = () => {
      // Debounce rapid keyboard open/close (150ms settle)
      if (settleTimer.current) clearTimeout(settleTimer.current)

      settleTimer.current = setTimeout(() => {
        const fullHeight = window.innerHeight
        const vpHeight = vv.height
        const diff = fullHeight - vpHeight

        const isOpen = diff > 100
        const justOpened = isOpen && !wasOpenRef.current
        wasOpenRef.current = isOpen

        setKeyboardOpen(isOpen)
        setKeyboardHeight(isOpen ? diff : 0)
        setViewportHeight(vpHeight)

        document.documentElement.style.setProperty(
          '--keyboard-height',
          `${isOpen ? diff : 0}px`,
        )
        document.documentElement.style.setProperty(
          '--visual-viewport-height',
          `${vpHeight}px`,
        )

        // Only scroll into view when keyboard first opens, not on every resize
        if (justOpened && document.activeElement instanceof HTMLElement) {
          const el = document.activeElement
          const rect = el.getBoundingClientRect()
          // Target: place focused element 40% from top of visual viewport
          const targetY = vpHeight * 0.4
          const currentY = rect.top
          const scrollDelta = currentY - targetY

          if (Math.abs(scrollDelta) > 20) {
            window.scrollBy({ top: scrollDelta, behavior: 'smooth' })
          }
        }
      }, 150)
    }

    vv.addEventListener('resize', onResize)
    return () => {
      vv.removeEventListener('resize', onResize)
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [])

  return { keyboardOpen, keyboardHeight, viewportHeight }
}
