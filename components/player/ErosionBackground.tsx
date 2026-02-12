'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface ErosionParticle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  brightness: number
  life: number
  maxLife: number
}

interface ErosionShape {
  cx: number
  cy: number
  radius: number
  particles: ErosionParticle[]
  spawnTimer: number
  life: number
  maxLife: number
}

interface ErosionBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function spawnShape(w: number, h: number, topOffset: number, fromPointer?: { x: number; y: number }): ErosionShape {
  return {
    cx: fromPointer?.x ?? Math.random() * w,
    cy: fromPointer?.y ?? (topOffset + Math.random() * (h - topOffset)),
    radius: 20 + Math.random() * 35,
    particles: [],
    spawnTimer: 0,
    life: 0,
    maxLife: 350 + Math.random() * 200,
  }
}

export function ErosionBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: ErosionBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const shapesRef = useRef<ErosionShape[]>([])
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
    let shapeTimer = 0

    // Seed initial shapes
    const rect = canvas.getBoundingClientRect()
    for (let i = 0; i < 3; i++) {
      const s = spawnShape(rect.width, rect.height, topOffsetRef.current)
      s.life = Math.random() * 50
      shapesRef.current.push(s)
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
        shapeTimer++
        if (shapeTimer > 100 + Math.random() * 150) {
          if (shapesRef.current.length < 6) {
            shapesRef.current.push(spawnShape(w, h, topOffsetRef.current))
          }
          shapeTimer = 0
        }

        // Pointer-triggered shape
        if (ptrActive && ptr && shapesRef.current.length < 8) {
          const hasNearby = shapesRef.current.some(s =>
            Math.sqrt((s.cx - ptr.x) ** 2 + (s.cy - ptr.y) ** 2) < 50 && s.life < 30
          )
          if (!hasNearby) {
            shapesRef.current.push(spawnShape(w, h, topOffsetRef.current, { x: ptr.x, y: ptr.y }))
          }
        }
      }

      const activeShapes: ErosionShape[] = []
      for (const shape of shapesRef.current) {
        if (animateRef.current) {
          shape.life++
          shape.spawnTimer++

          const erodeProgress = Math.min(1, shape.life / (shape.maxLife * 0.7))

          // Spawn break-away particles
          if (shape.spawnTimer > 2 + Math.random() * 4 && shape.life < shape.maxLife * 0.8) {
            const angle = Math.random() * Math.PI * 2
            const r = shape.radius * (1 - erodeProgress * 0.5)
            const px = shape.cx + Math.cos(angle) * r
            const py = shape.cy + Math.sin(angle) * r
            shape.particles.push({
              x: px,
              y: py,
              vx: Math.cos(angle) * (0.3 + Math.random() * 0.8),
              vy: Math.sin(angle) * (0.3 + Math.random() * 0.5) + 0.2,
              radius: 0.5 + Math.random() * 1.2,
              brightness: 0.5 + Math.random() * 0.4,
              life: 0,
              maxLife: 80 + Math.random() * 80,
            })
            shape.spawnTimer = 0
          }

          // Update particles
          const aliveParticles: ErosionParticle[] = []
          for (const p of shape.particles) {
            p.life++
            p.x += p.vx
            p.y += p.vy
            p.vy += 0.005 // slight gravity
            p.vx *= 0.995

            if (p.life < p.maxLife) aliveParticles.push(p)
          }
          shape.particles = aliveParticles
        }

        if (shape.life >= shape.maxLife && shape.particles.length === 0) continue
        activeShapes.push(shape)

        const erodeProgress = Math.min(1, shape.life / (shape.maxLife * 0.7))
        const shapeFade = shape.life > shape.maxLife * 0.7
          ? 1 - (shape.life - shape.maxLife * 0.7) / (shape.maxLife * 0.3)
          : 1

        // Draw eroding circle outline
        if (shapeFade > 0) {
          const currentRadius = shape.radius * (1 - erodeProgress * 0.6)
          if (currentRadius > 2) {
            const alpha = 0.45 * shapeFade * currentOpacity

            // Draw as dashed/fragmented circle
            const segments = 20
            for (let i = 0; i < segments; i++) {
              if (Math.random() > (1 - erodeProgress * 0.7)) continue
              const a1 = (i / segments) * Math.PI * 2
              const a2 = ((i + 0.7) / segments) * Math.PI * 2
              ctx.beginPath()
              ctx.arc(shape.cx, shape.cy, currentRadius, a1, a2)
              ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
              ctx.lineWidth = 0.8
              ctx.stroke()
            }
          }
        }

        // Draw particles
        for (const p of shape.particles) {
          const pFade = p.life < 5 ? p.life / 5 : p.life > p.maxLife * 0.6
            ? (1 - (p.life - p.maxLife * 0.6) / (p.maxLife * 0.4))
            : 1
          const alpha = p.brightness * pFade * currentOpacity

          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.fill()
        }
      }
      shapesRef.current = activeShapes

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
