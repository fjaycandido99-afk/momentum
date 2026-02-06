'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface WaveFieldBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

interface WaveDot {
  col: number
  row: number
  baseX: number
  baseY: number
  phase: number
}

function createDots(w: number, h: number, topOffset: number): WaveDot[] {
  const cols = 14
  const rows = 9
  const spacingX = w / (cols + 1)
  const usableHeight = h - topOffset
  const spacingY = usableHeight / (rows + 1)
  const dots: WaveDot[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push({
        col: c,
        row: r,
        baseX: spacingX * (c + 1),
        baseY: topOffset + spacingY * (r + 1),
        phase: (c + r) * 0.35,
      })
    }
  }
  return dots
}

export function WaveFieldBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: WaveFieldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<WaveDot[]>([])
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)
  const topOffsetRef = useRef(topOffset)

  useEffect(() => { animateRef.current = animate }, [animate])

  const COLS = 14
  const ROWS = 9

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
      dotsRef.current = createDots(rect.width, rect.height, topOffsetRef.current)
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
      const amplitude = h * 0.04
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      // Compute positions for all dots
      const positions: { x: number; y: number; brightness: number }[] = []

      for (const d of dots) {
        const wave = Math.sin(time * 0.8 + d.phase)
        let yOffset = wave * amplitude
        const x = d.baseX

        // Secondary wave for depth
        const wave2 = Math.sin(time * 0.5 + d.phase * 0.7 + 2.0)
        yOffset += wave2 * amplitude * 0.3

        // Pointer ripple disturbance
        if (ptrActive && ptr) {
          const dx = ptr.x - x
          const dy = ptr.y - (d.baseY + yOffset)
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            const ripple = (1 - dist / 150) * amplitude * 2.5
            yOffset += Math.sin(time * 3 + dist * 0.05) * ripple
          }
        }

        const y = Math.max(topOffsetRef.current, d.baseY + yOffset)
        const brightness = 0.35 + 0.45 * ((wave + 1) / 2)

        positions.push({ x, y, brightness })
      }

      // Draw connecting lines between adjacent dots in same row
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 1; c++) {
          const idx = r * COLS + c
          const nextIdx = idx + 1
          const p1 = positions[idx]
          const p2 = positions[nextIdx]
          const lineAlpha = Math.min(p1.brightness, p2.brightness) * 0.12 * currentOpacity

          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`
          ctx.lineWidth = 0.4
          ctx.stroke()
        }
      }

      // Draw connecting lines between adjacent dots in same column
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 1; r++) {
          const idx = r * COLS + c
          const belowIdx = (r + 1) * COLS + c
          const p1 = positions[idx]
          const p2 = positions[belowIdx]
          const lineAlpha = Math.min(p1.brightness, p2.brightness) * 0.06 * currentOpacity

          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`
          ctx.lineWidth = 0.3
          ctx.stroke()
        }
      }

      // Draw dots with glow
      for (const p of positions) {
        const alpha = p.brightness * currentOpacity

        // Soft glow
        const glowRadius = 6
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius)
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.15})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
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

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
    />
  )
}
