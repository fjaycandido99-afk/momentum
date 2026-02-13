'use client'

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import type { MindsetId } from '@/lib/mindset/types'

type M = Exclude<MindsetId, 'scholar'>

const THEMED_PARTICLES: Record<M, { emoji: string; count: number }> = {
  stoic: { emoji: '⚡', count: 5 },
  existentialist: { emoji: '✦', count: 6 },
  cynic: { emoji: '🔥', count: 5 },
  hedonist: { emoji: '🌸', count: 6 },
  samurai: { emoji: '🌸', count: 7 },
}

interface PullToRefreshProps {
  mindsetId: M
  onRefresh: () => Promise<void> | void
  children: ReactNode
}

export function PullToRefresh({ mindsetId, onRefresh, children }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const threshold = 80

  const particles = THEMED_PARTICLES[mindsetId]

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = containerRef.current
    if (!container || container.scrollTop > 5) return
    startYRef.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!startYRef.current || refreshing) return
    const diff = e.touches[0].clientY - startYRef.current
    if (diff > 0) {
      // Dampen the pull — feels more natural
      setPullDistance(Math.min(diff * 0.45, 120))
    }
  }, [refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true)
      setShowParticles(true)
      await onRefresh()
      // Keep particles visible briefly
      setTimeout(() => {
        setShowParticles(false)
        setRefreshing(false)
        setPullDistance(0)
      }, 600)
    } else {
      setPullDistance(0)
    }
    startYRef.current = 0
  }, [pullDistance, refreshing, onRefresh, threshold])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd)

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const progress = Math.min(pullDistance / threshold, 1)
  const pulling = pullDistance > 10

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      {pulling && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-20 pointer-events-none overflow-hidden"
          style={{ height: pullDistance }}
        >
          {/* Themed particles burst */}
          {showParticles ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {Array.from({ length: particles.count }).map((_, i) => {
                const angle = (360 / particles.count) * i
                const rad = (angle * Math.PI) / 180
                const dist = 30 + Math.random() * 20
                return (
                  <span
                    key={i}
                    className="absolute text-base animate-fade-in"
                    style={{
                      transform: `translate(${Math.cos(rad) * dist}px, ${Math.sin(rad) * dist}px)`,
                      opacity: 0,
                      animation: `fade-in-up 0.4s ease-out ${i * 0.06}s both`,
                    }}
                  >
                    {particles.emoji}
                  </span>
                )
              })}
            </div>
          ) : (
            <div
              className="transition-transform duration-150"
              style={{
                transform: `rotate(${progress * 360}deg) scale(${0.5 + progress * 0.5})`,
                opacity: progress,
              }}
            >
              <span className="text-xl">{particles.emoji}</span>
            </div>
          )}
        </div>
      )}

      {/* Content with pull offset */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: pulling ? `translateY(${pullDistance}px)` : undefined,
          transition: !pulling ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
