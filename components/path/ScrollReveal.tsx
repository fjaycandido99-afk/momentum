'use client'

import { useEffect, useRef, type ReactNode } from 'react'

type Variant = 'fade-up' | 'slide-left' | 'slide-right' | 'scale-up'

interface ScrollRevealProps {
  children: ReactNode
  variant?: Variant
  delay?: number
  className?: string
}

export function ScrollReveal({
  children,
  variant = 'fade-up',
  delay = 0,
  className = '',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Apply delay then reveal
          setTimeout(() => {
            el.classList.add('scroll-reveal--visible')
          }, delay * 1000)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${className}`}
      data-variant={variant !== 'fade-up' ? variant : undefined}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  )
}
