import { useEffect, type RefObject } from 'react'

interface AutoResizeOptions {
  maxHeight?: number
  focusMode?: boolean
}

export function useAutoResizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  options: AutoResizeOptions | number = {},
) {
  // Support legacy signature: (ref, value, maxHeight)
  const opts: AutoResizeOptions =
    typeof options === 'number' ? { maxHeight: options } : options
  const { maxHeight = 300, focusMode = false } = opts

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // In focus mode, let CSS flex handle the height
    if (focusMode) {
      el.style.height = ''
      el.style.overflowY = 'auto'
      return
    }

    // Preserve scroll position during resize
    const prevScrollTop = el.scrollTop

    // Reset height so scrollHeight recalculates
    el.style.height = 'auto'

    // Respect keyboard-adjusted max (50% of viewport when keyboard open)
    const keyboardHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--keyboard-height') || '0',
      10,
    )
    const effectiveMax =
      keyboardHeight > 0
        ? Math.min(maxHeight, window.innerHeight * 0.5)
        : maxHeight

    el.style.height = `${Math.min(el.scrollHeight, effectiveMax)}px`
    el.style.overflowY = el.scrollHeight > effectiveMax ? 'auto' : 'hidden'

    // Restore scroll position
    el.scrollTop = prevScrollTop
  }, [ref, value, maxHeight, focusMode])
}
