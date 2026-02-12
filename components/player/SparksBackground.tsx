'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  brightness: number
  life: number
  maxLife: number
}

interface SparkBurst {
  x: number
  y: number
  sparks: Spark[]
  flashLife: number
}

interface SparksBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function spawnBurst(x: number, y: number): SparkBurst {
  const count = 8 + Math.floor(Math.random() * 12)
  const sparks: Spark[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 3.5
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 0.5 + Math.random() * 1.2,
      brightness: 0.5 + Math.random() * 0.5,
      life: 0,
      maxLife: 25 + Math.floor(Math.random() * 35),
    }
  })
  return { x, y, sparks, flashLife: 4 }
}

export function SparksBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: SparksBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const burstsRef = useRef<SparkBurst[]>([])
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
        if (spawnTimer > 40 + Math.random() * 80) {
          const bx = Math.random() * w
          const by = topOffsetRef.current + Math.random() * (h - topOffsetRef.current)
          burstsRef.current.push(spawnBurst(bx, by))
          spawnTimer = 0
        }

        // Pointer-triggered burst
        if (ptrActive && ptr) {
          const hasRecent = burstsRef.current.some(b => b.flashLife > 0 &&
            Math.sqrt((b.x - ptr.x) ** 2 + (b.y - ptr.y) ** 2) < 40
          )
          if (!hasRecent) {
            burstsRef.current.push(spawnBurst(ptr.x, ptr.y))
          }
        }
      }

      const activeBursts: SparkBurst[] = []
      for (const burst of burstsRef.current) {
        if (animateRef.current) {
          burst.flashLife--
        }

        // Brief flash at impact point
        if (burst.flashLife > 0) {
          const flashAlpha = (burst.flashLife / 4) * 0.5 * currentOpacity
          const flashGlow = ctx.createRadialGradient(burst.x, burst.y, 0, burst.x, burst.y, 15)
          flashGlow.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`)
          flashGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.beginPath()
          ctx.arc(burst.x, burst.y, 15, 0, Math.PI * 2)
          ctx.fillStyle = flashGlow
          ctx.fill()
        }

        // Update and draw sparks
        const aliveSparks: Spark[] = []
        for (const s of burst.sparks) {
          if (animateRef.current) {
            s.life++
            s.x += s.vx
            s.y += s.vy
            s.vy += 0.05 // gravity
            s.vx *= 0.98
          }

          if (s.life >= s.maxLife) continue
          aliveSparks.push(s)

          const lifeRatio = s.life / s.maxLife
          const fade = lifeRatio > 0.5 ? (1 - lifeRatio) / 0.5 : 1
          const alpha = s.brightness * fade * currentOpacity

          // Tiny spark trail
          if (s.life > 1) {
            const trailX = s.x - s.vx * 2
            const trailY = s.y - s.vy * 2
            const gradient = ctx.createLinearGradient(trailX, trailY, s.x, s.y)
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
            gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.4})`)
            ctx.beginPath()
            ctx.moveTo(trailX, trailY)
            ctx.lineTo(s.x, s.y)
            ctx.strokeStyle = gradient
            ctx.lineWidth = s.radius * 0.6
            ctx.lineCap = 'round'
            ctx.stroke()
          }

          // Core spark dot
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.radius * (1 - lifeRatio * 0.5), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.fill()
        }
        burst.sparks = aliveSparks

        if (aliveSparks.length > 0 || burst.flashLife > 0) {
          activeBursts.push(burst)
        }
      }
      burstsRef.current = activeBursts

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
