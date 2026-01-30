'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface GridTraceBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
}

interface GridNode {
  x: number
  y: number
  col: number
  row: number
}

interface EdgeKey {
  a: number
  b: number
}

interface Tracer {
  currentNode: number
  targetNode: number
  progress: number    // 0→1 along the edge
  speed: number
}

function edgeId(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function getNeighbors(nodeIdx: number, cols: number, rows: number): number[] {
  const col = nodeIdx % cols
  const row = Math.floor(nodeIdx / cols)
  const neighbors: number[] = []
  if (col > 0) neighbors.push(nodeIdx - 1)
  if (col < cols - 1) neighbors.push(nodeIdx + 1)
  if (row > 0) neighbors.push(nodeIdx - cols)
  if (row < rows - 1) neighbors.push(nodeIdx + cols)
  return neighbors
}

export function GridTraceBackground({
  animate = true,
  className = '',
  pointerRef,
}: GridTraceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)
  const nodesRef = useRef<GridNode[]>([])
  const tracersRef = useRef<Tracer[]>([])
  const edgeBrightnessRef = useRef<Map<string, number>>(new Map())

  useEffect(() => { animateRef.current = animate }, [animate])

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const COLS = 4
    const ROWS = 6
    const NUM_TRACERS = 3
    const TRACE_FADE = 0.985
    const TRACER_SPEED = 0.004

    const TOP_OFFSET = 120

    const buildGrid = (w: number, h: number) => {
      const spacingX = w / (COLS - 1)
      const usableHeight = h - TOP_OFFSET
      const spacingY = usableHeight / (ROWS - 1)
      const nodes: GridNode[] = []
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          nodes.push({
            x: spacingX * c,
            y: TOP_OFFSET + spacingY * r,
            col: c,
            row: r,
          })
        }
      }
      return nodes
    }

    const initTracers = () => {
      const tracers: Tracer[] = []
      for (let i = 0; i < NUM_TRACERS; i++) {
        const startNode = Math.floor(Math.random() * COLS * ROWS)
        const neighbors = getNeighbors(startNode, COLS, ROWS)
        const target = neighbors[Math.floor(Math.random() * neighbors.length)]
        tracers.push({
          currentNode: startNode,
          targetNode: target,
          progress: 0,
          speed: TRACER_SPEED + Math.random() * 0.006,
        })
      }
      return tracers
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      nodesRef.current = buildGrid(rect.width, rect.height)
      if (tracersRef.current.length === 0) {
        tracersRef.current = initTracers()
      }
    }
    resize()
    window.addEventListener('resize', resize)

    if (tracersRef.current.length === 0) {
      tracersRef.current = initTracers()
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
      const tracers = tracersRef.current
      const edgeBrightness = edgeBrightnessRef.current
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      // Fade all edge brightness
      for (const [key, val] of edgeBrightness) {
        const newVal = val * TRACE_FADE
        if (newVal < 0.01) {
          edgeBrightness.delete(key)
        } else {
          edgeBrightness.set(key, newVal)
        }
      }

      // Update tracers
      if (animateRef.current) {
        for (const t of tracers) {
          t.progress += t.speed

          // Light up current edge
          const eid = edgeId(t.currentNode, t.targetNode)
          edgeBrightness.set(eid, 1)

          if (t.progress >= 1) {
            t.progress = 0
            t.currentNode = t.targetNode

            // Pick next node — bias toward pointer if active
            const neighbors = getNeighbors(t.currentNode, COLS, ROWS)
            if (ptrActive && ptr && neighbors.length > 0) {
              const curr = nodes[t.currentNode]
              let bestIdx = 0
              let bestDist = Infinity
              for (let i = 0; i < neighbors.length; i++) {
                const n = nodes[neighbors[i]]
                const dx = ptr.x - n.x
                const dy = ptr.y - n.y
                const dist = dx * dx + dy * dy
                if (dist < bestDist) {
                  bestDist = dist
                  bestIdx = i
                }
              }
              // 60% chance to go toward pointer, 40% random
              t.targetNode = Math.random() < 0.6
                ? neighbors[bestIdx]
                : neighbors[Math.floor(Math.random() * neighbors.length)]
            } else {
              t.targetNode = neighbors[Math.floor(Math.random() * neighbors.length)]
            }
          }
        }
      }

      // Draw base grid lines (very dim)
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        const neighbors = getNeighbors(i, COLS, ROWS)
        for (const ni of neighbors) {
          if (ni <= i) continue // avoid drawing twice
          const nb = nodes[ni]
          ctx.beginPath()
          ctx.moveTo(n.x, n.y)
          ctx.lineTo(nb.x, nb.y)
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * currentOpacity})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }

      // Draw lit edges (traced paths)
      for (const [key, brightness] of edgeBrightness) {
        const [aStr, bStr] = key.split('-')
        const a = nodes[parseInt(aStr)]
        const b = nodes[parseInt(bStr)]
        if (!a || !b) continue

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.5 * currentOpacity})`
        ctx.lineWidth = 0.5 + brightness * 1
        ctx.stroke()
      }

      // Draw tracers as bright glowing dots
      for (const t of tracers) {
        const a = nodes[t.currentNode]
        const b = nodes[t.targetNode]
        if (!a || !b) continue
        const x = a.x + (b.x - a.x) * t.progress
        const y = a.y + (b.y - a.y) * t.progress

        // Glow
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 8)
        glow.addColorStop(0, `rgba(255, 255, 255, ${0.4 * currentOpacity})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * currentOpacity})`
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
