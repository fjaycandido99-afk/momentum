'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface SmokeParticle {
  x: number
  y: number
  originX: number
  radius: number
  brightness: number
  life: number
  maxLife: number
  drift: number
  driftSpeed: number
  phase: number
  riseSpeed: number
}

interface IncenseSmokeBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function IncenseSmokeBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: IncenseSmokeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<SmokeParticle[]>([])
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

    // Incense source points (2-3 sticks)
    const rect = canvas.getBoundingClientRect()
    const sources = [
      { x: rect.width * 0.5, y: rect.height * 0.75 },
      { x: rect.width * 0.35, y: rect.height * 0.8 },
      { x: rect.width * 0.65, y: rect.height * 0.78 },
    ]

    // Seed initial particles
    for (let i = 0; i < 30; i++) {
      const src = sources[Math.floor(Math.random() * sources.length)]
      const p: SmokeParticle = {
        x: src.x + (Math.random() - 0.5) * 3,
        y: src.y - Math.random() * rect.height * 0.5,
        originX: src.x,
        radius: 2 + Math.random() * 8,
        brightness: 0.15 + Math.random() * 0.25,
        life: Math.random() * 150,
        maxLife: 180 + Math.random() * 120,
        drift: (Math.random() - 0.5) * 0.3,
        driftSpeed: 0.01 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2,
        riseSpeed: 0.3 + Math.random() * 0.5,
      }
      particlesRef.current.push(p)
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
        if (spawnTimer > 1) {
          const src = sources[Math.floor(Math.random() * sources.length)]
          if (particlesRef.current.length < 80) {
            particlesRef.current.push({
              x: src.x + (Math.random() - 0.5) * 2,
              y: src.y,
              originX: src.x,
              radius: 1.5 + Math.random() * 3,
              brightness: 0.2 + Math.random() * 0.3,
              life: 0,
              maxLife: 180 + Math.random() * 120,
              drift: (Math.random() - 0.5) * 0.15,
              driftSpeed: 0.01 + Math.random() * 0.015,
              phase: Math.random() * Math.PI * 2,
              riseSpeed: 0.3 + Math.random() * 0.5,
            })
          }
          spawnTimer = 0
        }
      }

      // Draw incense sticks (thin lines)
      for (const src of sources) {
        const stickAlpha = 0.3 * currentOpacity
        ctx.beginPath()
        ctx.moveTo(src.x, src.y)
        ctx.lineTo(src.x + (Math.random() - 0.5) * 0.5, src.y + 40)
        ctx.strokeStyle = `rgba(255, 255, 255, ${stickAlpha})`
        ctx.lineWidth = 1
        ctx.stroke()

        // Glowing tip
        const tipGlow = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, 4)
        tipGlow.addColorStop(0, `rgba(255, 255, 255, ${0.5 * currentOpacity})`)
        tipGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(src.x, src.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = tipGlow
        ctx.fill()
      }

      // Update and draw smoke
      const alive: SmokeParticle[] = []
      for (const p of particlesRef.current) {
        if (animateRef.current) {
          p.life++
          p.phase += p.driftSpeed
          p.y -= p.riseSpeed
          p.x += p.drift + Math.sin(p.phase) * 0.6

          // Smoke expands as it rises
          const lifeRatio = p.life / p.maxLife
          p.radius += 0.02 + lifeRatio * 0.03

          // Pointer disperses smoke
          if (ptrActive && ptr) {
            const dx = p.x - ptr.x
            const dy = p.y - ptr.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 60 && dist > 1) {
              const push = (1 - dist / 60) * 1.5
              p.x += (dx / dist) * push
              p.y += (dy / dist) * push
            }
          }
        }

        if (p.life >= p.maxLife || p.y < topOffsetRef.current - 30) continue
        alive.push(p)

        const lifeRatio = p.life / p.maxLife
        // Fade in at start, fade out at end
        const fade = lifeRatio < 0.05 ? lifeRatio / 0.05 :
                     lifeRatio > 0.5 ? (1 - lifeRatio) / 0.5 : 1
        const alpha = p.brightness * fade * currentOpacity

        // Soft smoke blob
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius)
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`)
        glow.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.2})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()
      }
      particlesRef.current = alive

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
