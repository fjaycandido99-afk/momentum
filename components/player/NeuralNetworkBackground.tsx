'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface NeuralNode {
  x: number
  y: number
  baseX: number
  baseY: number
  vx: number
  vy: number
  radius: number
  brightness: number
  fireIntensity: number
  fireDecay: number
  fireDelay: number
}

interface NeuralNetworkBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
}

const NODE_COUNT = 35
const CONNECTION_DIST = 150
const DRIFT_SPEED = 0.15
const FIRE_CHANCE = 0.003
const FIRE_DURATION_DECAY = 0.025
const RIPPLE_DELAY_PER_HOP = 12

const TOP_OFFSET = 50

function createNodes(count: number, w: number, h: number): NeuralNode[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: TOP_OFFSET + Math.random() * (h - TOP_OFFSET),
    baseX: 0,
    baseY: 0,
    vx: (Math.random() - 0.5) * DRIFT_SPEED * 2,
    vy: (Math.random() - 0.5) * DRIFT_SPEED * 2,
    radius: 2 + Math.random() * 2,
    brightness: 0.3 + Math.random() * 0.3,
    fireIntensity: 0,
    fireDecay: FIRE_DURATION_DECAY,
    fireDelay: 0,
  }))
}

function getNeighbors(
  nodeIndex: number,
  nodes: NeuralNode[],
  maxDist: number
): number[] {
  const neighbors: number[] = []
  const n = nodes[nodeIndex]
  for (let i = 0; i < nodes.length; i++) {
    if (i === nodeIndex) continue
    const dx = n.x - nodes[i].x
    const dy = n.y - nodes[i].y
    if (dx * dx + dy * dy < maxDist * maxDist) {
      neighbors.push(i)
    }
  }
  return neighbors
}

export function NeuralNetworkBackground({
  animate = true,
  className = '',
  pointerRef,
}: NeuralNetworkBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<NeuralNode[]>([])
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
      if (nodesRef.current.length === 0) {
        nodesRef.current = createNodes(NODE_COUNT, rect.width, rect.height)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    if (nodesRef.current.length === 0) {
      const rect = canvas.getBoundingClientRect()
      nodesRef.current = createNodes(NODE_COUNT, rect.width, rect.height)
    }

    let currentOpacity = 0.2
    let frameCount = 0

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      const nodes = nodesRef.current
      frameCount++

      if (animateRef.current) {
        const ptr = pointerRef?.current
        const ptrActive = ptr?.active ?? false

        // Randomly trigger a fire event
        if (Math.random() < FIRE_CHANCE) {
          const sourceIdx = Math.floor(Math.random() * nodes.length)
          const source = nodes[sourceIdx]
          if (source.fireIntensity < 0.1) {
            source.fireIntensity = 1
            source.fireDelay = 0

            // Schedule ripple to neighbors
            const neighbors = getNeighbors(sourceIdx, nodes, CONNECTION_DIST)
            for (const ni of neighbors) {
              const neighbor = nodes[ni]
              if (neighbor.fireIntensity < 0.3) {
                neighbor.fireDelay = RIPPLE_DELAY_PER_HOP
              }
            }
          }
        }

        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i]

          // Handle fire delays (ripple effect)
          if (n.fireDelay > 0) {
            n.fireDelay--
            if (n.fireDelay <= 0) {
              n.fireIntensity = 0.6 + Math.random() * 0.3

              // Propagate to next layer of neighbors with longer delay
              const neighbors = getNeighbors(i, nodes, CONNECTION_DIST)
              for (const ni of neighbors) {
                const neighbor = nodes[ni]
                if (neighbor.fireIntensity < 0.1 && neighbor.fireDelay <= 0) {
                  if (Math.random() < 0.4) {
                    neighbor.fireDelay = RIPPLE_DELAY_PER_HOP + Math.floor(Math.random() * 8)
                  }
                }
              }
            }
          }

          // Decay fire intensity
          if (n.fireIntensity > 0) {
            n.fireIntensity -= n.fireDecay
            if (n.fireIntensity < 0) n.fireIntensity = 0
          }

          // Drift movement
          n.x += n.vx
          n.y += n.vy

          // Pointer repulsion - nodes drift away from the pointer
          if (ptrActive && ptr) {
            const dx = n.x - ptr.x
            const dy = n.y - ptr.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 120 && dist > 1) {
              const strength = (1 - dist / 120) * 0.5
              n.x += dx / dist * strength
              n.y += dy / dist * strength
            }
          }

          // Bounce off edges
          if (n.x < 0 || n.x > w) n.vx *= -1
          if (n.y < TOP_OFFSET || n.y > h) n.vy *= -1
          n.x = Math.max(0, Math.min(w, n.x))
          n.y = Math.max(TOP_OFFSET, Math.min(h, n.y))

          // Slight random drift changes
          if (frameCount % 60 === 0) {
            n.vx += (Math.random() - 0.5) * 0.04
            n.vy += (Math.random() - 0.5) * 0.04
            // Clamp velocity
            const maxSpeed = DRIFT_SPEED * 2.5
            n.vx = Math.max(-maxSpeed, Math.min(maxSpeed, n.vx))
            n.vy = Math.max(-maxSpeed, Math.min(maxSpeed, n.vy))
          }
        }
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const distSq = dx * dx + dy * dy
          if (distSq < CONNECTION_DIST * CONNECTION_DIST) {
            const dist = Math.sqrt(distSq)
            const proximity = 1 - dist / CONNECTION_DIST

            // Base connection opacity is very low
            let lineAlpha = proximity * 0.07 * currentOpacity

            // Brighten connections when either node is firing
            const fireBrightness = Math.max(nodes[i].fireIntensity, nodes[j].fireIntensity)
            if (fireBrightness > 0) {
              lineAlpha += proximity * fireBrightness * 0.2 * currentOpacity
            }

            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`
            ctx.lineWidth = fireBrightness > 0.3 ? 0.8 : 0.4
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const baseAlpha = n.brightness * currentOpacity
        const fireAlpha = n.fireIntensity * 0.7 * currentOpacity
        const totalAlpha = Math.min(baseAlpha + fireAlpha, 1)

        // Glow effect when firing
        if (n.fireIntensity > 0.2) {
          const glowRadius = n.radius + n.fireIntensity * 6
          const gradient = ctx.createRadialGradient(
            n.x, n.y, 0,
            n.x, n.y, glowRadius
          )
          gradient.addColorStop(0, `rgba(255, 255, 255, ${n.fireIntensity * 0.25 * currentOpacity})`)
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

          ctx.beginPath()
          ctx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }

        // Draw the node dot
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${totalAlpha})`
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
