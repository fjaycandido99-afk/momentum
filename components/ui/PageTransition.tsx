'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [displayedChildren, setDisplayedChildren] = useState(children)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')
  const prevPathRef = useRef(pathname)
  const reducedMotionRef = useRef(false)

  // Check prefers-reduced-motion once on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }, [])

  // When pathname changes, trigger exit -> swap -> enter
  useEffect(() => {
    if (pathname === prevPathRef.current) {
      // Same route, just update children (e.g. re-render)
      setDisplayedChildren(children)
      return
    }

    prevPathRef.current = pathname

    // Skip animation if reduced motion is preferred
    if (reducedMotionRef.current) {
      setDisplayedChildren(children)
      return
    }

    // Start exit phase
    setPhase('exit')

    const exitTimer = setTimeout(() => {
      // Swap content and start enter phase
      setDisplayedChildren(children)
      setPhase('enter')

      const enterTimer = setTimeout(() => {
        setPhase('idle')
      }, 250)

      return () => clearTimeout(enterTimer)
    }, 150)

    return () => clearTimeout(exitTimer)
  }, [pathname, children])

  const transitionClass =
    phase === 'exit'
      ? 'page-transition-exit'
      : phase === 'enter'
        ? 'page-transition-enter'
        : ''

  if (phase === 'idle' && !transitionClass) {
    return <>{displayedChildren}</>
  }

  return (
    <div
      className={transitionClass}
      style={{ willChange: phase !== 'idle' ? 'opacity, transform' : 'auto' }}
    >
      {displayedChildren}
    </div>
  )
}
