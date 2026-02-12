'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Petal {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotSpeed: number
  width: number
  height: number
  brightness: number
  swayPhase: number
  swayAmount: number
}

interface FallingPetalsBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function createPetals(count: number, w: number, h: number, topOffset: number): Petal[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: topOffset + Math.random() * (h - topOffset),
    vx: (Math.random() - 0.5) * 0.3,
    vy: 0.3 + Math.random() * 0.6,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.02,
    width: 3 + Math.random() * 5,
    height: 5 + Math.random() * 7,
    brightness: 0.45 + Math.random() * 0.4,
    swayPhase: Math.random() * Math.PI * 2,
    swayAmount: 0.3 + Math.random() * 0.6,
  }))
}

export function FallingPetalsBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: FallingPetalsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const petalsRef = useRef<Petal[]>([])
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
      if (petalsRef.current.length === 0) {
        petalsRef.current = createPetals(35, rect.width, rect.height, topOffsetRef.current)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    if (petalsRef.current.length === 0) {
      const rect = canvas.getBoundingClientRect()
      petalsRef.current = createPetals(35, rect.width, rect.height, topOffsetRef.current)
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

      if (animateRef.current) time += 0.016

      const petals = petalsRef.current
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      for (const p of petals) {
        if (animateRef.current) {
          p.y += p.vy
          p.x += p.vx + Math.sin(time * 2 + p.swayPhase) * p.swayAmount * 0.3
          p.rotation += p.rotSpeed

          // Gentle wind gust
          p.vx += (Math.random() - 0.5) * 0.01
          p.vx *= 0.99

          // Magnetic attraction toward pointer
          if (ptrActive && ptr) {
            const dx = ptr.x - p.x
            const dy = ptr.y - p.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 120 && dist > 1) {
              const strength = (1 - dist / 120) * 0.25
              p.x += dx / dist * strength
              p.y += dy / dist * strength
            }
          }

          // Reset when falls below
          if (p.y > h + 15) {
            p.y = topOffsetRef.current - 10 - Math.random() * 20
            p.x = Math.random() * w
            p.vy = 0.3 + Math.random() * 0.6
          }
          if (p.x < -20) p.x = w + 20
          if (p.x > w + 20) p.x = -20
        }

        const alpha = p.brightness * currentOpacity

        // Draw soft oval petal shape
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)

        // Petal as a filled ellipse
        ctx.beginPath()
        ctx.ellipse(0, 0, p.width / 2, p.height / 2, 0, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
        ctx.fill()

        // Slightly brighter center line
        ctx.beginPath()
        ctx.ellipse(0, 0, p.width * 0.2, p.height * 0.35, 0, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`
        ctx.fill()

        ctx.restore()
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

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} />
}
