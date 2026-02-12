'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface SandParticle {
  x: number
  y: number
  vy: number
  vx: number
  radius: number
  brightness: number
  trail: number
}

interface FallingSandBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function createParticles(count: number, w: number, h: number, topOffset: number): SandParticle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: topOffset + Math.random() * (h - topOffset),
    vy: 0.3 + Math.random() * 0.8,
    vx: (Math.random() - 0.5) * 0.3,
    radius: 0.6 + Math.random() * 1.2,
    brightness: 0.5 + Math.random() * 0.4,
    trail: 8 + Math.random() * 16,
  }))
}

export function FallingSandBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: FallingSandBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<SandParticle[]>([])
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
      if (particlesRef.current.length === 0) {
        particlesRef.current = createParticles(80, rect.width, rect.height, topOffsetRef.current)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    if (particlesRef.current.length === 0) {
      const rect = canvas.getBoundingClientRect()
      particlesRef.current = createParticles(80, rect.width, rect.height, topOffsetRef.current)
    }

    let currentOpacity = 0.2

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      const particles = particlesRef.current
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      if (animateRef.current) {
        for (const p of particles) {
          p.y += p.vy
          p.x += p.vx

          // Gentle horizontal drift oscillation
          p.vx += (Math.random() - 0.5) * 0.02
          p.vx *= 0.99

          // Magnetic attraction toward pointer
          if (ptrActive && ptr) {
            const dx = ptr.x - p.x
            const dy = ptr.y - p.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 120 && dist > 1) {
              const strength = (1 - dist / 120) * 0.3
              p.x += dx / dist * strength
              p.y += dy / dist * strength
            }
          }

          // Reset when particle falls below
          if (p.y > h + 10) {
            p.y = topOffsetRef.current - 5
            p.x = Math.random() * w
            p.vy = 0.3 + Math.random() * 0.8
            p.vx = (Math.random() - 0.5) * 0.3
          }
          if (p.x < -10) p.x = w + 10
          if (p.x > w + 10) p.x = -10
        }
      }

      for (const p of particles) {
        const alpha = p.brightness * currentOpacity

        // Subtle trail above particle
        const gradient = ctx.createLinearGradient(p.x, p.y - p.trail, p.x, p.y)
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
        gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.3})`)
        ctx.beginPath()
        ctx.moveTo(p.x, p.y - p.trail)
        ctx.lineTo(p.x, p.y)
        ctx.strokeStyle = gradient
        ctx.lineWidth = p.radius * 0.8
        ctx.lineCap = 'round'
        ctx.stroke()

        // Core dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
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

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} />
}
