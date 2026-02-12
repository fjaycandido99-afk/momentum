'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Bubble {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  wobblePhase: number
  wobbleSpeed: number
  brightness: number
  shimmerPhase: number
}

interface BubblesBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function spawnBubble(w: number, h: number): Bubble {
  return {
    x: Math.random() * w,
    y: h + 10 + Math.random() * 30,
    vx: (Math.random() - 0.5) * 0.2,
    vy: -(0.3 + Math.random() * 0.6),
    radius: 5 + Math.random() * 18,
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.015 + Math.random() * 0.025,
    brightness: 0.4 + Math.random() * 0.4,
    shimmerPhase: Math.random() * Math.PI * 2,
  }
}

export function BubblesBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: BubblesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bubblesRef = useRef<Bubble[]>([])
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
    }
    resize()
    window.addEventListener('resize', resize)

    let currentOpacity = 0.2
    let spawnTimer = 0

    // Seed initial bubbles
    const rect = canvas.getBoundingClientRect()
    for (let i = 0; i < 15; i++) {
      const b = spawnBubble(rect.width, rect.height)
      b.y = topOffsetRef.current + Math.random() * (rect.height - topOffsetRef.current)
      bubblesRef.current.push(b)
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      if (animateRef.current) {
        spawnTimer++
        if (spawnTimer > 15 + Math.random() * 25) {
          if (bubblesRef.current.length < 30) {
            bubblesRef.current.push(spawnBubble(w, h))
          }
          spawnTimer = 0
        }
      }

      const alive: Bubble[] = []
      for (const b of bubblesRef.current) {
        if (animateRef.current) {
          b.wobblePhase += b.wobbleSpeed
          b.shimmerPhase += 0.03

          b.y += b.vy
          b.x += b.vx + Math.sin(b.wobblePhase) * 0.4

          // Slight size pulse
          // Pointer pushes bubbles away gently
          if (ptrActive && ptr) {
            const dx = b.x - ptr.x
            const dy = b.y - ptr.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 80 && dist > 1) {
              const push = (1 - dist / 80) * 0.4
              b.x += (dx / dist) * push
              b.y += (dy / dist) * push
            }
          }
        }

        // Remove if above top
        if (b.y < topOffsetRef.current - b.radius * 2 - 20) continue
        alive.push(b)

        const pulseRadius = b.radius + Math.sin(b.wobblePhase * 1.5) * b.radius * 0.05
        const alpha = b.brightness * currentOpacity

        // Outer ring (bubble edge)
        ctx.beginPath()
        ctx.arc(b.x, b.y, pulseRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
        ctx.lineWidth = 0.8 + pulseRadius * 0.03
        ctx.stroke()

        // Subtle inner fill
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.04})`
        ctx.fill()

        // Shimmer highlight — moves around the bubble edge
        const shimmerAngle = b.shimmerPhase
        const highlightX = b.x + Math.cos(shimmerAngle) * pulseRadius * 0.5
        const highlightY = b.y + Math.sin(shimmerAngle) * pulseRadius * 0.5
        const highlightR = pulseRadius * 0.3
        const shimmerGlow = ctx.createRadialGradient(highlightX, highlightY, 0, highlightX, highlightY, highlightR)
        shimmerGlow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`)
        shimmerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(highlightX, highlightY, highlightR, 0, Math.PI * 2)
        ctx.fillStyle = shimmerGlow
        ctx.fill()

        // Top-left specular highlight
        const specX = b.x - pulseRadius * 0.3
        const specY = b.y - pulseRadius * 0.3
        const specR = pulseRadius * 0.2
        ctx.beginPath()
        ctx.arc(specX, specY, specR, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.45})`
        ctx.fill()

        // Outer glow halo
        const haloGlow = ctx.createRadialGradient(b.x, b.y, pulseRadius, b.x, b.y, pulseRadius * 1.6)
        haloGlow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.1})`)
        haloGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(b.x, b.y, pulseRadius * 1.6, 0, Math.PI * 2)
        ctx.fillStyle = haloGlow
        ctx.fill()
      }
      bubblesRef.current = alive

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
