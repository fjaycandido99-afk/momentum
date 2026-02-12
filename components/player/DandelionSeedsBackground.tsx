'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Seed {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotSpeed: number
  armCount: number
  armLength: number
  brightness: number
  phase: number
  driftPhase: number
}

interface DandelionSeedsBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function spawnSeed(w: number, h: number, topOffset: number): Seed {
  const fromLeft = Math.random() > 0.5
  return {
    x: fromLeft ? -10 : w + 10,
    y: topOffset + Math.random() * (h - topOffset) * 0.7,
    vx: fromLeft ? (0.2 + Math.random() * 0.5) : -(0.2 + Math.random() * 0.5),
    vy: 0.1 + Math.random() * 0.3,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.015,
    armCount: 6 + Math.floor(Math.random() * 6),
    armLength: 4 + Math.random() * 7,
    brightness: 0.45 + Math.random() * 0.45,
    phase: Math.random() * Math.PI * 2,
    driftPhase: Math.random() * Math.PI * 2,
  }
}

export function DandelionSeedsBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: DandelionSeedsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const seedsRef = useRef<Seed[]>([])
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
    let time = 0

    // Seed initial
    const rect = canvas.getBoundingClientRect()
    for (let i = 0; i < 12; i++) {
      const s = spawnSeed(rect.width, rect.height, topOffsetRef.current)
      s.x = Math.random() * rect.width
      s.y = topOffsetRef.current + Math.random() * (rect.height - topOffsetRef.current)
      seedsRef.current.push(s)
    }

    // Wind state
    let windX = 0.3
    let windTarget = 0.3
    let windTimer = 0

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
        time += 0.016

        // Wind gusts
        windTimer++
        if (windTimer > 200 + Math.random() * 300) {
          windTarget = (Math.random() - 0.3) * 0.8
          windTimer = 0
        }
        windX += (windTarget - windX) * 0.01

        spawnTimer++
        if (spawnTimer > 20 + Math.random() * 40) {
          if (seedsRef.current.length < 25) {
            seedsRef.current.push(spawnSeed(w, h, topOffsetRef.current))
          }
          spawnTimer = 0
        }
      }

      const alive: Seed[] = []
      for (const s of seedsRef.current) {
        if (animateRef.current) {
          s.phase += 0.02
          s.driftPhase += 0.01 + Math.random() * 0.005
          s.rotation += s.rotSpeed

          // Float with wind and gentle drift
          s.x += s.vx + windX + Math.sin(s.driftPhase) * 0.3
          s.y += s.vy + Math.cos(s.driftPhase * 0.7) * 0.15

          // Pointer blows seeds away
          if (ptrActive && ptr) {
            const dx = s.x - ptr.x
            const dy = s.y - ptr.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 90 && dist > 1) {
              const blow = (1 - dist / 90) * 0.6
              s.x += (dx / dist) * blow
              s.y += (dy / dist) * blow
            }
          }
        }

        // Remove if offscreen
        if (s.x < -30 || s.x > w + 30 || s.y > h + 20) continue
        alive.push(s)

        const alpha = s.brightness * currentOpacity

        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate(s.rotation)

        // Draw dandelion seed structure — central dot with radiating arms
        // Each arm has a tiny tuft at the end

        // Central seed body (small elongated shape)
        ctx.beginPath()
        ctx.ellipse(0, 2, 0.8, 2.5, 0, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
        ctx.fill()

        // Stem connecting body to pappus
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(0, -2)
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4})`
        ctx.lineWidth = 0.4
        ctx.stroke()

        // Radiating arms (pappus / parachute)
        for (let i = 0; i < s.armCount; i++) {
          const armAngle = (i / s.armCount) * Math.PI * 2
          const wobble = Math.sin(s.phase + i * 0.5) * 0.1
          const endX = Math.cos(armAngle + wobble) * s.armLength
          const endY = -2 + Math.sin(armAngle + wobble) * s.armLength

          // Arm line
          ctx.beginPath()
          ctx.moveTo(0, -2)
          ctx.lineTo(endX, endY)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.35})`
          ctx.lineWidth = 0.3
          ctx.stroke()

          // Tiny tuft at end of arm
          ctx.beginPath()
          ctx.arc(endX, endY, 0.6, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`
          ctx.fill()
        }

        // Soft glow around seed
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s.armLength * 1.3)
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.15})`)
        glow.addColorStop(0.6, `rgba(255, 255, 255, ${alpha * 0.05})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(0, 0, s.armLength * 1.3, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        ctx.restore()
      }
      seedsRef.current = alive

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
