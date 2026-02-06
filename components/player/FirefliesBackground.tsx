'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface FirefliesBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

interface Firefly {
  x: number
  y: number
  vx: number
  vy: number
  blinkSpeed: number
  phaseOffset: number
  radius: number
  glowRadius: number
  driftAngle: number
}

function createFireflies(count: number, w: number, h: number, topOffset: number): Firefly[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: topOffset + Math.random() * (h - topOffset),
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    blinkSpeed: 0.4 + Math.random() * 1.2,
    phaseOffset: Math.random() * Math.PI * 2,
    radius: 0.8 + Math.random() * 2,
    glowRadius: 6 + Math.random() * 10,
    driftAngle: Math.random() * Math.PI * 2,
  }))
}

export function FirefliesBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: FirefliesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const firefliesRef = useRef<Firefly[]>([])
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)
  const topOffsetRef = useRef(topOffset)

  useEffect(() => { animateRef.current = animate }, [animate])

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      if (firefliesRef.current.length === 0) {
        firefliesRef.current = createFireflies(45, rect.width, rect.height, topOffsetRef.current)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    if (firefliesRef.current.length === 0) {
      const rect = canvas.getBoundingClientRect()
      firefliesRef.current = createFireflies(45, rect.width, rect.height, topOffsetRef.current)
    }

    let currentOpacity = 0.2
    let time = 0
    let frameCount = 0

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) {
        time += 0.016
        frameCount++
      }

      const flies = firefliesRef.current

      if (animateRef.current) {
        const ptr = pointerRef?.current
        const ptrActive = ptr?.active ?? false

        for (const f of flies) {
          // Organic wandering - slowly change drift direction
          f.driftAngle += (Math.random() - 0.5) * 0.08
          f.vx += Math.cos(f.driftAngle) * 0.01
          f.vy += Math.sin(f.driftAngle) * 0.01

          // Dampen velocity for gentle float
          f.vx *= 0.98
          f.vy *= 0.98

          f.x += f.vx
          f.y += f.vy

          // Attract toward pointer
          if (ptrActive && ptr) {
            const dx = ptr.x - f.x
            const dy = ptr.y - f.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 150 && dist > 1) {
              const strength = (1 - dist / 150) * 0.3
              f.x += dx / dist * strength
              f.y += dy / dist * strength
            }
          }

          if (f.x < -10) f.x = w + 10
          if (f.x > w + 10) f.x = -10
          if (f.y < topOffsetRef.current - 10) f.y = h + 10
          if (f.y > h + 10) f.y = topOffsetRef.current - 10
        }
      }

      for (const f of flies) {
        // Smooth pulsing blink with longer bright peaks
        const raw = Math.sin(time * f.blinkSpeed + f.phaseOffset)
        const blink = Math.pow(Math.max(0, raw), 1.5)
        const alpha = blink * 0.85 * currentOpacity

        if (alpha < 0.01) continue

        // Soft glow halo
        const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.glowRadius)
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.25})`)
        glow.addColorStop(0.4, `rgba(255, 255, 255, ${alpha * 0.08})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.glowRadius, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  useEffect(() => {
    const cleanup = startAnimation()
    return cleanup
  }, [startAnimation])

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
    />
  )
}
