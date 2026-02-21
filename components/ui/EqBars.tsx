'use client'

import { useEffect, useRef, useMemo } from 'react'

interface EqBarsProps {
  height?: number
  barWidth?: number
  gap?: number
  color?: string
  barCount?: number
  paused?: boolean
}

/** Generate deterministic speeds/phases for any bar count */
function generateBarParams(count: number) {
  const speeds: number[] = []
  const phases: number[] = []
  for (let i = 0; i < count; i++) {
    speeds.push(2.2 + (i * 1.7 % 1.5))
    phases.push((i * 0.9) % (Math.PI * 2))
  }
  return { speeds, phases }
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
  const { speeds, phases } = useMemo(() => generateBarParams(barCount), [barCount])

  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(frameRef.current)
      // Set static varied heights when paused
      const minH = Math.max(4, height * 0.2)
      for (let i = 0; i < barsRef.current.length; i++) {
        const el = barsRef.current[i]
        if (!el) continue
        const staticH = minH + (height - minH) * (0.3 + 0.4 * ((i * 0.7) % 1))
        el.style.height = `${staticH}px`
      }
      return
    }

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
  }, [paused, height, barCount, speeds, phases])

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
