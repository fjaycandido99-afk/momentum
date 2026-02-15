import { useEffect, type RefObject } from 'react'

export function useAutoResizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  maxHeight = 300,
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Reset height so scrollHeight recalculates
    el.style.height = 'auto'

    // Respect keyboard-adjusted max
    const keyboardHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--keyboard-height') || '0',
      10,
    )
    const effectiveMax = keyboardHeight > 0 ? Math.min(maxHeight, window.innerHeight * 0.3) : maxHeight

    el.style.height = `${Math.min(el.scrollHeight, effectiveMax)}px`
    el.style.overflowY = el.scrollHeight > effectiveMax ? 'auto' : 'hidden'
  }, [ref, value, maxHeight])
}
