'use client'

/**
 * A page header pinned with `position: fixed` instead of `sticky`.
 *
 * Every header in the app used `sticky top-0`, and on device they scrolled
 * away with the content — app-wide, in the Capacitor shell, while working
 * correctly in every desktop browser. `sticky` resolves against its nearest
 * scrolling ancestor and its containing block, so any ancestor that
 * establishes one (a transform, filter, will-change, contain) silently
 * turns it back into an ordinary element. WebKit enforces that more
 * strictly than Blink, which is why it only appeared natively.
 *
 * `fixed` has no such dependency — it positions against the viewport
 * whatever its ancestors do. The trade is that it leaves the document
 * flow, so content beneath would jump up by the header's height. Hence the
 * spacer.
 *
 * The spacer MEASURES the header rather than hardcoding a number. These
 * headers differ in height — padding, one or two lines, a streak badge
 * that appears at two days, a safe-area inset that varies by device — and
 * a fixed number would be wrong on some screen, on some phone, the moment
 * anyone adds a line of copy.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

// useLayoutEffect measures before paint, so there is no visible jump. It
// warns during SSR, where there is nothing to measure anyway.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

interface FixedHeaderProps {
  /** Classes for the header itself. Positioning is supplied here. */
  className?: string
  /**
   * Classes for the spacer — put the header's old margin here. A margin on
   * a fixed element does nothing, and offsetHeight excludes it, so a `mb-4`
   * left on the header would silently lose 16px of gap below it.
   */
  spacerClassName?: string
  children: ReactNode
}

export function FixedHeader({ className = '', spacerClassName = '', children }: FixedHeaderProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => setHeight(el.offsetHeight)
    measure()

    // Re-measure on anything that changes the header's box: rotation, a
    // badge appearing, dynamic type, the keyboard resizing the viewport.
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('orientationchange', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  return (
    <>
      <div ref={ref} className={`fixed top-0 left-0 right-0 ${className}`}>
        {children}
      </div>
      {/* Reserves exactly the space the fixed header vacated. Rendered as a
          sibling, never a copy of the children — duplicating them would
          duplicate buttons, canvases and their side effects. */}
      <div aria-hidden style={{ height }} className={spacerClassName} />
    </>
  )
}
