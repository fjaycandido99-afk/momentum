'use client'

import { useEffect, useRef } from 'react'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'
import type { MindsetId } from '@/lib/mindset/types'

interface AnimatedPathLogoProps {
  mindsetId: MindsetId
  size?: number
  className?: string
}

export function AnimatedPathLogo({ mindsetId, size = 48, className = '' }: AnimatedPathLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2

    // Particle system
    const particles: {
      angle: number
      radius: number
      speed: number
      size: number
      opacity: number
      orbitSpeed: number
      phase: number
      trail: number
    }[] = []

    // Create orbital particles
    for (let i = 0; i < 18; i++) {
      particles.push({
        angle: (i / 18) * Math.PI * 2 + Math.random() * 0.5,
        radius: size * 0.28 + Math.random() * size * 0.14,
        speed: 0.003 + Math.random() * 0.004,
        size: 0.6 + Math.random() * 1.2,
        opacity: 0.15 + Math.random() * 0.5,
        orbitSpeed: (0.4 + Math.random() * 0.6) * (Math.random() > 0.5 ? 1 : -1),
        phase: Math.random() * Math.PI * 2,
        trail: 0.3 + Math.random() * 0.5,
      })
    }

    // Energy sparks - tiny bright dots that appear and fade
    const sparks: {
      x: number
      y: number
      vx: number
      vy: number
      life: number
      maxLife: number
      size: number
    }[] = []

    let lastSparkTime = 0

    const draw = (time: number) => {
      ctx.clearRect(0, 0, size, size)

      // === Outer glow ring ===
      const glowPulse = 0.5 + Math.sin(time * 0.0015) * 0.2
      const gradient = ctx.createRadialGradient(cx, cy, size * 0.2, cx, cy, size * 0.48)
      gradient.addColorStop(0, 'transparent')
      gradient.addColorStop(0.6, `rgba(255, 255, 255, ${0.015 * glowPulse})`)
      gradient.addColorStop(0.85, `rgba(255, 255, 255, ${0.04 * glowPulse})`)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)

      ctx.save()
      ctx.translate(cx, cy)

      // === Rotating ring 1 — dashed outer orbit ===
      const rot1 = time * 0.0002
      ctx.save()
      ctx.rotate(rot1)
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.06 + Math.sin(time * 0.002) * 0.02})`
      ctx.lineWidth = 0.5
      ctx.setLineDash([size * 0.04, size * 0.06])
      ctx.stroke()
      ctx.restore()

      // === Rotating ring 2 — dotted mid orbit ===
      ctx.save()
      ctx.rotate(-rot1 * 1.6)
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.34, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + Math.sin(time * 0.0025 + 1) * 0.03})`
      ctx.lineWidth = 0.5
      ctx.setLineDash([size * 0.012, size * 0.03])
      ctx.stroke()
      ctx.restore()

      // === Orbital particles ===
      ctx.setLineDash([])
      for (const p of particles) {
        p.angle += p.speed * p.orbitSpeed

        // Slightly wobbly orbit
        const wobble = Math.sin(time * 0.001 + p.phase) * size * 0.02
        const r = p.radius + wobble
        const x = Math.cos(p.angle) * r
        const y = Math.sin(p.angle) * r

        // Particle trail
        const trailAngle = p.angle - p.speed * p.orbitSpeed * 8
        const tx = Math.cos(trailAngle) * r
        const ty = Math.sin(trailAngle) * r

        const trailGrad = ctx.createLinearGradient(tx, ty, x, y)
        trailGrad.addColorStop(0, 'rgba(255, 255, 255, 0)')
        trailGrad.addColorStop(1, `rgba(255, 255, 255, ${p.opacity * p.trail * 0.3})`)
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(x, y)
        ctx.strokeStyle = trailGrad
        ctx.lineWidth = p.size * 0.5
        ctx.stroke()

        // Particle dot
        const pulse = 0.7 + Math.sin(time * 0.003 + p.phase) * 0.3
        ctx.beginPath()
        ctx.arc(x, y, p.size * pulse, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * pulse})`
        ctx.fill()
      }

      // === Energy sparks ===
      if (time - lastSparkTime > 400 + Math.random() * 600) {
        lastSparkTime = time
        const sparkAngle = Math.random() * Math.PI * 2
        const sparkR = size * 0.15 + Math.random() * size * 0.1
        sparks.push({
          x: Math.cos(sparkAngle) * sparkR,
          y: Math.sin(sparkAngle) * sparkR,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          life: 1,
          maxLife: 60 + Math.random() * 40,
          size: 0.5 + Math.random() * 1,
        })
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx
        s.y += s.vy
        s.life -= 1 / s.maxLife

        if (s.life <= 0) {
          sparks.splice(i, 1)
          continue
        }

        const fade = s.life * s.life // quadratic fade
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * fade, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * fade})`
        ctx.fill()
      }

      // === Inner glow pulse ===
      const innerPulse = 0.4 + Math.sin(time * 0.002) * 0.15
      const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.18)
      innerGrad.addColorStop(0, `rgba(255, 255, 255, ${0.06 * innerPulse})`)
      innerGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = innerGrad
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2)
      ctx.fill()

      // === Corner energy arcs (subtle) ===
      const arcPhase = time * 0.001
      for (let i = 0; i < 4; i++) {
        const a = arcPhase + (i * Math.PI) / 2
        const startA = a - 0.3
        const endA = a + 0.3
        ctx.beginPath()
        ctx.arc(0, 0, size * 0.38, startA, endA)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 + Math.sin(time * 0.003 + i) * 0.06})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      ctx.restore()

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [size])

  const iconSize = Math.round(size * 0.4)

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="absolute inset-0"
      />
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.15))' }}
      >
        <MindsetIcon
          mindsetId={mindsetId}
          className="text-white"
          size={iconSize}
        />
      </div>
    </div>
  )
}
