'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface VeinSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface Vein {
  segments: VeinSegment[]
  tipX: number
  tipY: number
  angle: number
  speed: number
  life: number
  maxLife: number
  fadeStart: number
  brightness: number
  width: number
  curvature: number
}

interface MarbleVeinsBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function spawnVein(w: number, h: number, topOffset: number, fromPointer?: { x: number; y: number }): Vein {
  const x = fromPointer?.x ?? Math.random() * w
  const y = fromPointer?.y ?? (topOffset + Math.random() * (h - topOffset))
  return {
    segments: [],
    tipX: x,
    tipY: y,
    angle: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 1.2,
    life: 0,
    maxLife: 400 + Math.random() * 300,
    fadeStart: 250 + Math.random() * 150,
    brightness: 0.2 + Math.random() * 0.2,
    width: 0.3 + Math.random() * 0.6,
    curvature: 0.02 + Math.random() * 0.04,
  }
}

export function MarbleVeinsBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: MarbleVeinsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const veinsRef = useRef<Vein[]>([])
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

    // Seed initial veins
    const rect = canvas.getBoundingClientRect()
    for (let i = 0; i < 3; i++) {
      const v = spawnVein(rect.width, rect.height, topOffsetRef.current)
      v.life = Math.random() * 60
      veinsRef.current.push(v)
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
        if (spawnTimer > 80 + Math.random() * 120) {
          if (veinsRef.current.length < 8) {
            veinsRef.current.push(spawnVein(w, h, topOffsetRef.current))
          }
          spawnTimer = 0
        }

        if (ptrActive && ptr && veinsRef.current.length < 10) {
          const hasNearby = veinsRef.current.some(v =>
            Math.sqrt((v.tipX - ptr.x) ** 2 + (v.tipY - ptr.y) ** 2) < 40 && v.life < 20
          )
          if (!hasNearby) {
            veinsRef.current.push(spawnVein(w, h, topOffsetRef.current, { x: ptr.x, y: ptr.y }))
          }
        }
      }

      const activeVeins: Vein[] = []
      for (const vein of veinsRef.current) {
        if (animateRef.current) {
          vein.life++

          // Grow the vein — add new segment
          if (vein.life < vein.fadeStart) {
            const oldX = vein.tipX
            const oldY = vein.tipY

            // Gentle curving — slowly changing angle
            vein.angle += (Math.random() - 0.5) * vein.curvature
            vein.tipX += Math.cos(vein.angle) * vein.speed
            vein.tipY += Math.sin(vein.angle) * vein.speed

            // Keep on screen
            if (vein.tipX < 0 || vein.tipX > w) vein.angle = Math.PI - vein.angle
            if (vein.tipY < topOffsetRef.current || vein.tipY > h) vein.angle = -vein.angle

            vein.segments.push({ x1: oldX, y1: oldY, x2: vein.tipX, y2: vein.tipY })
          }
        }

        if (vein.life >= vein.maxLife) continue
        activeVeins.push(vein)

        const fadeFactor = vein.life > vein.fadeStart
          ? 1 - (vein.life - vein.fadeStart) / (vein.maxLife - vein.fadeStart)
          : Math.min(1, vein.life / 20)

        // Draw all segments
        for (let i = 0; i < vein.segments.length; i++) {
          const seg = vein.segments[i]
          // Segments fade along length — newest are brightest
          const segAge = (vein.segments.length - i) / vein.segments.length
          const segFade = 1 - segAge * 0.6
          const alpha = vein.brightness * fadeFactor * segFade * currentOpacity

          ctx.beginPath()
          ctx.moveTo(seg.x1, seg.y1)
          ctx.lineTo(seg.x2, seg.y2)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.lineWidth = vein.width
          ctx.lineCap = 'round'
          ctx.stroke()
        }

        // Subtle glow at the growing tip
        if (vein.life < vein.fadeStart) {
          const tipAlpha = vein.brightness * fadeFactor * 0.4 * currentOpacity
          const glow = ctx.createRadialGradient(vein.tipX, vein.tipY, 0, vein.tipX, vein.tipY, 6)
          glow.addColorStop(0, `rgba(255, 255, 255, ${tipAlpha})`)
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.beginPath()
          ctx.arc(vein.tipX, vein.tipY, 6, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()
        }
      }
      veinsRef.current = activeVeins

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
