'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface BrushStroke {
  x: number
  y: number
  angle: number
  length: number
  maxLength: number
  width: number
  growSpeed: number
  life: number
  maxLife: number
  fadeStart: number
  brightness: number
  taper: number
  bleed: number
}

interface InkWashBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function spawnStroke(w: number, h: number, topOffset: number, fromPointer?: { x: number; y: number }): BrushStroke {
  const x = fromPointer?.x ?? Math.random() * w
  const y = fromPointer?.y ?? (topOffset + Math.random() * (h - topOffset))
  return {
    x,
    y,
    angle: Math.random() * Math.PI * 2,
    length: 0,
    maxLength: 40 + Math.random() * 80,
    width: 3 + Math.random() * 8,
    growSpeed: 0.5 + Math.random() * 1,
    life: 0,
    maxLife: 250 + Math.random() * 200,
    fadeStart: 150 + Math.random() * 100,
    brightness: 0.35 + Math.random() * 0.3,
    taper: 0.6 + Math.random() * 0.4,
    bleed: 2 + Math.random() * 6,
  }
}

export function InkWashBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: InkWashBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<BrushStroke[]>([])
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

    // Seed initial strokes
    const rect = canvas.getBoundingClientRect()
    for (let i = 0; i < 4; i++) {
      const s = spawnStroke(rect.width, rect.height, topOffsetRef.current)
      s.life = Math.random() * 60
      s.length = Math.min(s.maxLength, s.life * s.growSpeed)
      strokesRef.current.push(s)
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
        if (spawnTimer > 60 + Math.random() * 100) {
          if (strokesRef.current.length < 10) {
            strokesRef.current.push(spawnStroke(w, h, topOffsetRef.current))
          }
          spawnTimer = 0
        }

        // Pointer-triggered stroke
        if (ptrActive && ptr && strokesRef.current.length < 12) {
          const hasNearby = strokesRef.current.some(s =>
            Math.sqrt((s.x - ptr.x) ** 2 + (s.y - ptr.y) ** 2) < 40 && s.life < 20
          )
          if (!hasNearby) {
            strokesRef.current.push(spawnStroke(w, h, topOffsetRef.current, { x: ptr.x, y: ptr.y }))
          }
        }
      }

      const activeStrokes: BrushStroke[] = []
      for (const s of strokesRef.current) {
        if (animateRef.current) {
          s.life++
          if (s.length < s.maxLength) {
            s.length = Math.min(s.maxLength, s.length + s.growSpeed)
          }
        }

        if (s.life >= s.maxLife) continue
        activeStrokes.push(s)

        // Calculate fade
        const fadeFactor = s.life > s.fadeStart
          ? 1 - (s.life - s.fadeStart) / (s.maxLife - s.fadeStart)
          : Math.min(1, s.life / 20) // fade in
        const alpha = s.brightness * fadeFactor * currentOpacity

        // Draw brush stroke with tapered ends
        const cos = Math.cos(s.angle)
        const sin = Math.sin(s.angle)
        const halfLen = s.length / 2
        const x1 = s.x - cos * halfLen
        const y1 = s.y - sin * halfLen
        const x2 = s.x + cos * halfLen
        const y2 = s.y + sin * halfLen

        // Bleed/wash effect — wider, softer behind
        const perpX = -sin
        const perpY = cos
        const bleedWidth = s.width + s.bleed

        ctx.beginPath()
        ctx.moveTo(x1 + perpX * bleedWidth * s.taper * 0.3, y1 + perpY * bleedWidth * s.taper * 0.3)
        ctx.quadraticCurveTo(
          s.x + perpX * bleedWidth * 0.5,
          s.y + perpY * bleedWidth * 0.5,
          x2 + perpX * bleedWidth * 0.15,
          y2 + perpY * bleedWidth * 0.15
        )
        ctx.quadraticCurveTo(
          x2 + cos * 3,
          y2 + sin * 3,
          x2 - perpX * bleedWidth * 0.15,
          y2 - perpY * bleedWidth * 0.15
        )
        ctx.quadraticCurveTo(
          s.x - perpX * bleedWidth * 0.5,
          s.y - perpY * bleedWidth * 0.5,
          x1 - perpX * bleedWidth * s.taper * 0.3,
          y1 - perpY * bleedWidth * s.taper * 0.3
        )
        ctx.closePath()
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`
        ctx.fill()

        // Inner core stroke — more opaque
        const coreWidth = s.width * 0.5
        ctx.beginPath()
        ctx.moveTo(x1 + perpX * coreWidth * s.taper * 0.2, y1 + perpY * coreWidth * s.taper * 0.2)
        ctx.quadraticCurveTo(
          s.x + perpX * coreWidth * 0.5,
          s.y + perpY * coreWidth * 0.5,
          x2 + perpX * coreWidth * 0.1,
          y2 + perpY * coreWidth * 0.1
        )
        ctx.quadraticCurveTo(
          x2 + cos * 1.5,
          y2 + sin * 1.5,
          x2 - perpX * coreWidth * 0.1,
          y2 - perpY * coreWidth * 0.1
        )
        ctx.quadraticCurveTo(
          s.x - perpX * coreWidth * 0.5,
          s.y - perpY * coreWidth * 0.5,
          x1 - perpX * coreWidth * s.taper * 0.2,
          y1 - perpY * coreWidth * s.taper * 0.2
        )
        ctx.closePath()
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
        ctx.fill()
      }
      strokesRef.current = activeStrokes

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
