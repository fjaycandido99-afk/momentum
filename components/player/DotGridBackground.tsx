'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface DotGridBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
}

interface GridDot {
  col: number
  row: number
  baseX: number
  baseY: number
  x: number
  y: number
}

export function DotGridBackground({
  animate = true,
  className = '',
  pointerRef,
}: DotGridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<GridDot[]>([])
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)

  useEffect(() => { animateRef.current = animate }, [animate])

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const COLS = 14
    const ROWS = 10
    const CONNECTION_DIST = 1.5 // connect to neighbors within this grid distance

    const buildGrid = (w: number, h: number) => {
      const spacingX = w / (COLS + 1)
      const spacingY = h / (ROWS + 1)
      const dots: GridDot[] = []
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const bx = spacingX * (c + 1)
          const by = spacingY * (r + 1)
          dots.push({ col: c, row: r, baseX: bx, baseY: by, x: bx, y: by })
        }
      }
      return dots
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      dotsRef.current = buildGrid(rect.width, rect.height)
    }
    resize()
    window.addEventListener('resize', resize)

    let currentOpacity = 0.2
    let time = 0

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) {
        time += 0.008
      }

      const dots = dotsRef.current
      const amplitude = Math.min(w, h) * 0.015
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      // Update dot positions with wave displacement
      for (const d of dots) {
        const phase = d.col * 0.5 + d.row * 0.4
        const waveX = Math.sin(time * 0.7 + phase + 1.5) * amplitude * 0.6
        const waveY = Math.sin(time * 0.5 + phase) * amplitude
        let dx = waveX
        let dy = waveY

        // Pointer attraction
        if (ptrActive && ptr) {
          const pdx = ptr.x - (d.baseX + dx)
          const pdy = ptr.y - (d.baseY + dy)
          const dist = Math.sqrt(pdx * pdx + pdy * pdy)
          if (dist < 130 && dist > 1) {
            const strength = (1 - dist / 130) * 6
            dx += (pdx / dist) * strength
            dy += (pdy / dist) * strength
          }
        }

        d.x = d.baseX + dx
        d.y = d.baseY + dy
      }

      // Draw connections between adjacent dots
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i]
          const b = dots[j]
          const colDist = Math.abs(a.col - b.col)
          const rowDist = Math.abs(a.row - b.row)
          if (colDist > 1 || rowDist > 1) continue
          if (colDist + rowDist === 0) continue

          const dx = a.x - b.x
          const dy = a.y - b.y
          const screenDist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = Math.max(w / (COLS + 1), h / (ROWS + 1)) * CONNECTION_DIST
          if (screenDist > maxDist) continue

          const lineAlpha = (1 - screenDist / maxDist) * 0.25
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha * currentOpacity})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }

      // Draw dots
      for (const d of dots) {
        ctx.beginPath()
        ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * currentOpacity})`
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [pointerRef])

  useEffect(() => {
    const cleanup = startAnimation()
    return cleanup
  }, [startAnimation])

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
    />
  )
}
