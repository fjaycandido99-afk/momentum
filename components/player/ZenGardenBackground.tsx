'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Stone {
  x: number
  y: number
  radius: number
}

interface ZenGardenBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function ZenGardenBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: ZenGardenBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)
  const topOffsetRef = useRef(topOffset)
  const stonesRef = useRef<Stone[]>([])
  const rakeProgressRef = useRef(0)
  const pointerTrailRef = useRef<{ x: number; y: number }[]>([])

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

    // Create stones
    const rect = canvas.getBoundingClientRect()
    stonesRef.current = []
    const numStones = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < numStones; i++) {
      stonesRef.current.push({
        x: rect.width * 0.2 + Math.random() * rect.width * 0.6,
        y: topOffsetRef.current + (rect.height - topOffsetRef.current) * (0.3 + Math.random() * 0.4),
        radius: 12 + Math.random() * 18,
      })
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
        time += 0.003
        rakeProgressRef.current = (rakeProgressRef.current + 0.001) % 1
      }

      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      // Track pointer trail for interactive rake marks
      if (ptrActive && ptr) {
        const trail = pointerTrailRef.current
        if (trail.length === 0 || Math.sqrt((trail[trail.length - 1].x - ptr.x) ** 2 + (trail[trail.length - 1].y - ptr.y) ** 2) > 8) {
          trail.push({ x: ptr.x, y: ptr.y })
          if (trail.length > 40) trail.shift()
        }
      }

      const alpha = 0.35 * currentOpacity

      // Draw horizontal rake lines (with wave around stones)
      const lineSpacing = 14
      const startY = topOffsetRef.current + 20
      const rakeOffset = rakeProgressRef.current * lineSpacing

      for (let ly = startY + rakeOffset; ly < h - 10; ly += lineSpacing) {
        ctx.beginPath()
        let started = false
        for (let x = -10; x <= w + 10; x += 3) {
          let y = ly

          // Wave around stones
          for (const stone of stonesRef.current) {
            const dx = x - stone.x
            const dy = ly - stone.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            const influence = stone.radius * 3

            if (dist < influence && dist > 0) {
              // Bend lines around stones in concentric arcs
              const strength = (1 - dist / influence)
              const deflect = strength * stone.radius * 1.5
              y += (dy / dist) * deflect
            }
          }

          // Subtle wave motion
          y += Math.sin(x * 0.02 + time * 2 + ly * 0.01) * 1.5

          if (!started) {
            ctx.moveTo(x, y)
            started = true
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.lineWidth = 0.6
        ctx.stroke()
      }

      // Draw concentric circles around each stone
      for (const stone of stonesRef.current) {
        const numRings = 4 + Math.floor(stone.radius / 5)
        for (let r = 0; r < numRings; r++) {
          const ringRadius = stone.radius + 8 + r * 10
          const ringAlpha = alpha * (1 - r / numRings) * 0.8

          ctx.beginPath()
          ctx.arc(stone.x, stone.y, ringRadius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha})`
          ctx.lineWidth = 0.6
          ctx.stroke()
        }

        // Stone itself
        ctx.beginPath()
        ctx.arc(stone.x, stone.y, stone.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.12 * currentOpacity})`
        ctx.fill()
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * currentOpacity})`
        ctx.lineWidth = 1
        ctx.stroke()

        // Stone highlight
        ctx.beginPath()
        ctx.arc(stone.x - stone.radius * 0.25, stone.y - stone.radius * 0.25, stone.radius * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.2 * currentOpacity})`
        ctx.fill()
      }

      // Draw pointer trail as rake marks
      const trail = pointerTrailRef.current
      if (trail.length > 2) {
        for (let t = 0; t < trail.length - 1; t++) {
          const fade = (t / trail.length)
          const trailAlpha = fade * 0.4 * currentOpacity
          ctx.beginPath()
          ctx.moveTo(trail[t].x, trail[t].y)
          ctx.lineTo(trail[t + 1].x, trail[t + 1].y)
          ctx.strokeStyle = `rgba(255, 255, 255, ${trailAlpha})`
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          ctx.stroke()
        }

        // Fade out trail over time
        if (animateRef.current && !ptrActive && trail.length > 0) {
          pointerTrailRef.current.shift()
        }
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
