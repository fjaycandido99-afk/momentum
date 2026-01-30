'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface CircuitTraceBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
}

// A junction node on the circuit board grid
interface Junction {
  x: number
  y: number
  col: number
  row: number
  connections: number[] // indices of connected junctions
}

// A trace segment connecting two junctions
interface Trace {
  from: number // junction index
  to: number   // junction index
}

// A data pulse traveling along traces
interface Pulse {
  currentTrace: number    // index into traces array
  direction: 1 | -1       // 1 = from->to, -1 = to->from
  progress: number         // 0-1 along the trace
  speed: number
  trail: { x: number; y: number; age: number }[]
}

function buildCircuitNetwork(
  w: number,
  h: number,
  spacingX: number,
  spacingY: number
): { junctions: Junction[]; traces: Trace[] } {
  const cols = Math.floor(w / spacingX) + 1
  const rows = Math.floor(h / spacingY) + 1
  const junctions: Junction[] = []

  // Create grid of potential junctions (start below header area)
  const TOP_OFFSET = 50
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      junctions.push({
        x: c * spacingX,
        y: TOP_OFFSET + r * spacingY,
        col: c,
        row: r,
        connections: [],
      })
    }
  }

  const traces: Trace[] = []
  const traceSet = new Set<string>()

  const addTrace = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (traceSet.has(key)) return
    traceSet.add(key)
    traces.push({ from: a, to: b })
    const traceIdx = traces.length - 1
    junctions[a].connections.push(traceIdx)
    junctions[b].connections.push(traceIdx)
  }

  // Build a sparse network of horizontal and vertical traces
  // Not every grid cell connects -- we want a PCB look, not a full grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c

      // Horizontal trace to the right (~55% chance)
      if (c < cols - 1 && Math.random() < 0.55) {
        addTrace(idx, idx + 1)
      }

      // Vertical trace downward (~55% chance)
      if (r < rows - 1 && Math.random() < 0.55) {
        addTrace(idx, idx + cols)
      }
    }
  }

  // Ensure connectivity: add traces for isolated junctions
  for (let i = 0; i < junctions.length; i++) {
    if (junctions[i].connections.length === 0) {
      const c = junctions[i].col
      const r = junctions[i].row
      // Try right, down, left, up
      const neighbors = []
      if (c < cols - 1) neighbors.push(i + 1)
      if (r < rows - 1) neighbors.push(i + cols)
      if (c > 0) neighbors.push(i - 1)
      if (r > 0) neighbors.push(i - cols)
      if (neighbors.length > 0) {
        addTrace(i, neighbors[Math.floor(Math.random() * neighbors.length)])
      }
    }
  }

  return { junctions, traces }
}

function getJunctionPosition(
  pulse: Pulse,
  traces: Trace[],
  junctions: Junction[]
): { x: number; y: number } {
  const trace = traces[pulse.currentTrace]
  if (!trace) return { x: 0, y: 0 }
  const fromJ = pulse.direction === 1 ? junctions[trace.from] : junctions[trace.to]
  const toJ = pulse.direction === 1 ? junctions[trace.to] : junctions[trace.from]
  return {
    x: fromJ.x + (toJ.x - fromJ.x) * pulse.progress,
    y: fromJ.y + (toJ.y - fromJ.y) * pulse.progress,
  }
}

function getEndJunction(pulse: Pulse, traces: Trace[]): number {
  const trace = traces[pulse.currentTrace]
  return pulse.direction === 1 ? trace.to : trace.from
}

function createPulses(
  count: number,
  traces: Trace[],
  junctions: Junction[]
): Pulse[] {
  const pulses: Pulse[] = []
  // Only use traces that exist
  const validTraces = traces.filter(
    (_, i) => traces[i] !== undefined
  )
  if (validTraces.length === 0) return pulses

  for (let i = 0; i < count; i++) {
    const traceIdx = Math.floor(Math.random() * traces.length)
    pulses.push({
      currentTrace: traceIdx,
      direction: Math.random() < 0.5 ? 1 : -1,
      progress: Math.random(),
      speed: 0.003 + Math.random() * 0.005,
      trail: [],
    })
  }
  return pulses
}

