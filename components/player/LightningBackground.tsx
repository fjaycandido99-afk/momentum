'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface BoltSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface LightningBolt {
  segments: BoltSegment[]
  life: number
  maxLife: number
  brightness: number
  width: number
  flashAlpha: number
}

interface LightningBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function spawnBolt(w: number, h: number, topOffset: number, fromX?: number, fromY?: number): LightningBolt {
  const startX = fromX ?? Math.random() * w
  const startY = fromY ?? topOffset + Math.random() * (h - topOffset) * 0.2
  const segments: BoltSegment[] = []

  let x = startX
  let y = startY
  const targetY = startY + 80 + Math.random() * 200
  const steps = 6 + Math.floor(Math.random() * 8)

  for (let i = 0; i < steps; i++) {
    const nx = x + (Math.random() - 0.5) * 60
    const ny = y + (targetY - startY) / steps + (Math.random() - 0.5) * 10
    segments.push({ x1: x, y1: y, x2: nx, y2: ny })

    // Chance for a branch
    if (Math.random() < 0.3) {
      const bx = nx + (Math.random() - 0.5) * 40
      const by = ny + 10 + Math.random() * 30
      segments.push({ x1: nx, y1: ny, x2: bx, y2: by })
    }

    x = nx
    y = ny
  }

  return {
    segments,
    life: 0,
    maxLife: 12 + Math.floor(Math.random() * 10),
    brightness: 0.7 + Math.random() * 0.3,
    width: 1 + Math.random() * 1.5,
    flashAlpha: 0.06 + Math.random() * 0.04,
  }
}

export function LightningBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: LightningBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boltsRef = useRef<LightningBolt[]>([])
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
        if (spawnTimer > 50 + Math.random() * 120) {
          boltsRef.current.push(spawnBolt(w, h, topOffsetRef.current))
          // Occasionally double-strike
          if (Math.random() < 0.25) {
            boltsRef.current.push(spawnBolt(w, h, topOffsetRef.current))
          }
          spawnTimer = 0
        }

        // Pointer-triggered bolt
        if (ptrActive && ptr) {
          const hasRecent = boltsRef.current.some(b => b.life < 5)
          if (!hasRecent) {
            boltsRef.current.push(spawnBolt(w, h, topOffsetRef.current, ptr.x, ptr.y))
          }
        }
      }

      const activeBolts: LightningBolt[] = []
      for (const bolt of boltsRef.current) {
        if (animateRef.current) bolt.life++
        if (bolt.life >= bolt.maxLife) continue
        activeBolts.push(bolt)

        const lifeRatio = bolt.life / bolt.maxLife
        // Sharp flash then fade
        const fade = lifeRatio < 0.15 ? 1 : Math.pow(1 - (lifeRatio - 0.15) / 0.85, 2)
        const alpha = bolt.brightness * fade * currentOpacity

        // Screen flash on first frames
        if (bolt.life < 3) {
          ctx.fillStyle = `rgba(255, 255, 255, ${bolt.flashAlpha * (1 - bolt.life / 3) * currentOpacity})`
          ctx.fillRect(0, 0, w, h)
        }

        // Glow pass
        for (const seg of bolt.segments) {
          ctx.beginPath()
          ctx.moveTo(seg.x1, seg.y1)
          ctx.lineTo(seg.x2, seg.y2)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.15})`
          ctx.lineWidth = bolt.width * 6
          ctx.lineCap = 'round'
          ctx.stroke()
        }

        // Core bolt
        for (const seg of bolt.segments) {
          ctx.beginPath()
          ctx.moveTo(seg.x1, seg.y1)
          ctx.lineTo(seg.x2, seg.y2)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.lineWidth = bolt.width
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      }
      boltsRef.current = activeBolts

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
