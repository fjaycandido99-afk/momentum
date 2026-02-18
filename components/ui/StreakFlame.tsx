'use client'

import { useEffect, useRef } from 'react'

interface StreakFlameProps {
  streak: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: { width: 24, height: 32 },
  md: { width: 32, height: 44 },
  lg: { width: 48, height: 64 },
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  life: number
  maxLife: number
}

export function StreakFlame({ streak, size = 'md', className = '' }: StreakFlameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef<number>(0)

  const dims = SIZES[size]
  const particleCount = streak <= 3 ? 8 : streak <= 14 ? 15 : 25

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = dims.width * dpr
    canvas.height = dims.height * dpr
    ctx.scale(dpr, dpr)

    const particles = particlesRef.current

    function spawnParticle() {
      const centerX = dims.width / 2
      const bottomY = dims.height - 4
      particles.push({
        x: centerX + (Math.random() - 0.5) * dims.width * 0.4,
        y: bottomY,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.3 + Math.random() * 0.5),
        size: 1 + Math.random() * 2.5,
        opacity: 0.4 + Math.random() * 0.5,
        life: 0,
        maxLife: 30 + Math.random() * 40,
      })
    }

    function draw() {
      ctx.clearRect(0, 0, dims.width, dims.height)

      // Spawn particles to maintain count
      while (particles.length < particleCount) {
        spawnParticle()
      }

      // Draw subtle base glow
      const gradient = ctx.createRadialGradient(
        dims.width / 2, dims.height - 4, 0,
        dims.width / 2, dims.height - 4, dims.width * 0.6
      )
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, dims.width, dims.height)

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life++
        p.x += p.vx + Math.sin(p.life * 0.1) * 0.2
        p.y += p.vy
        p.vy *= 0.99

        const lifeRatio = p.life / p.maxLife
        const fadeOpacity = p.opacity * (1 - lifeRatio)
        const currentSize = p.size * (1 - lifeRatio * 0.6)

        if (p.life >= p.maxLife) {
          particles.splice(i, 1)
          continue
        }

        // Core particles: mostly white, very subtle warm tint for brightest
        const warmth = fadeOpacity > 0.5 ? 15 : 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, ${255 - warmth}, ${255 - warmth * 2}, ${fadeOpacity})`
        ctx.fill()
      }

      // Ember dots (tiny particles that float higher)
      if (Math.random() < 0.15 && streak > 3) {
        const emberX = dims.width / 2 + (Math.random() - 0.5) * dims.width * 0.3
        ctx.beginPath()
        ctx.arc(emberX, dims.height * 0.3 * Math.random(), 1, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + Math.random() * 0.3})`
        ctx.fill()
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [streak, dims, particleCount])

  return (
    <canvas
      ref={canvasRef}
      width={dims.width}
      height={dims.height}
      className={`pointer-events-none ${className}`}
      style={{ width: dims.width, height: dims.height }}
    />
  )
}