export function CircuitTraceBackground({
  animate = true,
  className = '',
  pointerRef,
}: CircuitTraceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)
  const junctionsRef = useRef<Junction[]>([])
  const tracesRef = useRef<Trace[]>([])
  const pulsesRef = useRef<Pulse[]>([])
  const lastPointerSpawnRef = useRef(0)

  useEffect(() => { animateRef.current = animate }, [animate])

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const GRID_SPACING_X = 60
    const GRID_SPACING_Y = 60
    const NUM_PULSES = 10
    const MAX_TRAIL_LENGTH = 18
    const TRAIL_FADE_RATE = 0.05

    const rebuild = (w: number, h: number) => {
      const { junctions, traces } = buildCircuitNetwork(w, h, GRID_SPACING_X, GRID_SPACING_Y)
      junctionsRef.current = junctions
      tracesRef.current = traces
      pulsesRef.current = createPulses(NUM_PULSES, traces, junctions)
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      rebuild(rect.width, rect.height)
    }
    resize()
    window.addEventListener('resize', resize)

    let currentOpacity = 0.2

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      const junctions = junctionsRef.current
      const traces = tracesRef.current
      const pulses = pulsesRef.current

      if (junctions.length === 0 || traces.length === 0) {
        animFrameRef.current = requestAnimationFrame(draw)
        return
      }

      // -- Draw static traces (faint PCB lines) --
      for (const trace of traces) {
        const fromJ = junctions[trace.from]
        const toJ = junctions[trace.to]
        if (!fromJ || !toJ) continue

        ctx.beginPath()
        ctx.moveTo(fromJ.x, fromJ.y)

        // PCB-style 90-degree routing: horizontal then vertical
        if (fromJ.y !== toJ.y && fromJ.x !== toJ.x) {
          // Route with a corner: go horizontal first, then vertical
          ctx.lineTo(toJ.x, fromJ.y)
          ctx.lineTo(toJ.x, toJ.y)
        } else {
          ctx.lineTo(toJ.x, toJ.y)
        }

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * currentOpacity})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // -- Draw junction nodes --
      for (const junction of junctions) {
        if (junction.connections.length < 2) continue
        ctx.beginPath()
        ctx.arc(junction.x, junction.y, 2.5 + Math.min(junction.connections.length - 2, 2) * 0.8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.22 * currentOpacity})`
        ctx.fill()
      }

      // -- Update and draw pulses --
      if (animateRef.current) {
        for (const pulse of pulses) {
          // Update position
          pulse.progress += pulse.speed

          // Record trail position
          const pos = getJunctionPosition(pulse, traces, junctions)
          pulse.trail.unshift({ x: pos.x, y: pos.y, age: 0 })
          if (pulse.trail.length > MAX_TRAIL_LENGTH) {
            pulse.trail.pop()
          }

          // Age trail segments
          for (const t of pulse.trail) {
            t.age += TRAIL_FADE_RATE
          }

          // When pulse reaches end of a trace, pick next
          if (pulse.progress >= 1) {
            pulse.progress = 0
            const arrivedAt = getEndJunction(pulse, traces)
            const junction = junctions[arrivedAt]
            if (junction && junction.connections.length > 0) {
              // Pick a random connected trace (avoid going back the same way if possible)
              const otherTraces = junction.connections.filter(ti => ti !== pulse.currentTrace)
              const candidates = otherTraces.length > 0 ? otherTraces : junction.connections
              const nextTraceIdx = candidates[Math.floor(Math.random() * candidates.length)]
              const nextTrace = traces[nextTraceIdx]
              pulse.currentTrace = nextTraceIdx

              // Determine direction: if arrivedAt is 'from', go forward; if 'to', go backward
              if (nextTrace.from === arrivedAt) {
                pulse.direction = 1
              } else {
                pulse.direction = -1
              }
            }
          }
        }

        // Pointer interaction: spawn a new pulse near pointer
        const ptr = pointerRef?.current
        if (ptr?.active) {
          const now = Date.now()
          if (now - lastPointerSpawnRef.current > 800 && pulses.length < 12) {
            lastPointerSpawnRef.current = now

            // Find nearest junction to pointer
            let nearestIdx = 0
            let nearestDist = Infinity
            for (let i = 0; i < junctions.length; i++) {
              const dx = ptr.x - junctions[i].x
              const dy = ptr.y - junctions[i].y
              const dist = dx * dx + dy * dy
              if (dist < nearestDist) {
                nearestDist = dist
                nearestIdx = i
              }
            }

            const nearJunction = junctions[nearestIdx]
            if (nearJunction && nearJunction.connections.length > 0) {
              const traceIdx = nearJunction.connections[
                Math.floor(Math.random() * nearJunction.connections.length)
              ]
              const trace = traces[traceIdx]
              pulses.push({
                currentTrace: traceIdx,
                direction: trace.from === nearestIdx ? 1 : -1,
                progress: 0,
                speed: 0.004 + Math.random() * 0.004,
                trail: [],
              })

              // Remove oldest extra pulses if too many
              while (pulses.length > 12) {
                pulses.shift()
              }
            }
          }
        }
      }

      // -- Draw pulse trails --
      for (const pulse of pulses) {
        for (let i = 1; i < pulse.trail.length; i++) {
          const t = pulse.trail[i]
          const prev = pulse.trail[i - 1]
          const alpha = Math.max(0, (0.5 - t.age * 0.22)) * currentOpacity
          if (alpha <= 0) continue

          ctx.beginPath()
          ctx.moveTo(prev.x, prev.y)
          ctx.lineTo(t.x, t.y)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }

      // -- Draw pulse heads (bright dots with glow) --
      for (const pulse of pulses) {
        const pos = getJunctionPosition(pulse, traces, junctions)

        // Outer glow
        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 14)
        glow.addColorStop(0, `rgba(255, 255, 255, ${0.55 * currentOpacity})`)
        glow.addColorStop(0.5, `rgba(255, 255, 255, ${0.18 * currentOpacity})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * currentOpacity})`
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
