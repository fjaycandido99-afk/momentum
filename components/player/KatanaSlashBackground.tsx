'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Slash {
  x: number
  y: number
  angle: number
  length: number
  width: number
  progress: number
  speed: number
  brightness: number
  fadeOut: number
}

interface KatanaSlashBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function KatanaSlashBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: KatanaSlashBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const slashesRef = useRef<Slash[]>([])
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

    const spawnSlash = (x?: number, y?: number) => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const angles = [-0.3, -0.5, -0.8, 0.3, 0.5, 0.8, -Math.PI / 4, Math.PI / 4, -Math.PI * 0.6, Math.PI * 0.6]
      slashesRef.current.push({
        x: x ?? w * 0.15 + Math.random() * w * 0.7,
        y: y ?? topOffsetRef.current + Math.random() * (h - topOffsetRef.current) * 0.8,
        angle: angles[Math.floor(Math.random() * angles.length)],
        length: 80 + Math.random() * 160,
        width: 1.5 + Math.random() * 2,
        progress: 0,
        speed: 0.04 + Math.random() * 0.03,
        brightness: 0.5 + Math.random() * 0.4,
        fadeOut: 0,
      })
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
        if (spawnTimer > 60 + Math.random() * 120) {
          if (slashesRef.current.length < 6) {
            spawnSlash()
          }
          spawnTimer = 0
        }

        // Pointer triggers slash
        if (ptrActive && ptr) {
          const hasRecent = slashesRef.current.some(s =>
            s.progress < 0.3 && Math.sqrt((s.x - ptr.x) ** 2 + (s.y - ptr.y) ** 2) < 60
          )
          if (!hasRecent && slashesRef.current.length < 8) {
            spawnSlash(ptr.x, ptr.y)
          }
        }
      }

      const alive: Slash[] = []
      for (const s of slashesRef.current) {
        if (animateRef.current) {
          if (s.progress < 1) {
            s.progress += s.speed
          } else {
            s.fadeOut += 0.02
          }
        }

        if (s.fadeOut >= 1) continue
        alive.push(s)

        const drawProgress = Math.min(s.progress, 1)
        const fade = s.fadeOut > 0 ? 1 - s.fadeOut : 1
        const alpha = s.brightness * fade * currentOpacity

        const cosA = Math.cos(s.angle)
        const sinA = Math.sin(s.angle)
        const halfLen = s.length / 2

        // Start and end points based on progress
        const startX = s.x - cosA * halfLen
        const startY = s.y - sinA * halfLen
        const endX = startX + cosA * s.length * drawProgress
        const endY = startY + sinA * s.length * drawProgress

        // Main slash line
        const slashGrad = ctx.createLinearGradient(startX, startY, endX, endY)
        slashGrad.addColorStop(0, 'rgba(255, 255, 255, 0)')
        slashGrad.addColorStop(0.1, `rgba(255, 255, 255, ${alpha * 0.3})`)
        slashGrad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`)
        slashGrad.addColorStop(0.9, `rgba(255, 255, 255, ${alpha * 0.5})`)
        slashGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.strokeStyle = slashGrad
        ctx.lineWidth = s.width
        ctx.lineCap = 'round'
        ctx.stroke()

        // Bright tip flash when slash is still drawing
        if (drawProgress < 1 && drawProgress > 0.1) {
          const tipGlow = ctx.createRadialGradient(endX, endY, 0, endX, endY, 8)
          tipGlow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.6})`)
          tipGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.beginPath()
          ctx.arc(endX, endY, 8, 0, Math.PI * 2)
          ctx.fillStyle = tipGlow
          ctx.fill()
        }

        // Thin secondary slash (slight offset for depth)
        if (drawProgress > 0.2) {
          const offset = s.width * 1.5
          const perpX = -sinA * offset
          const perpY = cosA * offset
          ctx.beginPath()
          ctx.moveTo(startX + perpX, startY + perpY)
          ctx.lineTo(
            startX + perpX + cosA * s.length * drawProgress * 0.6,
            startY + perpY + sinA * s.length * drawProgress * 0.6
          )
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.2})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
      slashesRef.current = alive

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
