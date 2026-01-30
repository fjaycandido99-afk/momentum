'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface HexGridBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
}

interface HexCell {
  cx: number
  cy: number
  col: number
  row: number
  brightness: number
  targetBrightness: number
  fadeSpeed: number
  traceProgress: number    // 0-1, how far the border trace has drawn
  tracePhase: 'idle' | 'drawing' | 'fading'
  startCorner: number      // which corner the trace starts from (0-5)
}

/** Return the 6 corner points of a flat-topped hexagon centred at (cx,cy). */
function hexCorners(cx: number, cy: number, r: number): [number, number][] {
  const corners: [number, number][] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    corners.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
  }
  return corners
}

/** Get a point along the hex perimeter at progress t (0-1), starting from corner startIdx. */
function hexPerimeterPoint(
  corners: [number, number][],
  t: number,
  startIdx: number
): [number, number] {
  const totalEdges = 6
  const edgeProgress = t * totalEdges
  const edgeIdx = Math.min(Math.floor(edgeProgress), totalEdges - 1)
  const localT = edgeProgress - edgeIdx

  const fromIdx = (startIdx + edgeIdx) % 6
  const toIdx = (startIdx + edgeIdx + 1) % 6

  return [
    corners[fromIdx][0] + (corners[toIdx][0] - corners[fromIdx][0]) * localT,
    corners[fromIdx][1] + (corners[toIdx][1] - corners[fromIdx][1]) * localT,
  ]
}

const TOP_OFFSET = 120

function buildHexGrid(w: number, h: number, radius: number): HexCell[] {
  const cells: HexCell[] = []
  const hexWidth = radius * 2
  const hexHeight = Math.sqrt(3) * radius
  const colSpacing = hexWidth * 0.75
  const rowSpacing = hexHeight

  const startX = -radius
  const startY = TOP_OFFSET - radius

  const cols = Math.ceil((w - startX) / colSpacing) + 2
  const rows = Math.ceil((h - startY) / rowSpacing) + 2

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const cx = startX + col * colSpacing
      const cy = startY + row * rowSpacing + (col % 2 === 1 ? hexHeight / 2 : 0)
      cells.push({
        cx, cy, col, row,
        brightness: 0,
        targetBrightness: 0,
        fadeSpeed: 0,
        traceProgress: 0,
        tracePhase: 'idle',
        startCorner: 0,
      })
    }
  }

  return cells
}

