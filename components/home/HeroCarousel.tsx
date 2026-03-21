'use client'

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { FeatureHint } from '@/components/ui/FeatureHint'

interface HeroCarouselProps {
  children: ReactNode[]
  /** Auto-advance interval in ms (default 6000) */
  autoPlayMs?: number
}

export function HeroCarousel({ children, autoPlayMs = 6000 }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const count = children.length
  const pausedUntilRef = useRef(0)
  const activeIndexRef = useRef(0)

  activeIndexRef.current = activeIndex

  const goTo = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  // Pause auto-play when user interacts
  const pauseAutoPlay = useCallback((durationMs: number = 15000) => {
    pausedUntilRef.current = Date.now() + durationMs
  }, [])

  // Auto-advance
  useEffect(() => {
    if (count <= 1) return
    const interval = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return
      setActiveIndex(prev => (prev + 1) % count)
    }, autoPlayMs)
    return () => clearInterval(interval)
  }, [count, autoPlayMs])

  if (count === 0) return null
  if (count === 1) return <div className="px-6 mt-4 mb-8 liquid-reveal section-fade-bg">{children[0]}</div>

  return (
    <div className="mt-4 mb-8 liquid-reveal section-fade-bg">
      {/* Slideshow container — renders all slides stacked, only active is visible */}
      <div
        className="relative px-6"
        onTouchStart={() => pauseAutoPlay(15000)}
        onClick={() => pauseAutoPlay(15000)}
        onFocus={() => pauseAutoPlay(30000)}
      >
        {children.map((child, i) => (
          <div
            key={i}
            className={`transition-all duration-500 ease-in-out ${
              i === activeIndex
                ? 'opacity-100 relative'
                : 'opacity-0 absolute inset-0 px-6 pointer-events-none'
            }`}
            aria-hidden={i !== activeIndex}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-0 mt-3">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => { pauseAutoPlay(15000); goTo(i) }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <span className={`block rounded-full transition-all duration-300 ${
              i === activeIndex
                ? 'w-5 h-1.5 bg-white/60 carousel-dot-active'
                : 'w-1.5 h-1.5 bg-white/20'
            }`} />
          </button>
        ))}
      </div>
      <div className="px-6"><FeatureHint id="home-hero-swipe" text="Tap dots to switch slides" mode="once" /></div>
    </div>
  )
}
