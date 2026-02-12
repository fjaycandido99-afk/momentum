'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Fragment {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  brightness: number
  life: number
  maxLife: number
}

interface Shape {
  x: number
  y: number
  points: { x: number; y: number }[]
  scale: number
  targetScale: number
  rotation: number
  rotSpeed: number
  buildPhase: number   // 0–1: forming
  holdPhase: number    // 0–1: holding together
  dissolvePhase: number // 0–1: breaking apart
  phase: 'build' | 'hold' | 'dissolve' | 'dead'
  fragments: Fragment[]
  brightness: number
}

interface DissolutionBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

function randomShape(): { x: number; y: number }[] {
  const type = Math.floor(Math.random() * 4)
  const points: { x: number; y: number }[] = []

  if (type === 0) {
    // Triangle
    const size = 25 + Math.random() * 35
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 - Math.PI / 2
      points.push({ x: Math.cos(angle) * size, y: Math.sin(angle) * size })
    }
  } else if (type === 1) {
    // Square/diamond
    const size = 20 + Math.random() * 30
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
      points.push({ x: Math.cos(angle) * size, y: Math.sin(angle) * size })
    }
  } else if (type === 2) {
    // Pentagon
    const size = 22 + Math.random() * 28
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
      points.push({ x: Math.cos(angle) * size, y: Math.sin(angle) * size })
    }
  } else {
    // Circle approximation (8-gon)
    const size = 18 + Math.random() * 25
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      points.push({ x: Math.cos(angle) * size, y: Math.sin(angle) * size })
    }
  }
  return points
}

function spawnShape(w: number, h: number, topOffset: number): Shape {
  return {
    x: w * 0.15 + Math.random() * w * 0.7,
    y: topOffset + (h - topOffset) * 0.15 + Math.random() * (h - topOffset) * 0.7,
    points: randomShape(),
    scale: 0,
    targetScale: 1,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.003,
    buildPhase: 0,
    holdPhase: 0,
    dissolvePhase: 0,
    phase: 'build',
    fragments: [],
    brightness: 0.5 + Math.random() * 0.4,
  }
}

