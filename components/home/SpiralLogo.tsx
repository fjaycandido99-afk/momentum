'use client'

import { useEffect, useRef } from 'react'

interface SpiralLogoProps {
  open: boolean
  size?: number
  className?: string
}

export function SpiralLogo({ open, size = 28, className = '' }: SpiralLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const openRef = useRef(open)
  const speedRef = useRef(open ? 1 : 0)

  useEffect(() => { openRef.current = open }, [open])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2

    const outerR = size * 0.355
    const midR = size * 0.27
    const innerR = size * 0.188
    const dotR = size * 0.055

    const draw = (time: number) => {
      // Lerp speed — faster spin when menu open
      const target = openRef.current ? 1 : 0
      speedRef.current += (target - speedRef.current) * 0.06

      ctx.clearRect(0, 0, size, size)

      const speed = speedRef.current
      const baseRot = time * 0.00025
      // When open, rings spin a bit faster
      const rot = baseRot * (1 + speed * 1.5)

      // Brightness boost when open
      const boost = 1 + speed * 0.4

      ctx.save()
      ctx.translate(cx, cy)

      // Outer ring — dashed, slow rotate
      ctx.save()
      ctx.rotate(rot)
      ctx.beginPath()
      ctx.arc(0, 0, outerR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.8 * boost, 1)})`
      ctx.lineWidth = 1
      ctx.setLineDash([size * 0.052, size * 0.026])
      ctx.stroke()
      ctx.restore()

      // Middle ring — dotted, opposite rotate
      ctx.save()
      ctx.rotate(-rot * 1.4)
      ctx.beginPath()
      ctx.arc(0, 0, midR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.9 * boost, 1)})`
      ctx.lineWidth = 1
      ctx.setLineDash([size * 0.016, size * 0.026])
      ctx.stroke()
      ctx.restore()

      // Inner ring — dashed, slow rotate
      ctx.save()
      ctx.rotate(rot * 0.8)
      ctx.beginPath()
      ctx.arc(0, 0, innerR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.85 * boost, 1)})`
      ctx.lineWidth = 1
      ctx.setLineDash([size * 0.042, size * 0.021])
      ctx.stroke()
      ctx.restore()

      // Center dot with pulse
      const pulse = 0.7 + Math.sin(time * 0.003) * 0.3
      ctx.setLineDash([])

      // Dot
      ctx.beginPath()
      ctx.arc(0, 0, dotR, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1 * boost, 1)})`
      ctx.fill()

      ctx.restore()

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
