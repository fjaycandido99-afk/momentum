'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface PerspectiveGridBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
}

export function PerspectiveGridBackground({
  animate = true,
  className = '',
  pointerRef,
}: PerspectiveGridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
    }
    resize()
    window.addEventListener('resize', resize)

    let currentOpacity = 0.2
    let time = 0

    const NUM_H_LINES = 20
    const NUM_V_LINES = 17
    const MAX_Z = 12

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) {
        time += 0.0008
      }

      const horizonY = h * 0.3
      const groundH = h - horizonY
      const cx = w / 2
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      // Vertical lines — converge to vanishing point
      for (let i = 0; i < NUM_V_LINES; i++) {
        const t = i / (NUM_V_LINES - 1)
        const xBottom = t * w
        const alpha = 0.15 + 0.1 * (1 - Math.abs(t - 0.5) * 2)

        ctx.beginPath()
        ctx.moveTo(xBottom, h)
        ctx.lineTo(cx, horizonY)
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * currentOpacity})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Horizontal lines — scroll toward viewer with perspective
      for (let i = 0; i < NUM_H_LINES; i++) {
        const baseZ = (i / NUM_H_LINES) * MAX_Z
        const z = ((baseZ + time * 3) % MAX_Z) + 0.5
        const perspY = horizonY + groundH * (1 / z)

        if (perspY > h || perspY < horizonY) continue

        // Depth-based alpha: closer = brighter
        const depthAlpha = Math.max(0, 1 - (z - 0.5) / MAX_Z)
        const alpha = depthAlpha * 0.4

        // Width narrows toward horizon
        const spread = (perspY - horizonY) / groundH
        const lineLeft = cx - (w / 2) * spread
        const lineRight = cx + (w / 2) * spread

        // Pointer ripple — distort horizontal line near pointer
        if (ptrActive && ptr && Math.abs(ptr.y - perspY) < 60) {
          const proximity = 1 - Math.abs(ptr.y - perspY) / 60
          const segments = 40
          ctx.beginPath()
          for (let s = 0; s <= segments; s++) {
            const sx = lineLeft + (lineRight - lineLeft) * (s / segments)
            const distFromPtr = Math.abs(sx - ptr.x)
            const ripple = distFromPtr < 100
              ? Math.sin(time * 5 + distFromPtr * 0.08) * 8 * proximity * (1 - distFromPtr / 100)
              : 0
            const sy = perspY + ripple
            if (s === 0) ctx.moveTo(sx, sy)
            else ctx.lineTo(sx, sy)
          }
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * currentOpacity})`
          ctx.lineWidth = 0.5 + depthAlpha * 0.5
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.moveTo(lineLeft, perspY)
          ctx.lineTo(lineRight, perspY)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * currentOpacity})`
          ctx.lineWidth = 0.5 + depthAlpha * 0.5
          ctx.stroke()
        }
      }

      // Horizon glow line
      ctx.beginPath()
      ctx.moveTo(0, horizonY)
      ctx.lineTo(w, horizonY)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 * currentOpacity})`
      ctx.lineWidth = 1
      ctx.stroke()

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