export function DissolutionBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: DissolutionBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const shapesRef = useRef<Shape[]>([])
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
    let spawnTimer = 0

    // Seed with a couple of shapes in various phases
    const rect = canvas.getBoundingClientRect()
    for (let i = 0; i < 2; i++) {
      const s = spawnShape(rect.width, rect.height, topOffsetRef.current)
      s.buildPhase = 0.5 + Math.random() * 0.5
      s.scale = s.buildPhase
      shapesRef.current.push(s)
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      if (animateRef.current) {
        spawnTimer++
        if (spawnTimer > 120 + Math.random() * 180) {
          if (shapesRef.current.length < 5) {
            shapesRef.current.push(spawnShape(w, h, topOffsetRef.current))
          }
          spawnTimer = 0
        }
      }

      const activeShapes: Shape[] = []
      for (const s of shapesRef.current) {
        if (animateRef.current) {
          s.rotation += s.rotSpeed

          // Pointer can accelerate dissolution
          if (ptrActive && ptr && s.phase !== 'dead') {
            const dx = ptr.x - s.x
            const dy = ptr.y - s.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 80) {
              if (s.phase === 'hold') {
                s.holdPhase = 1 // skip to dissolve
              } else if (s.phase === 'build') {
                s.buildPhase = Math.min(s.buildPhase + 0.02, 1)
              }
            }
          }

          if (s.phase === 'build') {
            s.buildPhase += 0.006
            s.scale += (s.targetScale - s.scale) * 0.04
            if (s.buildPhase >= 1) {
              s.phase = 'hold'
              s.scale = 1
            }
          } else if (s.phase === 'hold') {
            s.holdPhase += 0.004
            if (s.holdPhase >= 1) {
              s.phase = 'dissolve'
              // Spawn fragments from each point
              for (const pt of s.points) {
                const wx = s.x + pt.x * Math.cos(s.rotation) - pt.y * Math.sin(s.rotation)
                const wy = s.y + pt.x * Math.sin(s.rotation) + pt.y * Math.cos(s.rotation)
                const count = 3 + Math.floor(Math.random() * 4)
                for (let i = 0; i < count; i++) {
                  const angle = Math.random() * Math.PI * 2
                  const speed = 0.3 + Math.random() * 1.2
                  s.fragments.push({
                    x: wx + (Math.random() - 0.5) * 4,
                    y: wy + (Math.random() - 0.5) * 4,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: 0.5 + Math.random() * 1.2,
                    brightness: s.brightness * (0.5 + Math.random() * 0.5),
                    life: 0,
                    maxLife: 60 + Math.floor(Math.random() * 80),
                  })
                }
              }
              // Also spawn fragments along edges
              for (let i = 0; i < s.points.length; i++) {
                const p1 = s.points[i]
                const p2 = s.points[(i + 1) % s.points.length]
                const midX = (p1.x + p2.x) / 2
                const midY = (p1.y + p2.y) / 2
                const wx = s.x + midX * Math.cos(s.rotation) - midY * Math.sin(s.rotation)
                const wy = s.y + midX * Math.sin(s.rotation) + midY * Math.cos(s.rotation)
                const count = 2 + Math.floor(Math.random() * 3)
                for (let j = 0; j < count; j++) {
                  const angle = Math.random() * Math.PI * 2
                  const speed = 0.2 + Math.random() * 0.8
                  s.fragments.push({
                    x: wx,
                    y: wy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: 0.4 + Math.random() * 0.8,
                    brightness: s.brightness * (0.3 + Math.random() * 0.4),
                    life: 0,
                    maxLife: 50 + Math.floor(Math.random() * 60),
                  })
                }
              }
            }
          } else if (s.phase === 'dissolve') {
            s.dissolvePhase += 0.008
            s.scale *= 0.97

            // Update fragments
            const aliveFrags: Fragment[] = []
            for (const f of s.fragments) {
              f.life++
              f.x += f.vx
              f.y += f.vy
              f.vx *= 0.99
              f.vy *= 0.99
              f.vy += 0.005 // subtle gravity
              if (f.life < f.maxLife) aliveFrags.push(f)
            }
            s.fragments = aliveFrags

            if (s.dissolvePhase >= 1 && s.fragments.length === 0) {
              s.phase = 'dead'
            }
          }
        }

        if (s.phase === 'dead') continue
        activeShapes.push(s)

        // Draw the shape outline (fading during dissolve)
        if (s.phase !== 'dissolve' || s.dissolvePhase < 0.5) {
          const shapeFade = s.phase === 'dissolve' ? (1 - s.dissolvePhase * 2) :
                            s.phase === 'build' ? s.buildPhase : 1
          const alpha = s.brightness * shapeFade * currentOpacity

          ctx.save()
          ctx.translate(s.x, s.y)
          ctx.rotate(s.rotation)
          ctx.scale(s.scale, s.scale)

          // Draw outline
          ctx.beginPath()
          ctx.moveTo(s.points[0].x, s.points[0].y)
          for (let i = 1; i < s.points.length; i++) {
            ctx.lineTo(s.points[i].x, s.points[i].y)
          }
          ctx.closePath()
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.lineWidth = 1.2
          ctx.stroke()

          // Faint fill
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.08})`
          ctx.fill()

          // Draw vertices as bright dots
          for (const pt of s.points) {
            ctx.beginPath()
            ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`
            ctx.fill()
          }

          ctx.restore()
        }

        // Draw fragments
        for (const f of s.fragments) {
          const lifeRatio = f.life / f.maxLife
          const fade = lifeRatio > 0.5 ? (1 - lifeRatio) / 0.5 : 1
          const alpha = f.brightness * fade * currentOpacity

          // Small glow
          const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 3)
          glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.4})`)
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.radius * 3, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()

          // Core
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.fill()
        }
      }
      shapesRef.current = activeShapes

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
