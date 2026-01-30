'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface WaveFieldBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
}

interface WaveDot {
  col: number
  row: number
  baseX: number
  baseY: number
  phase: number
}

const TOP_OFFSET = 120

function createDots(w: number, h: number): WaveDot[] {
  const cols = 10
  const rows = 7
  const spacingX = w / (cols + 1)
  const usableHeight = h - TOP_OFFSET
  const spacingY = usableHeight / (rows + 1)
  const dots: WaveDot[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push({
        col: c,
        row: r,
        baseX: spacingX * (c + 1),
        baseY: TOP_OFFSET + spacingY * (r + 1),
        phase: (c + r) * 0.4,
      })
    }
  }
  return dots
}

export function WaveFieldBackground({
  animate = true,
  className = '',
  pointerRef,
}: WaveFieldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<WaveDot[]>([])
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)

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
      dotsRef.current = createDots(rect.width, rect.height)
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

      for (const d of dots) {
        const wave = Math.sin(time * 0.8 + d.phase)
        let yOffset = wave * amplitude
        const x = d.baseX

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

        const y = Math.max(TOP_OFFSET, d.baseY + yOffset)

        const brightness = 0.4 + 0.4 * ((wave + 1) / 2)

        ctx.beginPath()
        ctx.arc(x, y, 1.8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * currentOpacity})`
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
