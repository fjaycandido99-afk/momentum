'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Star {
  x: number
  y: number
  radius: number
  brightness: number
  twinkleSpeed: number
  phase: number
  layer: number // 0=dim/small, 1=medium, 2=bright/large
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  length: number
  life: number
  maxLife: number
  brightness: number
  width: number
}

interface ShootingStarsBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function createStars(count: number, w: number, h: number, topOffset: number): Star[] {
  return Array.from({ length: count }, () => {
    const layer = Math.random()
    const layerIdx = layer < 0.6 ? 0 : layer < 0.85 ? 1 : 2
    return {
      x: Math.random() * w,
      y: topOffset + Math.random() * (h - topOffset),
      radius: layerIdx === 0 ? 0.4 + Math.random() * 0.8
            : layerIdx === 1 ? 0.8 + Math.random() * 1.2
            : 1.2 + Math.random() * 2,
      brightness: layerIdx === 0 ? 0.15 + Math.random() * 0.3
               : layerIdx === 1 ? 0.3 + Math.random() * 0.5
               : 0.5 + Math.random() * 0.5,
      twinkleSpeed: 0.3 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      layer: layerIdx,
    }
  })
}

function spawnMeteor(w: number, h: number): Meteor {
  const angle = (Math.PI / 6) + Math.random() * (Math.PI / 5)
  const speed = 3 + Math.random() * 4
  return {
    x: Math.random() * w * 1.2,
    y: -10 - Math.random() * 50,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length: 50 + Math.random() * 100,
    life: 0,
    maxLife: 60 + Math.random() * 50,
    brightness: 0.6 + Math.random() * 0.4,
    width: 1 + Math.random() * 1.5,
  }
}

export function ShootingStarsBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: ShootingStarsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const meteorsRef = useRef<Meteor[]>([])
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
      if (starsRef.current.length === 0) {
        starsRef.current = createStars(90, rect.width, rect.height, topOffsetRef.current)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    if (starsRef.current.length === 0) {
      const rect = canvas.getBoundingClientRect()
      starsRef.current = createStars(90, rect.width, rect.height, topOffsetRef.current)
    }

    let currentOpacity = 0.2
    let time = 0
    let meteorTimer = 0

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) {
        time += 0.016
        meteorTimer++

        // Spawn meteors periodically
        if (meteorTimer > 90 + Math.random() * 140) {
          meteorsRef.current.push(spawnMeteor(w, h))
          meteorTimer = 0
        }
      }

      const stars = starsRef.current
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      // Draw twinkling stars with glow halos
      for (const s of stars) {
        const twinkle = 0.4 + 0.6 * Math.pow(Math.sin(time * s.twinkleSpeed + s.phase), 2)
        let alpha = s.brightness * twinkle * currentOpacity

        // Pointer proximity glow
        if (ptrActive && ptr) {
          const dx = ptr.x - s.x
          const dy = ptr.y - s.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            alpha = Math.min(1, alpha + (1 - dist / 100) * 0.5 * currentOpacity)
          }
        }

        // Glow halo for brighter stars
        if (s.layer >= 1 && alpha > 0.15) {
          const glowRadius = s.radius * (s.layer === 2 ? 5 : 3.5)
          const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowRadius)
          glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.2})`)
          glow.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.05})`)
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.beginPath()
          ctx.arc(s.x, s.y, glowRadius, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()
        }

        // Core dot
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      }

      // Draw and update meteors
      const activeMeteors: Meteor[] = []
      for (const m of meteorsRef.current) {
        if (animateRef.current) {
          m.x += m.vx
          m.y += m.vy
          m.life++
        }

        if (m.life >= m.maxLife || m.y > h + 50) continue
        activeMeteors.push(m)

        // Fade in and out
        const lifeRatio = m.life / m.maxLife
        const fade = lifeRatio < 0.1 ? lifeRatio / 0.1 : lifeRatio > 0.7 ? (1 - lifeRatio) / 0.3 : 1
        const alpha = m.brightness * fade * currentOpacity

        // Tail direction
        const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy)
        const nx = m.vx / speed
        const ny = m.vy / speed
        const tailX = m.x - nx * m.length
        const tailY = m.y - ny * m.length

        // Wider glowing trail
        const gradient = ctx.createLinearGradient(tailX, tailY, m.x, m.y)
        gradient.addColorStop(0, `rgba(255, 255, 255, 0)`)
        gradient.addColorStop(0.5, `rgba(230, 235, 255, ${alpha * 0.15})`)
        gradient.addColorStop(0.8, `rgba(220, 225, 255, ${alpha * 0.4})`)
        gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha})`)

        ctx.beginPath()
        ctx.moveTo(tailX, tailY)
        ctx.lineTo(m.x, m.y)
        ctx.strokeStyle = gradient
        ctx.lineWidth = m.width
        ctx.lineCap = 'round'
        ctx.stroke()

        // Head glow
        const headGlow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 6)
        headGlow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`)
        headGlow.addColorStop(0.4, `rgba(255, 255, 255, ${alpha * 0.2})`)
        headGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(m.x, m.y, 6, 0, Math.PI * 2)
        ctx.fillStyle = headGlow
        ctx.fill()
      }
      meteorsRef.current = activeMeteors

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
