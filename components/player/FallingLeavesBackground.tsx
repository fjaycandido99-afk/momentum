'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Leaf {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotSpeed: number
  tumble: number
  tumbleSpeed: number
  size: number
  brightness: number
  swayPhase: number
}

interface FallingLeavesBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function createLeaves(count: number, w: number, h: number, topOffset: number): Leaf[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: topOffset + Math.random() * (h - topOffset),
    vx: (Math.random() - 0.5) * 0.2,
    vy: 0.15 + Math.random() * 0.3,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.015,
    tumble: Math.random() * Math.PI * 2,
    tumbleSpeed: 0.01 + Math.random() * 0.02,
    size: 4 + Math.random() * 6,
    brightness: 0.45 + Math.random() * 0.4,
    swayPhase: Math.random() * Math.PI * 2,
  }))
}

export function FallingLeavesBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: FallingLeavesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const leavesRef = useRef<Leaf[]>([])
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
      if (leavesRef.current.length === 0) {
        leavesRef.current = createLeaves(12, rect.width, rect.height, topOffsetRef.current)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    if (leavesRef.current.length === 0) {
      const rect = canvas.getBoundingClientRect()
      leavesRef.current = createLeaves(12, rect.width, rect.height, topOffsetRef.current)
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

      if (animateRef.current) time += 0.016

      const leaves = leavesRef.current
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      for (const leaf of leaves) {
        if (animateRef.current) {
          leaf.y += leaf.vy
          leaf.x += leaf.vx + Math.sin(time * 1.5 + leaf.swayPhase) * 0.25
          leaf.rotation += leaf.rotSpeed
          leaf.tumble += leaf.tumbleSpeed

          // Very gentle drift
          leaf.vx += (Math.random() - 0.5) * 0.003
          leaf.vx *= 0.995

          // Magnetic attraction toward pointer
          if (ptrActive && ptr) {
            const dx = ptr.x - leaf.x
            const dy = ptr.y - leaf.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 100 && dist > 1) {
              const strength = (1 - dist / 100) * 0.2
              leaf.x += dx / dist * strength
              leaf.y += dy / dist * strength
            }
          }

          // Reset when falls below
          if (leaf.y > h + 15) {
            leaf.y = topOffsetRef.current - 10 - Math.random() * 40
            leaf.x = Math.random() * w
            leaf.vy = 0.15 + Math.random() * 0.3
          }
        }

        const tumbleFactor = Math.abs(Math.cos(leaf.tumble))
        const alpha = leaf.brightness * currentOpacity

        ctx.save()
        ctx.translate(leaf.x, leaf.y)
        ctx.rotate(leaf.rotation)

        const s = leaf.size
        const sw = s * (0.3 + tumbleFactor * 0.7)

        // Leaf shape — pointed oval with stem
        ctx.beginPath()
        ctx.moveTo(0, -s * 0.6)
        ctx.quadraticCurveTo(sw * 0.5, -s * 0.2, sw * 0.4, s * 0.2)
        ctx.quadraticCurveTo(sw * 0.2, s * 0.5, 0, s * 0.6)
        ctx.quadraticCurveTo(-sw * 0.2, s * 0.5, -sw * 0.4, s * 0.2)
        ctx.quadraticCurveTo(-sw * 0.5, -s * 0.2, 0, -s * 0.6)
        ctx.closePath()
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`
        ctx.fill()

        // Center vein
        ctx.beginPath()
        ctx.moveTo(0, -s * 0.5)
        ctx.lineTo(0, s * 0.5)
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`
        ctx.lineWidth = 0.3
        ctx.stroke()

        // Stem
        ctx.beginPath()
        ctx.moveTo(0, s * 0.6)
        ctx.lineTo(0, s * 0.85)
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.25})`
        ctx.lineWidth = 0.3
        ctx.stroke()

        ctx.restore()
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
