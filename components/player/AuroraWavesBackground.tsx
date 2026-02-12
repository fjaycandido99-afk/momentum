'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface AuroraLayer {
  y: number
  amplitude: number
  frequency: number
  speed: number
  phase: number
  thickness: number
  brightness: number
  drift: number
}

interface AuroraWavesBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function AuroraWavesBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: AuroraWavesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layersRef = useRef<AuroraLayer[]>([])
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

    // Create aurora layers
    const rect = canvas.getBoundingClientRect()
    const numLayers = 5
    layersRef.current = []
    for (let i = 0; i < numLayers; i++) {
      const t = i / (numLayers - 1)
      layersRef.current.push({
        y: topOffsetRef.current + (rect.height - topOffsetRef.current) * (0.2 + t * 0.5),
        amplitude: 20 + Math.random() * 40,
        frequency: 0.003 + Math.random() * 0.004,
        speed: 0.005 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
        thickness: 30 + Math.random() * 50,
        brightness: 0.25 + Math.random() * 0.3,
        drift: (Math.random() - 0.5) * 0.3,
      })
    }

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
        time += 0.016
      }

      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      for (const layer of layersRef.current) {
        if (animateRef.current) {
          layer.phase += layer.speed
        }

        const step = 3 // pixel step for curve resolution
        const points: { x: number; y: number }[] = []

        for (let x = -10; x <= w + 10; x += step) {
          // Layered sine waves for organic shape
          let y = layer.y
          y += Math.sin(x * layer.frequency + layer.phase) * layer.amplitude
          y += Math.sin(x * layer.frequency * 2.3 + layer.phase * 1.5) * layer.amplitude * 0.3
          y += Math.sin(x * layer.frequency * 0.5 + layer.phase * 0.7) * layer.amplitude * 0.5

          // Pointer influence — push wave away
          if (ptrActive && ptr) {
            const dx = x - ptr.x
            const dy = y - ptr.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 100) {
              const push = (1 - dist / 100) * 25
              y += (dy > 0 ? 1 : -1) * push
            }
          }

          points.push({ x, y })
        }

        // Draw aurora band as filled gradient strip
        const alpha = layer.brightness * currentOpacity

        // Top edge of band
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y - layer.thickness / 2)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y - layer.thickness / 2)
        }
        // Bottom edge (reversed)
        for (let i = points.length - 1; i >= 0; i--) {
          ctx.lineTo(points[i].x, points[i].y + layer.thickness / 2)
        }
        ctx.closePath()

        // Gradient fill — bright center, fading edges
        const midY = layer.y
        const grad = ctx.createLinearGradient(0, midY - layer.thickness, 0, midY + layer.thickness)
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)')
        grad.addColorStop(0.3, `rgba(255, 255, 255, ${alpha * 0.3})`)
        grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.5})`)
        grad.addColorStop(0.7, `rgba(255, 255, 255, ${alpha * 0.3})`)
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = grad
        ctx.fill()

        // Bright center line
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y)
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
        ctx.lineWidth = 0.8
        ctx.stroke()
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
