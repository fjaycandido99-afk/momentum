'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface NebulaCloud {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  phase: number
  pulseSpeed: number
  layer: number // 0=back, 1=mid, 2=front
}

interface NebulaDust {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  brightness: number
  twinkleSpeed: number
  phase: number
}

interface NebulaBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function createClouds(count: number, w: number, h: number): NebulaCloud[] {
  return Array.from({ length: count }, (_, i) => {
    const layer = i < 3 ? 0 : i < 6 ? 1 : 2
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * (0.08 + layer * 0.05),
      vy: (Math.random() - 0.5) * (0.05 + layer * 0.03),
      radius: layer === 0 ? 120 + Math.random() * 200
            : layer === 1 ? 80 + Math.random() * 140
            : 50 + Math.random() * 100,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.2 + Math.random() * 0.4,
      layer,
    }
  })
}

function createDust(count: number, w: number, h: number, topOffset: number): NebulaDust[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: topOffset + Math.random() * (h - topOffset),
    vx: (Math.random() - 0.5) * 0.06,
    vy: (Math.random() - 0.5) * 0.06,
    radius: 0.5 + Math.random() * 2,
    brightness: 0.3 + Math.random() * 0.7,
    twinkleSpeed: 0.3 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
  }))
}

export function NebulaBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: NebulaBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cloudsRef = useRef<NebulaCloud[]>([])
  const dustRef = useRef<NebulaDust[]>([])
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
      if (cloudsRef.current.length === 0) {
        cloudsRef.current = createClouds(9, rect.width, rect.height)
        dustRef.current = createDust(70, rect.width, rect.height, topOffsetRef.current)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    if (cloudsRef.current.length === 0) {
      const rect = canvas.getBoundingClientRect()
      cloudsRef.current = createClouds(9, rect.width, rect.height)
      dustRef.current = createDust(70, rect.width, rect.height, topOffsetRef.current)
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

      const clouds = cloudsRef.current
      const dust = dustRef.current
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      // Nebula clouds - draw by layer for depth
      for (let layer = 0; layer <= 2; layer++) {
        for (const c of clouds) {
          if (c.layer !== layer) continue

          if (animateRef.current) {
            c.x += c.vx
            c.y += c.vy
            if (c.x < -c.radius) c.x = w + c.radius
            if (c.x > w + c.radius) c.x = -c.radius
            if (c.y < -c.radius) c.y = h + c.radius
            if (c.y > h + c.radius) c.y = -c.radius
          }

          const pulse = 0.6 + 0.4 * Math.sin(time * c.pulseSpeed + c.phase)
          const layerAlpha = layer === 0 ? 0.08 : layer === 1 ? 0.1 : 0.12
          const alpha = layerAlpha * pulse * currentOpacity

          // Multi-stop gradient for richer cloud look
          const gradient = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius)
          gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 1.8})`)
          gradient.addColorStop(0.25, `rgba(245, 245, 250, ${alpha * 1.2})`)
          gradient.addColorStop(0.5, `rgba(230, 230, 240, ${alpha * 0.6})`)
          gradient.addColorStop(0.8, `rgba(210, 210, 220, ${alpha * 0.2})`)
          gradient.addColorStop(1, 'rgba(200, 200, 210, 0)')

          ctx.beginPath()
          ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }
      }

      // Stardust particles
      for (const d of dust) {
        if (animateRef.current) {
          d.x += d.vx
          d.y += d.vy

          // Pointer attraction
          if (ptrActive && ptr) {
            const dx = ptr.x - d.x
            const dy = ptr.y - d.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 120 && dist > 1) {
              const strength = (1 - dist / 120) * 0.3
              d.x += dx / dist * strength
              d.y += dy / dist * strength
            }
          }

          if (d.x < 0) d.x = w
          if (d.x > w) d.x = 0
          if (d.y < topOffsetRef.current) d.y = h
          if (d.y > h) d.y = topOffsetRef.current
        }

        const twinkle = 0.3 + 0.7 * Math.pow(Math.sin(time * d.twinkleSpeed + d.phase), 2)
        const alpha = d.brightness * twinkle * currentOpacity

        if (alpha < 0.02) continue

        // Subtle glow for brighter dust
        if (d.radius > 1 && alpha > 0.15) {
          const glowRadius = d.radius * 4
          const glow = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, glowRadius)
          glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.15})`)
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.beginPath()
          ctx.arc(d.x, d.y, glowRadius, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2)
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
