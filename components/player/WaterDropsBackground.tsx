'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface WaterRipple {
  x: number
  y: number
  radius: number
  maxRadius: number
  speed: number
}

interface WaterDropsBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function spawnRipple(w: number, h: number, topOffset: number): WaterRipple {
  return {
    x: Math.random() * w,
    y: topOffset + Math.random() * (h - topOffset),
    radius: 0,
    maxRadius: 50 + Math.random() * 80,
    speed: 0.4 + Math.random() * 0.5,
  }
}

export function WaterDropsBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: WaterDropsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ripplesRef = useRef<WaterRipple[]>([])
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
    for (let i = 0; i < 5; i++) {
      const r = spawnRipple(rect.width, rect.height, topOffsetRef.current)
      r.radius = Math.random() * r.maxRadius * 0.5
      ripplesRef.current.push(r)
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
        if (spawnTimer > 30 + Math.random() * 50) {
          if (ripplesRef.current.length < 20) {
            ripplesRef.current.push(spawnRipple(w, h, topOffsetRef.current))
          }
          spawnTimer = 0
        }

        // Pointer tap spawns ripple
        if (ptrActive && ptr && ripplesRef.current.length < 25) {
          const hasNearby = ripplesRef.current.some(r => {
            const dx = r.x - ptr.x
            const dy = r.y - ptr.y
            return Math.sqrt(dx * dx + dy * dy) < 20 && r.radius < 10
          })
          if (!hasNearby) {
            ripplesRef.current.push({
              x: ptr.x,
              y: ptr.y,
              radius: 0,
              maxRadius: 60 + Math.random() * 60,
              speed: 0.5 + Math.random() * 0.4,
            })
          }
        }
      }

      const activeRipples: WaterRipple[] = []
      for (const r of ripplesRef.current) {
        if (animateRef.current) {
          r.radius += r.speed
        }

        if (r.radius >= r.maxRadius) continue
        activeRipples.push(r)

        const progress = r.radius / r.maxRadius
        const fade = 1 - progress

        // Draw 2 concentric rings
        for (let ring = 0; ring < 2; ring++) {
          const ringRadius = r.radius - ring * 8
          if (ringRadius <= 0) continue

          const ringFade = fade * (1 - ring * 0.4)
          const alpha = ringFade * 0.5 * currentOpacity

          ctx.beginPath()
          ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.lineWidth = 0.6 + (1 - progress) * 0.8
          ctx.stroke()
        }

        // Small bright dot at center when ripple is young
        if (progress < 0.15) {
          const dotAlpha = (1 - progress / 0.15) * 0.7 * currentOpacity
          ctx.beginPath()
          ctx.arc(r.x, r.y, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${dotAlpha})`
          ctx.fill()
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
