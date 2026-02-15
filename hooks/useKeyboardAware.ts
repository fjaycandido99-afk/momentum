import { useState, useEffect } from 'react'

export function useKeyboardAware() {
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const onResize = () => {
      const fullHeight = window.innerHeight
      const viewportHeight = vv.height
      const diff = fullHeight - viewportHeight

      const isOpen = diff > 100
      setKeyboardOpen(isOpen)
      setKeyboardHeight(isOpen ? diff : 0)
      document.documentElement.style.setProperty('--keyboard-height', `${isOpen ? diff : 0}px`)

      // Scroll focused element into view
      if (isOpen && document.activeElement instanceof HTMLElement) {
        setTimeout(() => {
          document.activeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }

    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  return { keyboardOpen, keyboardHeight }
}
