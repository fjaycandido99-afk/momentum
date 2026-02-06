'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface GeometricMeshBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
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
  topOffset = 50,
}: GeometricMeshBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

    let currentOpacity = 0.2
    let yaw = 0
    let pitch = 0
    let roll = 0
    let pointerYawBias = 0
    let pointerPitchBias = 0
    let time = 0

    // Triangular faces of the icosahedron for subtle fills
    const FACES: [number, number, number][] = [
      [0,1,5],[0,5,11],[0,11,10],[0,10,7],[0,7,1],
      [1,9,5],[5,4,11],[11,2,10],[10,6,7],[7,8,1],
      [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
      [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
    ]

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const cx = w / 2
      const cy = topOffsetRef.current + (h - topOffsetRef.current) / 2

      // Breathing scale pulse
      const breathe = 1 + 0.04 * Math.sin(time * 0.6)
      const baseScale = Math.min(w, h - topOffsetRef.current) * 0.25
      const scale = baseScale * breathe

      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) {
        time += 0.016
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

      // Draw subtle face fills on front-facing triangles
      for (const [a, b, c] of FACES) {
        const avgZ = (projected[a].z + projected[b].z + projected[c].z) / 3
        if (avgZ < 0) continue // only front-facing
        const depthFactor = 0.3 + 0.7 * ((avgZ + PHI) / (2 * PHI))
        const faceAlpha = 0.02 * depthFactor * currentOpacity

        ctx.beginPath()
        ctx.moveTo(projected[a].x, projected[a].y)
        ctx.lineTo(projected[b].x, projected[b].y)
        ctx.lineTo(projected[c].x, projected[c].y)
        ctx.closePath()
        ctx.fillStyle = `rgba(255, 255, 255, ${faceAlpha})`
        ctx.fill()
      }

      // Draw edges with depth-based opacity (farther = dimmer)
      for (const [a, b] of EDGES) {
        const avgZ = (projected[a].z + projected[b].z) / 2
        const depthFactor = 0.3 + 0.7 * ((avgZ + PHI) / (2 * PHI))
        ctx.beginPath()
        ctx.moveTo(projected[a].x, projected[a].y)
        ctx.lineTo(projected[b].x, projected[b].y)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 * depthFactor * currentOpacity})`
        ctx.lineWidth = 0.5 + depthFactor * 0.6
        ctx.stroke()
      }

      // Draw vertices with depth-based size + glow + pulsing
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i]
        const depthFactor = 0.3 + 0.7 * ((p.z + PHI) / (2 * PHI))
        const pulse = 0.8 + 0.2 * Math.sin(time * 1.2 + i * 0.8)
        const radius = (1.5 + depthFactor * 1.5) * pulse

        // Soft glow
        const glowRadius = radius * 3.5
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius)
        glow.addColorStop(0, `rgba(255, 255, 255, ${0.18 * depthFactor * pulse * currentOpacity})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2)
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
