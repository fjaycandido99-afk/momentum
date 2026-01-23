'use client'

import { useMemo } from 'react'

interface RainEffectProps {
  intensity?: 'light' | 'medium' | 'heavy'
  showLightning?: boolean
  className?: string
}

export function RainEffect({
  intensity = 'medium',
  showLightning = false,
  className = ''
}: RainEffectProps) {
  // Generate rain drops based on intensity
  const rainDrops = useMemo(() => {
    const counts = {
      light: { slow: 30, fast: 15 },
      medium: { slow: 50, fast: 30 },
      heavy: { slow: 80, fast: 50 },
    }

    const { slow, fast } = counts[intensity]
    const drops: Array<{
      id: number
      type: 'slow' | 'fast'
      left: number
      delay: number
      duration: number
    }> = []

    // Slow rain drops
    for (let i = 0; i < slow; i++) {
      drops.push({
        id: i,
        type: 'slow',
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 1.5 + Math.random() * 1,
      })
    }

    // Fast rain drops
    for (let i = 0; i < fast; i++) {
      drops.push({
        id: slow + i,
        type: 'fast',
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 0.8 + Math.random() * 0.5,
      })
    }

    return drops
  }, [intensity])

  return (
    <div className={`rain-container ${className}`}>
      {rainDrops.map((drop) => (
        <div
          key={drop.id}
          className={drop.type === 'slow' ? 'rain-drop' : 'rain-drop-fast'}
          style={{
            left: `${drop.left}%`,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
          }}
        />
      ))}
      {showLightning && <div className="lightning-flash" />}
    </div>
  )
}