export function HexGridBackground({
  animate = true,
  className = '',
  pointerRef,
}: HexGridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cellsRef = useRef<HexCell[]>([])
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)

  useEffect(() => { animateRef.current = animate }, [animate])

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const HEX_RADIUS = 70
    const MIN_LIT = 8
    const MAX_LIT = 15
    const GLOW_MIN = 0.25
    const GLOW_MAX = 0.55
    const TRACE_SPEED_MIN = 0.006   // progress per frame (full trace in ~167 frames / ~2.8s)
    const TRACE_SPEED_MAX = 0.012   // full trace in ~83 frames / ~1.4s
    const FADE_DURATION_MIN = 1500
    const FADE_DURATION_MAX = 2500
    const SPARK_INTERVAL_MIN = 150
    const SPARK_INTERVAL_MAX = 400
    const POINTER_RADIUS = 220
    const POINTER_BOOST = 0.35
    const TRACE_TAIL_LENGTH = 0.3   // how much of the perimeter the glowing tail covers

    let lastSparkTime = 0
    let nextSparkDelay = SPARK_INTERVAL_MIN + Math.random() * (SPARK_INTERVAL_MAX - SPARK_INTERVAL_MIN)

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      cellsRef.current = buildHexGrid(rect.width, rect.height, HEX_RADIUS)
    }
    resize()
    window.addEventListener('resize', resize)

    const sparkCell = () => {
      const cells = cellsRef.current
      if (cells.length === 0) return

      const unlit: number[] = []
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].tracePhase === 'idle' && cells[i].brightness < 0.01) {
          unlit.push(i)
        }
      }
      if (unlit.length === 0) return

      const idx = unlit[Math.floor(Math.random() * unlit.length)]
      const cell = cells[idx]
      const peak = GLOW_MIN + Math.random() * (GLOW_MAX - GLOW_MIN)
      cell.targetBrightness = peak
      cell.brightness = peak
      cell.traceProgress = 0
      cell.tracePhase = 'drawing'
      cell.startCorner = Math.floor(Math.random() * 6)
      cell.fadeSpeed = TRACE_SPEED_MIN + Math.random() * (TRACE_SPEED_MAX - TRACE_SPEED_MIN)
    }

    let currentOpacity = 0.2

    const draw = (timestamp: number) => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      const cells = cellsRef.current
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      // -- Spark logic --
      if (animateRef.current) {
        if (timestamp - lastSparkTime > nextSparkDelay) {
          let litCount = 0
          for (const c of cells) {
            if (c.tracePhase !== 'idle') litCount++
          }

          const needed = Math.max(0, MIN_LIT - litCount)
          const allowed = MAX_LIT - litCount

          if (needed > 0) {
            for (let i = 0; i < needed; i++) sparkCell()
          } else if (allowed > 0 && Math.random() < 0.5) {
            sparkCell()
          }

          lastSparkTime = timestamp
          nextSparkDelay = SPARK_INTERVAL_MIN + Math.random() * (SPARK_INTERVAL_MAX - SPARK_INTERVAL_MIN)
        }

        // Update cells
        for (const c of cells) {
          if (c.tracePhase === 'drawing') {
            c.traceProgress += c.fadeSpeed
            if (c.traceProgress >= 1) {
              c.traceProgress = 1
              c.tracePhase = 'fading'
              const fadeDuration = FADE_DURATION_MIN + Math.random() * (FADE_DURATION_MAX - FADE_DURATION_MIN)
              c.fadeSpeed = c.brightness / (fadeDuration / 16)
            }
          } else if (c.tracePhase === 'fading') {
            c.brightness -= c.fadeSpeed
            if (c.brightness <= 0) {
              c.brightness = 0
              c.targetBrightness = 0
              c.tracePhase = 'idle'
              c.traceProgress = 0
            }
          }
        }
      }

      // -- Draw dim hex outlines for all cells --
      ctx.lineWidth = 0.5
      for (const c of cells) {
        const corners = hexCorners(c.cx, c.cy, HEX_RADIUS)
        const baseAlpha = 0.08 * currentOpacity

        let outlineAlpha = baseAlpha
        if (ptrActive && ptr) {
          const dx = ptr.x - c.cx
          const dy = ptr.y - c.cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < POINTER_RADIUS) {
            const proximity = 1 - dist / POINTER_RADIUS
            outlineAlpha += proximity * 0.06 * currentOpacity
          }
        }

        ctx.beginPath()
        ctx.moveTo(corners[0][0], corners[0][1])
        for (let i = 1; i < 6; i++) {
          ctx.lineTo(corners[i][0], corners[i][1])
        }
        ctx.closePath()
        ctx.strokeStyle = `rgba(255, 255, 255, ${outlineAlpha})`
        ctx.stroke()
      }

      // -- Draw border traces on active cells --
      for (const c of cells) {
        if (c.tracePhase === 'idle') continue

        let glow = c.brightness
        if (ptrActive && ptr) {
          const dx = ptr.x - c.cx
          const dy = ptr.y - c.cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < POINTER_RADIUS) {
            const proximity = 1 - dist / POINTER_RADIUS
            glow += proximity * POINTER_BOOST
          }
        }

        const corners = hexCorners(c.cx, c.cy, HEX_RADIUS)
        const alpha = glow * currentOpacity

        if (c.tracePhase === 'drawing') {
          // Draw the traced portion of the border with a bright head and fading tail
          const headT = c.traceProgress
          const tailT = Math.max(0, headT - TRACE_TAIL_LENGTH)
          const segments = 40
          const segStep = (headT - tailT) / segments

          // Draw glowing trail segments
          ctx.lineCap = 'round'
          for (let s = 0; s < segments; s++) {
            const t0 = tailT + s * segStep
            const t1 = tailT + (s + 1) * segStep
            const segProgress = (s + 1) / segments  // 0 at tail, 1 at head

            const p0 = hexPerimeterPoint(corners, t0, c.startCorner)
            const p1 = hexPerimeterPoint(corners, t1, c.startCorner)

            const segAlpha = alpha * (0.1 + 0.9 * segProgress)
            ctx.beginPath()
            ctx.moveTo(p0[0], p0[1])
            ctx.lineTo(p1[0], p1[1])
            ctx.lineWidth = 1 + segProgress * 1.5
            ctx.strokeStyle = `rgba(255, 255, 255, ${segAlpha})`
            ctx.stroke()
          }

          // Draw bright glow dot at the head
          const headPoint = hexPerimeterPoint(corners, headT, c.startCorner)
          const headGradient = ctx.createRadialGradient(
            headPoint[0], headPoint[1], 0,
            headPoint[0], headPoint[1], 12
          )
          headGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`)
          headGradient.addColorStop(0.4, `rgba(255, 255, 255, ${alpha * 0.3})`)
          headGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.beginPath()
          ctx.arc(headPoint[0], headPoint[1], 12, 0, Math.PI * 2)
          ctx.fillStyle = headGradient
          ctx.fill()

          // Also draw the already-traced portion as a dim persistent border
          if (headT > TRACE_TAIL_LENGTH) {
            const persistStart = 0
            const persistEnd = tailT
            const persistSegments = Math.max(1, Math.floor(persistEnd * 30))
            const pStep = (persistEnd - persistStart) / persistSegments

            ctx.lineWidth = 1
            ctx.lineCap = 'round'
            for (let s = 0; s < persistSegments; s++) {
              const t0 = persistStart + s * pStep
              const t1 = persistStart + (s + 1) * pStep
              const p0 = hexPerimeterPoint(corners, t0, c.startCorner)
              const p1 = hexPerimeterPoint(corners, t1, c.startCorner)
              ctx.beginPath()
              ctx.moveTo(p0[0], p0[1])
              ctx.lineTo(p1[0], p1[1])
              ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.25})`
              ctx.stroke()
            }
          }
        } else if (c.tracePhase === 'fading') {
          // Full border drawn, fading out
          ctx.beginPath()
          ctx.moveTo(corners[0][0], corners[0][1])
          for (let i = 1; i < 6; i++) {
            ctx.lineTo(corners[i][0], corners[i][1])
          }
          ctx.closePath()
          ctx.lineWidth = 1.5
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
          ctx.stroke()

          // Subtle inner glow while fading
          const fadeGradient = ctx.createRadialGradient(
            c.cx, c.cy, 0,
            c.cx, c.cy, HEX_RADIUS * 0.8
          )
          fadeGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.08})`)
          fadeGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.beginPath()
          ctx.arc(c.cx, c.cy, HEX_RADIUS * 0.8, 0, Math.PI * 2)
          ctx.fillStyle = fadeGradient
          ctx.fill()
        }
      }

      // -- Pointer proximity glow on idle cells --
      if (ptrActive && ptr) {
        for (const c of cells) {
          if (c.tracePhase !== 'idle') continue
          const dx = ptr.x - c.cx
          const dy = ptr.y - c.cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < POINTER_RADIUS) {
            const proximity = 1 - dist / POINTER_RADIUS
            const hoverAlpha = proximity * POINTER_BOOST * 0.4 * currentOpacity

            const corners = hexCorners(c.cx, c.cy, HEX_RADIUS)
            ctx.beginPath()
            ctx.moveTo(corners[0][0], corners[0][1])
            for (let i = 1; i < 6; i++) {
              ctx.lineTo(corners[i][0], corners[i][1])
            }
            ctx.closePath()
            ctx.lineWidth = 1.2
            ctx.strokeStyle = `rgba(255, 255, 255, ${hoverAlpha})`
            ctx.stroke()
          }
        }
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
