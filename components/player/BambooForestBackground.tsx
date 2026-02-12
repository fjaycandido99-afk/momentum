'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface BambooStalk {
  x: number
  baseY: number
  height: number
  width: number
  segments: number
  swayPhase: number
  swaySpeed: number
  swayAmount: number
  brightness: number
}

interface Leaf {
  angle: number
  length: number
  stalkIndex: number
  segmentIndex: number
}

interface BambooForestBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function BambooForestBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: BambooForestBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stalksRef = useRef<BambooStalk[]>([])
  const leavesRef = useRef<Leaf[]>([])
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

    // Create bamboo stalks
    const rect = canvas.getBoundingClientRect()
    const NUM_STALKS = 8 + Math.floor(Math.random() * 5)
    stalksRef.current = []
    leavesRef.current = []

    for (let i = 0; i < NUM_STALKS; i++) {
      const x = rect.width * 0.05 + (i / (NUM_STALKS - 1)) * rect.width * 0.9 + (Math.random() - 0.5) * 30
      const h = rect.height * (0.5 + Math.random() * 0.4)
      const stalk: BambooStalk = {
        x,
        baseY: rect.height,
        height: h,
        width: 3 + Math.random() * 4,
        segments: 5 + Math.floor(Math.random() * 4),
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.008 + Math.random() * 0.012,
        swayAmount: 3 + Math.random() * 6,
        brightness: 0.35 + Math.random() * 0.35,
      }
      stalksRef.current.push(stalk)

      // Add leaves at segment joints
      for (let s = 1; s < stalk.segments; s++) {
        if (Math.random() > 0.4) {
          const side = Math.random() > 0.5 ? 1 : -1
          leavesRef.current.push({
            angle: side * (0.3 + Math.random() * 0.5),
            length: 12 + Math.random() * 18,
            stalkIndex: i,
            segmentIndex: s,
          })
        }
      }
    }

    let currentOpacity = 0.2
    let time = 0
    let windStrength = 0
    let windTarget = 0
    let windTimer = 0

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) {
        time += 0.016
        windTimer++
        if (windTimer > 150 + Math.random() * 250) {
          windTarget = (Math.random() - 0.5) * 8
          windTimer = 0
        }
        windStrength += (windTarget - windStrength) * 0.015
        if (Math.abs(windStrength) > 0.1) windTarget *= 0.97
      }

      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      for (let si = 0; si < stalksRef.current.length; si++) {
        const stalk = stalksRef.current[si]
        if (animateRef.current) {
          stalk.swayPhase += stalk.swaySpeed
        }

        const sway = Math.sin(stalk.swayPhase) * stalk.swayAmount + windStrength
        const alpha = stalk.brightness * currentOpacity
        const segH = stalk.height / stalk.segments

        // Draw stalk segments
        for (let s = 0; s < stalk.segments; s++) {
          const t0 = s / stalk.segments
          const t1 = (s + 1) / stalk.segments
          const sway0 = sway * t0 * t0
          const sway1 = sway * t1 * t1

          const x0 = stalk.x + sway0
          const y0 = stalk.baseY - stalk.height * t0
          const x1 = stalk.x + sway1
          const y1 = stalk.baseY - stalk.height * t1

          // Pointer pushes stalks
          let pushX = 0
          if (ptrActive && ptr) {
            const midY = (y0 + y1) / 2
            const dx = stalk.x - ptr.x
            const dy = midY - ptr.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 80 && dist > 1) {
              pushX = (dx / dist) * (1 - dist / 80) * 15 * t1
            }
          }

          // Stalk line
          ctx.beginPath()
          ctx.moveTo(x0 + pushX * t0, y0)
          ctx.lineTo(x1 + pushX, y1)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.lineWidth = stalk.width * (1 - t1 * 0.3)
          ctx.lineCap = 'round'
          ctx.stroke()

          // Node ring at each joint
          if (s > 0) {
            ctx.beginPath()
            ctx.arc(x0 + pushX * t0, y0, stalk.width * 0.7, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }

        // Draw leaves for this stalk
        for (const leaf of leavesRef.current) {
          if (leaf.stalkIndex !== si) continue
          const t = leaf.segmentIndex / stalk.segments
          const jointX = stalk.x + sway * t * t
          const jointY = stalk.baseY - stalk.height * t

          const leafSway = Math.sin(stalk.swayPhase + leaf.segmentIndex) * 0.15
          const a = leaf.angle + leafSway
          const endX = jointX + Math.cos(a) * leaf.length
          const endY = jointY + Math.sin(a) * leaf.length * 0.6

          ctx.beginPath()
          ctx.moveTo(jointX, jointY)
          ctx.quadraticCurveTo(
            jointX + Math.cos(a) * leaf.length * 0.5,
            jointY + Math.sin(a) * leaf.length * 0.3 - 3,
            endX, endY
          )
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`
          ctx.lineWidth = 1.2
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
