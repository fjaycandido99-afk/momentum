'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface NewtonsCradleBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function NewtonsCradleBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: NewtonsCradleBackgroundProps) {
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

    const N = 5
    const R = 20
    const L = 180
    const g = 500
    const damping = 1.0
    const restitution = 1.0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const th = new Float64Array(N)   // angles
    const om = new Float64Array(N)   // angular velocities

    // Pull left ball back
    th[0] = -0.32

    let currentOpacity = 0.2
    let lastTime = performance.now()

    const draw = (now: number) => {
      const elapsed = Math.min((now - lastTime) / 1000, 0.04) // cap at 40ms
      lastTime = now

      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      const cx = w / 2
      const pivotY = topOffsetRef.current + (h - topOffsetRef.current) * 0.2
      const gap = R * 2.02
      const totalW = (N - 1) * gap
      const px: number[] = []
      for (let i = 0; i < N; i++) {
        px.push(cx - totalW / 2 + i * gap)
      }

      if (animateRef.current) {
        // Fixed-step Verlet-style integration
        const steps = 8
        const dt = elapsed / steps

        for (let s = 0; s < steps; s++) {
          // Pendulum gravity: α = -(g/L) * sin(θ)
          for (let i = 0; i < N; i++) {
            om[i] += -(g / L) * Math.sin(th[i]) * dt
            om[i] *= damping
            th[i] += om[i] * dt
          }

          // Resolve collisions — iterate until stable
          for (let iter = 0; iter < N; iter++) {
            for (let i = 0; i < N - 1; i++) {
              const x1 = px[i] + Math.sin(th[i]) * L
              const y1 = pivotY + Math.cos(th[i]) * L
              const x2 = px[i + 1] + Math.sin(th[i + 1]) * L
              const y2 = pivotY + Math.cos(th[i + 1]) * L
              const dx = x2 - x1
              const dy = y2 - y1
              const dist = Math.sqrt(dx * dx + dy * dy)

              if (dist < R * 2) {
                // Approaching?
                if (om[i] - om[i + 1] > 0) {
                  const tmp = om[i]
                  om[i] = om[i + 1] * restitution
                  om[i + 1] = tmp * restitution
                }
                // Push apart
                const overlap = (R * 2 - dist) * 0.5 / L
                th[i] -= overlap
                th[i + 1] += overlap
              }
            }
          }
        }

        // Pointer push
        const ptr = pointerRef?.current
        if (ptr?.active) {
          for (let i = 0; i < N; i++) {
            const bx = px[i] + Math.sin(th[i]) * L
            const by = pivotY + Math.cos(th[i]) * L
            const ddx = ptr.x - bx
            const ddy = ptr.y - by
            const dist = Math.sqrt(ddx * ddx + ddy * ddy)
            if (dist < 50 && dist > 1) {
              om[i] += (ptr.x < bx ? 1 : -1) * 0.12 * (1 - dist / 50)
            }
          }
        }
      }

      // --- Draw ---

      const barL = cx - totalW / 2 - R * 3
      const barR = cx + totalW / 2 + R * 3
      const barA = 0.5 * currentOpacity

      // Top bar
      ctx.beginPath()
      ctx.moveTo(barL, pivotY)
      ctx.lineTo(barR, pivotY)
      ctx.strokeStyle = `rgba(255,255,255,${barA})`
      ctx.lineWidth = 2
      ctx.stroke()

      // Pillars
      ctx.beginPath()
      ctx.moveTo(barL + 5, pivotY)
      ctx.lineTo(barL + 5, pivotY - 16)
      ctx.moveTo(barR - 5, pivotY)
      ctx.lineTo(barR - 5, pivotY - 16)
      ctx.strokeStyle = `rgba(255,255,255,${barA * 0.7})`
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.stroke()

      for (let i = 0; i < N; i++) {
        const bx = px[i] + Math.sin(th[i]) * L
        const by = pivotY + Math.cos(th[i]) * L
        const swing = Math.min(Math.abs(th[i]) / 0.35, 1)
        const bright = 0.5 + swing * 0.5

        // String
        ctx.beginPath()
        ctx.moveTo(px[i], pivotY)
        ctx.lineTo(bx, by)
        ctx.strokeStyle = `rgba(255,255,255,${0.35 * currentOpacity})`
        ctx.lineWidth = 1
        ctx.stroke()

        // Glow
        const gr = R * (2 + swing * 2.5)
        const ga = bright * currentOpacity * 0.3
        const glow = ctx.createRadialGradient(bx, by, R * 0.3, bx, by, gr)
        glow.addColorStop(0, `rgba(255,255,255,${ga})`)
        glow.addColorStop(0.4, `rgba(255,255,255,${ga * 0.3})`)
        glow.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.beginPath()
        ctx.arc(bx, by, gr, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Ball fill
        const a = bright * currentOpacity
        ctx.beginPath()
        ctx.arc(bx, by, R, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a * 0.2})`
        ctx.fill()

        // Ball outline
        ctx.strokeStyle = `rgba(255,255,255,${a})`
        ctx.lineWidth = 2
        ctx.stroke()

        // Highlight spot
        ctx.beginPath()
        ctx.arc(bx - R * 0.25, by - R * 0.25, R * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a * 0.45})`
        ctx.fill()
      }

      // Motion trails
      for (let i = 0; i < N; i++) {
        const speed = Math.abs(om[i])
        if (speed > 0.2) {
          const bx = px[i] + Math.sin(th[i]) * L
          const by = pivotY + Math.cos(th[i]) * L
          const prev = th[i] - om[i] * 0.06
          const ppx = px[i] + Math.sin(prev) * L
          const ppy = pivotY + Math.cos(prev) * L
          const ta = Math.min(speed * 0.4, 0.25) * currentOpacity

          const grad = ctx.createLinearGradient(ppx, ppy, bx, by)
          grad.addColorStop(0, 'rgba(255,255,255,0)')
          grad.addColorStop(1, `rgba(255,255,255,${ta})`)
          ctx.beginPath()
          ctx.moveTo(ppx, ppy)
          ctx.lineTo(bx, by)
          ctx.strokeStyle = grad
          ctx.lineWidth = R * 1.4
          ctx.lineCap = 'round'
          ctx.stroke()
        }
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
