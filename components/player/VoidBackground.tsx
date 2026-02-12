'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface VoidParticle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  brightness: number
  captured: boolean
}

interface VoidCenter {
  x: number
  y: number
  targetX: number
  targetY: number
  pullRadius: number
  eventHorizon: number
  driftTimer: number
}

interface VoidBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function VoidBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: VoidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<VoidParticle[]>([])
  const voidRef = useRef<VoidCenter | null>(null)
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

    // Initialize void center
    const rect = canvas.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = topOffsetRef.current + (rect.height - topOffsetRef.current) / 2
    voidRef.current = {
      x: cx,
      y: cy,
      targetX: cx,
      targetY: cy,
      pullRadius: 180,
      eventHorizon: 12,
      driftTimer: 0,
    }

    // Seed initial particles around the edges
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 100 + Math.random() * 200
      particlesRef.current.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 0.8 + Math.random() * 1.5,
        brightness: 0.4 + Math.random() * 0.5,
        captured: false,
      })
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      const v = voidRef.current!
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      if (animateRef.current) {
        // Drift the void center slowly
        v.driftTimer++
        if (v.driftTimer > 300 + Math.random() * 200) {
          v.targetX = w * 0.25 + Math.random() * w * 0.5
          v.targetY = topOffsetRef.current + (h - topOffsetRef.current) * 0.25 + Math.random() * (h - topOffsetRef.current) * 0.5
          v.driftTimer = 0
        }
        v.x += (v.targetX - v.x) * 0.003
        v.y += (v.targetY - v.y) * 0.003

        // Spawn new particles from edges
        spawnTimer++
        if (spawnTimer > 3 && particlesRef.current.length < 100) {
          const side = Math.floor(Math.random() * 4)
          let px: number, py: number
          if (side === 0) { px = Math.random() * w; py = topOffsetRef.current - 5 }
          else if (side === 1) { px = Math.random() * w; py = h + 5 }
          else if (side === 2) { px = -5; py = topOffsetRef.current + Math.random() * (h - topOffsetRef.current) }
          else { px = w + 5; py = topOffsetRef.current + Math.random() * (h - topOffsetRef.current) }
          particlesRef.current.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            radius: 0.8 + Math.random() * 1.5,
            brightness: 0.4 + Math.random() * 0.5,
            captured: false,
          })
          spawnTimer = 0
        }
      }

      // Draw void center — dark glow with faint ring
      const voidGlow = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.eventHorizon * 4)
      voidGlow.addColorStop(0, `rgba(0, 0, 0, ${0.6 * currentOpacity})`)
      voidGlow.addColorStop(0.4, `rgba(0, 0, 0, ${0.2 * currentOpacity})`)
      voidGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.beginPath()
      ctx.arc(v.x, v.y, v.eventHorizon * 4, 0, Math.PI * 2)
      ctx.fillStyle = voidGlow
      ctx.fill()

      // Faint accretion ring
      ctx.beginPath()
      ctx.arc(v.x, v.y, v.eventHorizon * 2.5, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 * currentOpacity})`
      ctx.lineWidth = 0.8
      ctx.stroke()

      // Update and draw particles
      const alive: VoidParticle[] = []
      for (const p of particlesRef.current) {
        if (animateRef.current) {
          const dx = v.x - p.x
          const dy = v.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < v.eventHorizon) {
            // Consumed by void — don't keep
            continue
          }

          if (dist < v.pullRadius) {
            // Gravitational pull — stronger as closer
            const strength = (1 - dist / v.pullRadius) * 0.08
            p.vx += (dx / dist) * strength
            p.vy += (dy / dist) * strength

            // Orbital tangent for spiral effect
            const tangentStrength = (1 - dist / v.pullRadius) * 0.04
            p.vx += (-dy / dist) * tangentStrength
            p.vy += (dx / dist) * tangentStrength
          }

          // Pointer repels particles
          if (ptrActive && ptr) {
            const pdx = p.x - ptr.x
            const pdy = p.y - ptr.y
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy)
            if (pdist < 80 && pdist > 1) {
              const repel = (1 - pdist / 80) * 0.5
              p.vx += (pdx / pdist) * repel
              p.vy += (pdy / pdist) * repel
            }
          }

          // Apply velocity with damping
          p.x += p.vx
          p.y += p.vy
          p.vx *= 0.995
          p.vy *= 0.995
        }

        alive.push(p)

        // Draw particle with stretch toward void
        const dx = v.x - p.x
        const dy = v.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const proximity = dist < v.pullRadius ? (1 - dist / v.pullRadius) : 0
        const alpha = p.brightness * currentOpacity * (0.3 + proximity * 0.7)

        // Particle glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3 + proximity * 4)
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`)
        glow.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.15})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * 3 + proximity * 4, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Core dot — stretches when close to void
        if (proximity > 0.3) {
          const stretchAngle = Math.atan2(dy, dx)
          const stretchFactor = 1 + proximity * 2
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(stretchAngle)
          ctx.scale(stretchFactor, 1)
          ctx.beginPath()
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.fill()
          ctx.restore()
        } else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.fill()
        }

        // Faint line toward void when close
        if (proximity > 0.5) {
          const lineAlpha = (proximity - 0.5) * 0.3 * currentOpacity
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x + dx * 0.15, p.y + dy * 0.15)
          ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`
          ctx.lineWidth = 0.4
          ctx.stroke()
        }
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
