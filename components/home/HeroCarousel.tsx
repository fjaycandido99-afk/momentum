'use client'

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'

interface HeroCarouselProps {
  children: ReactNode[]
  /** Auto-advance interval in ms (default 5000) */
  autoPlayMs?: number
}

export function HeroCarousel({ children, autoPlayMs = 5000 }: HeroCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const count = children.length
  const pausedUntilRef = useRef(0)
  const activeIndexRef = useRef(0)

  // Keep ref in sync for the interval callback
  activeIndexRef.current = activeIndex

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.offsetWidth)
    setActiveIndex(Math.max(0, Math.min(index, count - 1)))
  }, [count])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: index * el.offsetWidth, behavior: 'smooth' })
  }, [])

  // Pause auto-play for a duration after user interaction
  const pauseAutoPlay = useCallback((durationMs: number = 10000) => {
    pausedUntilRef.current = Date.now() + durationMs
  }, [])

  // Auto-advance with single stable interval
  useEffect(() => {
    if (count <= 1) return
    const interval = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return
      const el = scrollRef.current
      if (!el) return
      const next = (activeIndexRef.current + 1) % count
      el.scrollTo({ left: next * el.offsetWidth, behavior: 'smooth' })
    }, autoPlayMs)
    return () => clearInterval(interval)
  }, [count, autoPlayMs])

  if (count === 0) return null
  if (count === 1) return <div className="px-6 mt-4 mb-8 liquid-reveal section-fade-bg">{children[0]}</div>

  return (
    <div className="mt-4 mb-8 liquid-reveal section-fade-bg">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
        onTouchStart={() => pauseAutoPlay(10000)}
        onMouseDown={() => pauseAutoPlay(10000)}
      >
        {children.map((child, i) => (
          <div
            key={i}
            className="w-full flex-shrink-0 px-6 card-enter"
            style={{ scrollSnapAlign: 'center', animationDelay: `${i * 0.1}s` }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            onClick={() => { pauseAutoPlay(10000); scrollTo(i) }}
            className={`rounded-full transition-all duration-300 ${
              i === activeIndex
                ? 'w-5 h-1.5 bg-white/60 carousel-dot-active'
                : 'w-1.5 h-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
