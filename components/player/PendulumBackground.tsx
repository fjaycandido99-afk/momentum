'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface TrailDot {
  x: number
  y: number
  alpha: number
}

interface PendulumBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function PendulumBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: PendulumBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)
  const topOffsetRef = useRef(topOffset)
  const trailRef = useRef<TrailDot[]>([])

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
    let angle = Math.PI / 4
    let angularVel = 0
    const gravity = 0.0003
    const damping = 0.9997
    let trailTimer = 0

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) time += 0.016

      const pivotX = w / 2
      const pivotY = topOffsetRef.current + 40
      const length = h * 0.55

      // Physics update
      if (animateRef.current) {
        angularVel += -gravity * Math.sin(angle)
        angularVel *= damping
        angle += angularVel

        // Keep it swinging — add tiny energy if nearly stopped
        if (Math.abs(angularVel) < 0.0002) {
          angularVel += (Math.random() - 0.5) * 0.001
        }
      }

      const bobX = pivotX + Math.sin(angle) * length
      const bobY = pivotY + Math.cos(angle) * length

      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      // Pointer nudge
      if (animateRef.current && ptrActive && ptr) {
        const dx = ptr.x - bobX
        const dy = ptr.y - bobY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 80) {
          angularVel += (ptr.x - pivotX) * 0.000005
        }
      }

      // Add trail dot
      if (animateRef.current) {
        trailTimer++
        if (trailTimer > 1) {
          trailRef.current.push({ x: bobX, y: bobY, alpha: 0.3 })
          trailTimer = 0
        }

        // Fade trail
        const alive: TrailDot[] = []
        for (const dot of trailRef.current) {
          dot.alpha -= 0.003
          if (dot.alpha > 0.01) alive.push(dot)
        }
        trailRef.current = alive

        // Cap trail length
        if (trailRef.current.length > 150) {
          trailRef.current = trailRef.current.slice(-120)
        }
      }

      // Draw string
      const stringAlpha = 0.1 * currentOpacity
      ctx.beginPath()
      ctx.moveTo(pivotX, pivotY)
      ctx.lineTo(bobX, bobY)
      ctx.strokeStyle = `rgba(255, 255, 255, ${stringAlpha})`
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Draw pivot
      ctx.beginPath()
      ctx.arc(pivotX, pivotY, 2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 * currentOpacity})`
      ctx.fill()

      // Draw trail
      for (const dot of trailRef.current) {
        const alpha = dot.alpha * currentOpacity
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      }

      // Draw arc path hint
      const arcAlpha = 0.04 * currentOpacity
      ctx.beginPath()
      ctx.arc(pivotX, pivotY, length, Math.PI / 2 - 0.5, Math.PI / 2 + 0.5)
      ctx.strokeStyle = `rgba(255, 255, 255, ${arcAlpha})`
      ctx.lineWidth = 0.4
      ctx.stroke()

      // Draw bob
      const bobAlpha = 0.35 * currentOpacity
      const bobGlow = ctx.createRadialGradient(bobX, bobY, 0, bobX, bobY, 12)
      bobGlow.addColorStop(0, `rgba(255, 255, 255, ${bobAlpha})`)
      bobGlow.addColorStop(0.4, `rgba(255, 255, 255, ${bobAlpha * 0.3})`)
      bobGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.beginPath()
      ctx.arc(bobX, bobY, 12, 0, Math.PI * 2)
      ctx.fillStyle = bobGlow
      ctx.fill()

      // Core bob
      ctx.beginPath()
      ctx.arc(bobX, bobY, 3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${bobAlpha * 1.5})`
      ctx.fill()

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
