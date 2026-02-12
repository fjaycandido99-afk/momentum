'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface SakuraPetal {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotSpeed: number
  tumble: number
  tumbleSpeed: number
  width: number
  height: number
  brightness: number
  phase: number
}

interface CherryBlossomsBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function createPetals(count: number, w: number, h: number, topOffset: number): SakuraPetal[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: topOffset + Math.random() * (h - topOffset),
    vx: 0.2 + Math.random() * 0.6,
    vy: 0.4 + Math.random() * 0.8,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.04,
    tumble: Math.random() * Math.PI * 2,
    tumbleSpeed: 0.02 + Math.random() * 0.04,
    width: 2.5 + Math.random() * 3.5,
    height: 4 + Math.random() * 5,
    brightness: 0.25 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
  }))
}

export function CherryBlossomsBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: CherryBlossomsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const petalsRef = useRef<SakuraPetal[]>([])
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
      if (petalsRef.current.length === 0) {
        petalsRef.current = createPetals(40, rect.width, rect.height, topOffsetRef.current)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    if (petalsRef.current.length === 0) {
      const rect = canvas.getBoundingClientRect()
      petalsRef.current = createPetals(40, rect.width, rect.height, topOffsetRef.current)
    }

    let currentOpacity = 0.2
    let time = 0
    // Wind gust state
    let gustStrength = 0
    let gustTarget = 0
    let gustTimer = 0

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) {
        time += 0.016

        // Wind gust system
        gustTimer++
        if (gustTimer > 200 + Math.random() * 300) {
          gustTarget = 1 + Math.random() * 2
          gustTimer = 0
        }
        gustStrength += (gustTarget - gustStrength) * 0.02
        if (gustStrength > 0.05) gustTarget *= 0.98
      }

      const petals = petalsRef.current
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      for (const p of petals) {
        if (animateRef.current) {
          p.tumble += p.tumbleSpeed

          // Base movement + wind gusts
          p.y += p.vy
          p.x += p.vx + gustStrength * 0.8
          p.rotation += p.rotSpeed + gustStrength * 0.01

          // Sinusoidal flutter
          p.x += Math.sin(time * 3 + p.phase) * 0.5
          p.y += Math.cos(time * 2 + p.phase) * 0.15

          // Magnetic attraction toward pointer
          if (ptrActive && ptr) {
            const dx = ptr.x - p.x
            const dy = ptr.y - p.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 120 && dist > 1) {
              const strength = (1 - dist / 120) * 0.3
              p.x += dx / dist * strength
              p.y += dy / dist * strength
            }
          }

          // Reset when goes offscreen
          if (p.y > h + 15 || p.x > w + 30) {
            p.y = topOffsetRef.current - 10 - Math.random() * 30
            p.x = -10 + Math.random() * w * 0.8
            p.vy = 0.4 + Math.random() * 0.8
            p.vx = 0.2 + Math.random() * 0.6
          }
        }

        // Tumble effect: scale width by cos of tumble angle for 3D spin
        const tumbleFactor = Math.abs(Math.cos(p.tumble))
        const drawWidth = p.width * (0.3 + tumbleFactor * 0.7)
        const alpha = p.brightness * currentOpacity * 1.5

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)

        // Sharp petal shape — pointed ellipse
        ctx.beginPath()
        ctx.ellipse(0, 0, drawWidth / 2, p.height / 2, 0, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`
        ctx.fill()

        // Brighter center vein
        ctx.beginPath()
        ctx.moveTo(0, -p.height * 0.4)
        ctx.lineTo(0, p.height * 0.4)
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`
        ctx.lineWidth = 0.4
        ctx.stroke()

        ctx.restore()
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
