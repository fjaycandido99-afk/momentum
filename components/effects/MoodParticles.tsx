'use client'

import { useEffect, useRef, useCallback } from 'react'
import { MOOD_PARTICLES, type ParticleConfig } from '@/lib/particle-configs'

interface MoodParticlesProps {
  activeMode: string
  audioActive?: boolean
  className?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  phase: number
  blinkSpeed: number
  driftAngle: number
  glowRadius: number
}

function createParticles(config: ParticleConfig, w: number, h: number): Particle[] {
  return Array.from({ length: config.count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * config.speedMax,
    vy: (Math.random() - 0.5) * config.speedMax,
    size: config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin),
    phase: Math.random() * Math.PI * 2,
    blinkSpeed: 0.3 + Math.random() * 1,
    driftAngle: Math.random() * Math.PI * 2,
    glowRadius: config.glowRadius * (0.7 + Math.random() * 0.6),
  }))
}

export function MoodParticles({ activeMode, audioActive = false, className = '' }: MoodParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>()
  const configRef = useRef<ParticleConfig>(MOOD_PARTICLES[activeMode] || MOOD_PARTICLES.focus)
  const modeRef = useRef(activeMode)
  const audioActiveRef = useRef(audioActive)

  useEffect(() => { audioActiveRef.current = audioActive }, [audioActive])

  useEffect(() => {
    if (modeRef.current !== activeMode) {
      modeRef.current = activeMode
      configRef.current = MOOD_PARTICLES[activeMode] || MOOD_PARTICLES.focus
      // Recreate particles on mode change
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        particlesRef.current = createParticles(configRef.current, rect.width, rect.height)
      }
    }
  }, [activeMode])

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
        particlesRef.current = createParticles(configRef.current, rect.width, rect.height)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    let time = 0

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      time += 0.016
      const config = configRef.current
      const [r, g, b] = config.color
      const intensity = audioActiveRef.current ? 1 : 0.4

      for (const p of particlesRef.current) {
        p.driftAngle += (Math.random() - 0.5) * config.driftStrength * 2
        p.vx += Math.cos(p.driftAngle) * config.driftStrength
        p.vy += Math.sin(p.driftAngle) * config.driftStrength

        // Add oscillation
        p.vy += Math.sin(time * config.oscillation + p.phase) * 0.005

        p.vx *= 0.98
        p.vy *= 0.98
        p.x += p.vx
        p.y += p.vy

        // Wrap
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10

        const blink = Math.pow(Math.max(0, Math.sin(time * p.blinkSpeed + p.phase)), 1.5)
        const alpha = blink * 0.6 * intensity

        if (alpha < 0.01) continue

        // Glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glowRadius)
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`)
        glow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.08})`)
        glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.glowRadius, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Core shape
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        if (config.shape === 'diamond') {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(Math.PI / 4)
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
          ctx.restore()
        } else if (config.shape === 'star') {
          drawStar(ctx, p.x, p.y, p.size, alpha, r, g, b)
        } else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
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

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-[1] w-full h-full ${className}`}
    />
  )
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha: number, r: number, g: number, b: number) {
  const spikes = 4
  const outerR = size * 1.2
  const innerR = size * 0.5
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerR : innerR
    const angle = (i * Math.PI) / spikes - Math.PI / 2
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
  ctx.fill()
}
