'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Ember {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  brightness: number
  glowRadius: number
  sway: number
  swaySpeed: number
  phase: number
  life: number
  maxLife: number
}

interface EmbersBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function spawnEmber(w: number, h: number): Ember {
  return {
    x: Math.random() * w,
    y: h + 5 + Math.random() * 20,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -(0.4 + Math.random() * 0.8),
    radius: 0.8 + Math.random() * 1.8,
    brightness: 0.6 + Math.random() * 0.4,
    glowRadius: 4 + Math.random() * 8,
    sway: 20 + Math.random() * 30,
    swaySpeed: 0.01 + Math.random() * 0.02,
    phase: Math.random() * Math.PI * 2,
    life: 0,
    maxLife: 200 + Math.random() * 200,
  }
}

export function EmbersBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: EmbersBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const embersRef = useRef<Ember[]>([])
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

    // Seed initial embers
    const rect = canvas.getBoundingClientRect()
    for (let i = 0; i < 20; i++) {
      const e = spawnEmber(rect.width, rect.height)
      e.y = topOffsetRef.current + Math.random() * (rect.height - topOffsetRef.current)
      e.life = Math.random() * e.maxLife * 0.5
      embersRef.current.push(e)
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
        if (spawnTimer > 8 + Math.random() * 12) {
          if (embersRef.current.length < 50) {
            embersRef.current.push(spawnEmber(w, h))
          }
          spawnTimer = 0
        }
      }

      const activeEmbers: Ember[] = []
      for (const e of embersRef.current) {
        if (animateRef.current) {
          e.life++
          e.y += e.vy
          e.x += e.vx + Math.sin(e.life * e.swaySpeed + e.phase) * 0.3

          // Magnetic attraction toward pointer
          if (ptrActive && ptr) {
            const dx = ptr.x - e.x
            const dy = ptr.y - e.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 120 && dist > 1) {
              const strength = (1 - dist / 120) * 0.3
              e.x += dx / dist * strength
              e.y += dy / dist * strength
            }
          }
        }

        if (e.life >= e.maxLife || e.y < topOffsetRef.current - 20) continue
        activeEmbers.push(e)

        const lifeRatio = e.life / e.maxLife
        // Fade in at start, fade & shrink near end
        const fade = lifeRatio < 0.1 ? lifeRatio / 0.1 : lifeRatio > 0.6 ? (1 - lifeRatio) / 0.4 : 1
        const alpha = e.brightness * fade * currentOpacity
        const radius = e.radius * (1 - lifeRatio * 0.5)

        // Glow halo
        const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.glowRadius * fade)
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.4})`)
        glow.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.15})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.glowRadius * fade, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Core ember
        ctx.beginPath()
        ctx.arc(e.x, e.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      }
      embersRef.current = activeEmbers

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
