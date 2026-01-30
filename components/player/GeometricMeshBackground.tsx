'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface GeometricMeshBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
}

// Icosahedron: 12 vertices, 30 edges
// Vertices use golden ratio construction
const PHI = (1 + Math.sqrt(5)) / 2

const VERTICES: [number, number, number][] = [
  [-1,  PHI, 0], [ 1,  PHI, 0], [-1, -PHI, 0], [ 1, -PHI, 0],
  [0, -1,  PHI], [0,  1,  PHI], [0, -1, -PHI], [0,  1, -PHI],
  [ PHI, 0, -1], [ PHI, 0,  1], [-PHI, 0, -1], [-PHI, 0,  1],
]

const EDGES: [number, number][] = [
  [0,1],[0,5],[0,7],[0,10],[0,11],
  [1,5],[1,7],[1,8],[1,9],
  [2,3],[2,4],[2,6],[2,10],[2,11],
  [3,4],[3,6],[3,8],[3,9],
  [4,5],[4,9],[4,11],
  [5,9],[5,11],
  [6,7],[6,8],[6,10],
  [7,8],[7,10],
  [8,9],
  [10,11],
]

function rotateY(v: [number, number, number], a: number): [number, number, number] {
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return [v[0] * cos + v[2] * sin, v[1], -v[0] * sin + v[2] * cos]
}

function rotateX(v: [number, number, number], a: number): [number, number, number] {
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return [v[0], v[1] * cos - v[2] * sin, v[1] * sin + v[2] * cos]
}

function rotateZ(v: [number, number, number], a: number): [number, number, number] {
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return [v[0] * cos - v[1] * sin, v[0] * sin + v[1] * cos, v[2]]
}

export function GeometricMeshBackground({
  animate = true,
  className = '',
  pointerRef,
}: GeometricMeshBackgroundProps) {
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
    let yaw = 0
    let pitch = 0
    let roll = 0
    let pointerYawBias = 0
    let pointerPitchBias = 0

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const cx = w / 2
      const cy = h / 2
      const scale = Math.min(w, h) * 0.25
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) {
        yaw += 0.003
        pitch += 0.0015
        roll += 0.001

        // Pointer-biased rotation
        const ptr = pointerRef?.current
        if (ptr?.active) {
          const targetYawBias = ((ptr.x - cx) / cx) * 0.4
          const targetPitchBias = ((ptr.y - cy) / cy) * 0.3
          pointerYawBias += (targetYawBias - pointerYawBias) * 0.05
          pointerPitchBias += (targetPitchBias - pointerPitchBias) * 0.05
        } else {
          pointerYawBias *= 0.95
          pointerPitchBias *= 0.95
        }
      }

      // Project vertices — keep z for depth sorting
      const projected = VERTICES.map(v => {
        let r = rotateY(v, yaw + pointerYawBias)
        r = rotateX(r, pitch + pointerPitchBias)
        r = rotateZ(r, roll)
        return { x: cx + r[0] * scale, y: cy + r[1] * scale, z: r[2] }
      })

      // Draw edges with depth-based opacity (farther = dimmer)
      for (const [a, b] of EDGES) {
        const avgZ = (projected[a].z + projected[b].z) / 2
        const depthFactor = 0.3 + 0.7 * ((avgZ + PHI) / (2 * PHI))
        ctx.beginPath()
        ctx.moveTo(projected[a].x, projected[a].y)
        ctx.lineTo(projected[b].x, projected[b].y)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * depthFactor * currentOpacity})`
        ctx.lineWidth = 0.5 + depthFactor * 0.5
        ctx.stroke()
      }

      // Draw vertices with depth-based size + glow
      for (const p of projected) {
        const depthFactor = 0.3 + 0.7 * ((p.z + PHI) / (2 * PHI))
        const radius = 1.5 + depthFactor * 1.5

        // Soft glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3)
        glow.addColorStop(0, `rgba(255, 255, 255, ${0.15 * depthFactor * currentOpacity})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * depthFactor * currentOpacity})`
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
