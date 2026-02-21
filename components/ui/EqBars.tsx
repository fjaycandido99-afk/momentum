'use client'

import { useEffect, useRef } from 'react'

interface EqBarsProps {
  height?: number
  barWidth?: number
  gap?: number
  color?: string
  barCount?: number
  paused?: boolean
}

/**
 * Animated EQ bars using requestAnimationFrame — works reliably on all
 * mobile browsers where CSS keyframe animations can fail.
 */
export function EqBars({
  height = 18,
  barWidth = 3,
  gap = 3,
  color = 'white',
  barCount = 3,
  paused = false,
}: EqBarsProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([])
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(frameRef.current)
      return
    }

    const speeds = [2.5, 3.2, 2.8]
    const phases = [0, 1.2, 0.6]
    const minH = Math.max(4, height * 0.2)

    const animate = () => {
      const t = performance.now() / 1000
      for (let i = 0; i < barsRef.current.length; i++) {
        const el = barsRef.current[i]
        if (!el) continue
        const h = minH + (height - minH) * (0.5 + 0.5 * Math.sin(t * speeds[i] + phases[i]))
        el.style.height = `${h}px`
      }
      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [paused, height])

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap, height }}>
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          ref={el => { barsRef.current[i] = el }}
          style={{
            width: barWidth,
            height: Math.max(4, height * 0.2),
            borderRadius: barWidth > 2 ? 2 : 1,
            background: color,
          }}
        />
      ))}
    </div>
  )
}

/** Smaller variant for soundscape section header */
export function SoundscapeEqBars({ color = 'rgba(255,255,255,0.75)' }: { color?: string }) {
  return <EqBars height={10} barWidth={2} gap={2} color={color} barCount={3} />
}
