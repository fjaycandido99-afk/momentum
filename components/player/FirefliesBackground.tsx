'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface FirefliesBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
}

interface Firefly {
  x: number
  y: number
  vx: number
  vy: number
  blinkSpeed: number
  phaseOffset: number
  radius: number
}

const TOP_OFFSET = 50

function createFireflies(count: number, w: number, h: number): Firefly[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: TOP_OFFSET + Math.random() * (h - TOP_OFFSET),
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    blinkSpeed: 0.5 + Math.random() * 1.5,
    phaseOffset: Math.random() * Math.PI * 2,
    radius: 1 + Math.random() * 1.5,
  }))
}

export function FirefliesBackground({
  animate = true,
  className = '',
  pointerRef,
}: FirefliesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const firefliesRef = useRef<Firefly[]>([])
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)

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
        firefliesRef.current = createFireflies(35, rect.width, rect.height)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    if (firefliesRef.current.length === 0) {
      const rect = canvas.getBoundingClientRect()
      firefliesRef.current = createFireflies(35, rect.width, rect.height)
    }

    let currentOpacity = 0.2
    let time = 0

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) {
        time += 0.016
      }

      const flies = firefliesRef.current

      if (animateRef.current) {
        const ptr = pointerRef?.current
        const ptrActive = ptr?.active ?? false

        for (const f of flies) {
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

          if (f.x < 0 || f.x > w) f.vx *= -1
          if (f.y < TOP_OFFSET || f.y > h) f.vy *= -1
          f.x = Math.max(0, Math.min(w, f.x))
          f.y = Math.max(TOP_OFFSET, Math.min(h, f.y))
        }
      }

      for (const f of flies) {
        const blink = Math.pow(Math.sin(time * f.blinkSpeed + f.phaseOffset), 2)
        const alpha = blink * 0.8 * currentOpacity

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
