'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface ConstellationNode {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  brightness: number
}

interface ConstellationBackgroundProps {
  animate?: boolean       // whether nodes move (default true)
  nodeCount?: number      // number of dots (default 45)
  connectionDist?: number // max px to draw a line (default 120)
  speed?: number          // drift speed multiplier (default 0.3)
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function createNodes(count: number, speed: number, w: number, h: number, topOffset: number): ConstellationNode[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: topOffset + Math.random() * (h - topOffset),
    vx: (Math.random() - 0.5) * speed * 2,
    vy: (Math.random() - 0.5) * speed * 2,
    radius: 1.2 + Math.random() * 2,
    brightness: 0.5 + Math.random() * 0.5,
  }))
}

export function ConstellationBackground({
  animate = true,
  nodeCount = 45,
  connectionDist = 120,
  speed = 0.3,
  className = '',
  pointerRef,
  topOffset = 50,
}: ConstellationBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<ConstellationNode[]>([])
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
      if (nodesRef.current.length === 0) {
        nodesRef.current = createNodes(nodeCount, speed, rect.width, rect.height, topOffsetRef.current)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    if (nodesRef.current.length === 0) {
      const rect = canvas.getBoundingClientRect()
      nodesRef.current = createNodes(nodeCount, speed, rect.width, rect.height, topOffsetRef.current)
    }

    let currentOpacity = 0.2

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      const nodes = nodesRef.current

      if (animateRef.current) {
        const ptr = pointerRef?.current
        const ptrActive = ptr?.active ?? false

        for (const n of nodes) {
          n.x += n.vx
          n.y += n.vy

          // Magnetic attraction toward pointer
          if (ptrActive && ptr) {
            const dx = ptr.x - n.x
            const dy = ptr.y - n.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 120 && dist > 1) {
              const strength = (1 - dist / 120) * 0.4
              n.x += dx / dist * strength
              n.y += dy / dist * strength
            }
          }

          if (n.x < 0 || n.x > w) n.vx *= -1
          if (n.y < topOffsetRef.current || n.y > h) n.vy *= -1
          n.x = Math.max(0, Math.min(w, n.x))
          n.y = Math.max(topOffsetRef.current, Math.min(h, n.y))
        }
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < connectionDist) {
            const lineAlpha = (1 - dist / connectionDist) * 0.35 * currentOpacity
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${n.brightness * currentOpacity})`
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [nodeCount, connectionDist, speed])

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
