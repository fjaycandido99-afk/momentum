'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  speed: number
  life: number
}

interface StoneRipplesBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function spawnRipple(w: number, h: number, topOffset: number): Ripple {
  return {
    x: Math.random() * w,
    y: topOffset + Math.random() * (h - topOffset),
    radius: 0,
    maxRadius: 80 + Math.random() * 120,
    speed: 0.3 + Math.random() * 0.4,
    life: 0,
  }
}

export function StoneRipplesBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: StoneRipplesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ripplesRef = useRef<Ripple[]>([])
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

    // Seed initial ripples
    const rect = canvas.getBoundingClientRect()
    for (let i = 0; i < 4; i++) {
      const r = spawnRipple(rect.width, rect.height, topOffsetRef.current)
      r.radius = Math.random() * r.maxRadius * 0.6
      r.life = r.radius / r.speed
      ripplesRef.current.push(r)
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) {
        spawnTimer++
        // Spawn new ripples periodically
        if (spawnTimer > 80 + Math.random() * 100) {
          ripplesRef.current.push(spawnRipple(w, h, topOffsetRef.current))
          spawnTimer = 0
        }

        // Spawn ripple on pointer tap
        const ptr = pointerRef?.current
        if (ptr?.active) {
          const hasNearby = ripplesRef.current.some(r => {
            const dx = r.x - ptr.x
            const dy = r.y - ptr.y
            return Math.sqrt(dx * dx + dy * dy) < 30 && r.radius < 20
          })
          if (!hasNearby && ripplesRef.current.length < 15) {
            ripplesRef.current.push({
              x: ptr.x,
              y: ptr.y,
              radius: 0,
              maxRadius: 100 + Math.random() * 80,
              speed: 0.4 + Math.random() * 0.3,
              life: 0,
            })
          }
        }
      }

      // Draw and update ripples
      const activeRipples: Ripple[] = []
      for (const r of ripplesRef.current) {
        if (animateRef.current) {
          r.radius += r.speed
          r.life++
        }

        if (r.radius >= r.maxRadius) continue
        activeRipples.push(r)

        const progress = r.radius / r.maxRadius
        const fade = 1 - progress

        // Draw 3 concentric rings per ripple
        for (let ring = 0; ring < 3; ring++) {
          const ringRadius = r.radius - ring * 12
          if (ringRadius <= 0) continue
          const ringFade = fade * (1 - ring * 0.3)
          const alpha = ringFade * 0.5 * currentOpacity

          ctx.beginPath()
          ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.lineWidth = 0.8 + (1 - progress) * 0.6
          ctx.stroke()
        }
      }
      ripplesRef.current = activeRipples

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
