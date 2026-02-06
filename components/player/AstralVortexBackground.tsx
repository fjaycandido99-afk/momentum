'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface VortexParticle {
  angle: number
  dist: number
  speed: number
  radius: number
  brightness: number
  arm: number // which spiral arm (0-2)
}

interface AmbientStar {
  x: number
  y: number
  radius: number
  brightness: number
  twinkleSpeed: number
  phase: number
}

interface AstralVortexBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function createParticles(count: number): VortexParticle[] {
  return Array.from({ length: count }, () => {
    const layer = Math.random()
    const arm = Math.floor(Math.random() * 3)
    const armOffset = (arm / 3) * Math.PI * 2
    return {
      angle: armOffset + (Math.random() - 0.5) * 1.2,
      dist: 20 + Math.random() * 300,
      speed: (0.001 + Math.random() * 0.003) * (layer < 0.3 ? 1.5 : layer < 0.6 ? 1 : 0.6),
      radius: 0.6 + Math.random() * 1.5,
      brightness: 0.25 + Math.random() * 0.5,
      arm,
    }
  })
}

function createAmbientStars(count: number, w: number, h: number, topOffset: number): AmbientStar[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: topOffset + Math.random() * (h - topOffset),
    radius: 0.3 + Math.random() * 0.8,
    brightness: 0.1 + Math.random() * 0.25,
    twinkleSpeed: 0.3 + Math.random() * 1,
    phase: Math.random() * Math.PI * 2,
  }))
}

export function AstralVortexBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: AstralVortexBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<VortexParticle[]>([])
  const ambientRef = useRef<AmbientStar[]>([])
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)

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
      if (particlesRef.current.length === 0) {
        particlesRef.current = createParticles(85)
        ambientRef.current = createAmbientStars(30, rect.width, rect.height, topOffset)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    if (particlesRef.current.length === 0) {
      particlesRef.current = createParticles(85)
      const rect = canvas.getBoundingClientRect()
      ambientRef.current = createAmbientStars(30, rect.width, rect.height, topOffset)
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

      const cx = w / 2
      const cy = h * 0.45
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      // Ambient background stars
      for (const s of ambientRef.current) {
        const twinkle = 0.4 + 0.6 * Math.pow(Math.sin(time * s.twinkleSpeed + s.phase), 2)
        const alpha = s.brightness * twinkle * currentOpacity

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      }

      // Subtle center glow with breathing
      const coreGlow = 0.25 + 0.12 * Math.sin(time * 0.8)
      const coreRadius = 35 + 8 * Math.sin(time * 0.5)
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius)
      coreGrad.addColorStop(0, `rgba(255, 255, 255, ${coreGlow * 0.18 * currentOpacity})`)
      coreGrad.addColorStop(0.5, `rgba(255, 255, 255, ${coreGlow * 0.06 * currentOpacity})`)
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.beginPath()
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2)
      ctx.fillStyle = coreGrad
      ctx.fill()

      // Soft outer halo
      const haloRadius = 180
      const haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloRadius)
      haloGrad.addColorStop(0, `rgba(255, 255, 255, ${coreGlow * 0.025 * currentOpacity})`)
      haloGrad.addColorStop(0.5, `rgba(255, 255, 255, ${coreGlow * 0.01 * currentOpacity})`)
      haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.beginPath()
      ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2)
      ctx.fillStyle = haloGrad
      ctx.fill()

      const particles = particlesRef.current

      for (const p of particles) {
        if (animateRef.current) {
          p.angle += p.speed
          p.dist += Math.sin(time * 0.3 + p.angle * 3) * 0.08

          // Pointer disturbance — push particles outward
          if (ptrActive && ptr) {
            const px = cx + Math.cos(p.angle) * p.dist
            const py = cy + Math.sin(p.angle) * p.dist * 0.6
            const dx = ptr.x - px
            const dy = ptr.y - py
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 100 && dist > 1) {
              p.dist += (1 - dist / 100) * 1.5
            }
          }

          p.dist = Math.max(15, Math.min(300, p.dist))
        }

        const x = cx + Math.cos(p.angle) * p.dist
        const y = cy + Math.sin(p.angle) * p.dist * 0.6

        // Short drawn trail
        const trailSteps = 5
        const trailAngle = p.angle - p.speed * trailSteps
        const tx = cx + Math.cos(trailAngle) * p.dist
        const ty = cy + Math.sin(trailAngle) * p.dist * 0.6

        // Trail with gradient fade
        const trailAlpha = p.brightness * 0.12 * currentOpacity
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(x, y)
        ctx.strokeStyle = `rgba(255, 255, 255, ${trailAlpha})`
        ctx.lineWidth = p.radius * 0.5
        ctx.stroke()

        // Particle dot with subtle glow
        const dotAlpha = p.brightness * 0.6 * currentOpacity

        // Glow for brighter particles
        if (p.brightness > 0.4) {
          const glowR = p.radius * 3
          const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR)
          glow.addColorStop(0, `rgba(255, 255, 255, ${dotAlpha * 0.2})`)
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.beginPath()
          ctx.arc(x, y, glowR, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(x, y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${dotAlpha})`
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
