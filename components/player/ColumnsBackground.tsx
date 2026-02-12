'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Column {
  x: number
  height: number
  maxHeight: number
  width: number
  growSpeed: number
  brightness: number
  life: number
  maxLife: number
  fadeStart: number
}

interface ColumnsBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function spawnColumn(w: number, h: number, topOffset: number): Column {
  return {
    x: Math.random() * w,
    height: 0,
    maxHeight: h * (0.3 + Math.random() * 0.5),
    width: 1.5 + Math.random() * 3,
    growSpeed: 0.4 + Math.random() * 0.6,
    brightness: 0.25 + Math.random() * 0.25,
    life: 0,
    maxLife: 350 + Math.random() * 250,
    fadeStart: 220 + Math.random() * 130,
  }
}

export function ColumnsBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: ColumnsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const columnsRef = useRef<Column[]>([])
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

    // Seed initial columns
    const rect = canvas.getBoundingClientRect()
    for (let i = 0; i < 5; i++) {
      const c = spawnColumn(rect.width, rect.height, topOffsetRef.current)
      c.life = Math.random() * 100
      c.height = Math.min(c.maxHeight, c.life * c.growSpeed)
      columnsRef.current.push(c)
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
        if (spawnTimer > 40 + Math.random() * 60) {
          if (columnsRef.current.length < 12) {
            columnsRef.current.push(spawnColumn(w, h, topOffsetRef.current))
          }
          spawnTimer = 0
        }
      }

      const activeColumns: Column[] = []
      for (const col of columnsRef.current) {
        if (animateRef.current) {
          col.life++
          if (col.height < col.maxHeight) {
            col.height = Math.min(col.maxHeight, col.height + col.growSpeed)
          }
        }

        if (col.life >= col.maxLife) continue
        activeColumns.push(col)

        const fadeFactor = col.life > col.fadeStart
          ? 1 - (col.life - col.fadeStart) / (col.maxLife - col.fadeStart)
          : Math.min(1, col.life / 30)
        const alpha = col.brightness * fadeFactor * currentOpacity

        const baseY = h
        const topY = baseY - col.height

        // Pointer glow effect
        let extraBright = 0
        if (ptrActive && ptr) {
          const dx = Math.abs(ptr.x - col.x)
          if (dx < 40) {
            extraBright = (1 - dx / 40) * 0.2 * currentOpacity
          }
        }

        // Column gradient — brighter at base, fading at top
        const gradient = ctx.createLinearGradient(col.x, baseY, col.x, topY)
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha + extraBright})`)
        gradient.addColorStop(0.7, `rgba(255, 255, 255, ${(alpha + extraBright) * 0.5})`)
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

        ctx.beginPath()
        ctx.moveTo(col.x - col.width / 2, baseY)
        ctx.lineTo(col.x - col.width / 2, topY)
        ctx.lineTo(col.x + col.width / 2, topY)
        ctx.lineTo(col.x + col.width / 2, baseY)
        ctx.closePath()
        ctx.fillStyle = gradient
        ctx.fill()

        // Simple capital at top
        if (col.height > 20) {
          const capAlpha = alpha * 0.6
          ctx.beginPath()
          ctx.moveTo(col.x - col.width, topY)
          ctx.lineTo(col.x + col.width, topY)
          ctx.strokeStyle = `rgba(255, 255, 255, ${capAlpha})`
          ctx.lineWidth = 0.6
          ctx.stroke()
        }
      }
      columnsRef.current = activeColumns

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
