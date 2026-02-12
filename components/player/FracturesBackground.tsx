'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface CrackSegment {
  x1: number
  y1: number
  x2: number
  y2: number
  brightness: number
  width: number
}

interface CrackSystem {
  segments: CrackSegment[]
  tips: Array<{ x: number; y: number; angle: number; generation: number }>
  life: number
  maxLife: number
  fadeStart: number
}

interface FracturesBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function spawnCrack(w: number, h: number, topOffset: number, fromPointer?: { x: number; y: number }): CrackSystem {
  const x = fromPointer?.x ?? Math.random() * w
  const y = fromPointer?.y ?? (topOffset + Math.random() * (h - topOffset))
  const tipCount = 2 + Math.floor(Math.random() * 3)
  const tips = Array.from({ length: tipCount }, () => ({
    x,
    y,
    angle: Math.random() * Math.PI * 2,
    generation: 0,
  }))
  return {
    segments: [],
    tips,
    life: 0,
    maxLife: 300 + Math.random() * 200,
    fadeStart: 200 + Math.random() * 100,
  }
}

export function FracturesBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: FracturesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cracksRef = useRef<CrackSystem[]>([])
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

    // Seed initial cracks
    const rect = canvas.getBoundingClientRect()
    for (let i = 0; i < 3; i++) {
      const c = spawnCrack(rect.width, rect.height, topOffsetRef.current)
      c.life = Math.random() * 80
      cracksRef.current.push(c)
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
        if (spawnTimer > 120 + Math.random() * 180) {
          if (cracksRef.current.length < 8) {
            cracksRef.current.push(spawnCrack(w, h, topOffsetRef.current))
          }
          spawnTimer = 0
        }

        // Pointer-triggered crack
        if (ptrActive && ptr && cracksRef.current.length < 10) {
          const hasNearby = cracksRef.current.some(c =>
            c.tips.some(t => Math.sqrt((t.x - ptr.x) ** 2 + (t.y - ptr.y) ** 2) < 50) && c.life < 30
          )
          if (!hasNearby) {
            cracksRef.current.push(spawnCrack(w, h, topOffsetRef.current, { x: ptr.x, y: ptr.y }))
          }
        }
      }

      const activeCracks: CrackSystem[] = []
      for (const crack of cracksRef.current) {
        if (animateRef.current) {
          crack.life++

          // Grow tips into new segments
          if (crack.life < crack.fadeStart) {
            const newTips: typeof crack.tips = []
            for (const tip of crack.tips) {
              if (tip.generation > 4) continue

              // Grow segment
              const len = 3 + Math.random() * 6
              tip.angle += (Math.random() - 0.5) * 0.6
              const nx = tip.x + Math.cos(tip.angle) * len
              const ny = tip.y + Math.sin(tip.angle) * len

              crack.segments.push({
                x1: tip.x,
                y1: tip.y,
                x2: nx,
                y2: ny,
                brightness: 0.5 + Math.random() * 0.4,
                width: Math.max(0.3, 1.2 - tip.generation * 0.2),
              })

              tip.x = nx
              tip.y = ny

              // Chance to branch
              if (Math.random() < 0.03 && tip.generation < 3) {
                newTips.push({
                  x: nx,
                  y: ny,
                  angle: tip.angle + (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.8),
                  generation: tip.generation + 1,
                })
              }
            }
            crack.tips.push(...newTips)
          }
        }

        if (crack.life >= crack.maxLife) continue
        activeCracks.push(crack)

        // Calculate fade
        const fadeFactor = crack.life > crack.fadeStart
          ? 1 - (crack.life - crack.fadeStart) / (crack.maxLife - crack.fadeStart)
          : 1

        // Draw all segments
        for (const seg of crack.segments) {
          const alpha = seg.brightness * fadeFactor * currentOpacity

          ctx.beginPath()
          ctx.moveTo(seg.x1, seg.y1)
          ctx.lineTo(seg.x2, seg.y2)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.lineWidth = seg.width
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      }
      cracksRef.current = activeCracks

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
