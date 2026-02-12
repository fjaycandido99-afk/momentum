'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

/** Soft cloud-like smoke particle */
interface SmokePuff {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  maxRadius: number
  growRate: number
  brightness: number
  life: number
  maxLife: number
  wavePhase: number
  waveFreq: number
}

interface CigarSmokeBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function CigarSmokeBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: CigarSmokeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const puffsRef = useRef<SmokePuff[]>([])
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)
  const topOffsetRef = useRef(topOffset)
  const cigarImgRef = useRef<HTMLImageElement | null>(null)
  const imgLoadedRef = useRef(false)

  useEffect(() => { animateRef.current = animate }, [animate])

  // Load cigar image
  useEffect(() => {
    const img = new Image()
    img.src = '/cigar-v2.jpg'
    img.onload = () => {
      cigarImgRef.current = img
      imgLoadedRef.current = true
    }
  }, [])

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
    let time = 0
    let spawnTimer = 0

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) time += 0.016

      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      // --- Draw cigar image ---
      const img = cigarImgRef.current
      let tipX = w * 0.35
      let tipY = h * 0.65

      if (img && imgLoadedRef.current) {
        const imgScale = (w * 0.6) / img.width
        const drawW = img.width * imgScale
        const drawH = img.height * imgScale
        const drawX = (w - drawW) / 2
        const drawY = h - drawH + drawH * 0.05

        const cropX = Math.floor(img.width * 0.06)
        const cropTop = Math.floor(img.height * 0.38)
        const cropBottom = Math.floor(img.height * 0.1)
        const sx = cropX
        const sy = cropTop
        const sw = img.width - cropX * 2
        const sh = img.height - cropTop - cropBottom

        const aspectRatio = sw / sh
        const destW = w * 0.75
        const destH = destW / aspectRatio
        const destX = (w - destW) / 2
        const destY = h - destH - 20

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = currentOpacity * 0.7
        ctx.drawImage(img, sx, sy, sw, sh, destX, destY, destW, destH)
        ctx.restore()

        // Ember tip — right on the cut face of the cigar
        tipX = destX + destW * 0.12
        tipY = destY + destH * 0.45
      }

      // --- Spawn smoke puffs from the cigar's cut end ---
      if (animateRef.current) {
        spawnTimer++
        if (spawnTimer > 2) {
          // Tight spawn right at the cigar tip — very small initial spread
          puffsRef.current.push({
            x: tipX + (Math.random() - 0.5) * 1.5,
            y: tipY + (Math.random() - 0.5) * 1,
            vx: -(0.02 + Math.random() * 0.06), // slight leftward to match cigar angle
            vy: -(0.8 + Math.random() * 0.8),
            radius: 0.5 + Math.random() * 1,
            maxRadius: 10 + Math.random() * 20,
            growRate: 0.04 + Math.random() * 0.04,
            brightness: 0.18 + Math.random() * 0.12,
            life: 0,
            maxLife: 450 + Math.random() * 300,
            wavePhase: Math.random() * Math.PI * 2,
            waveFreq: 0.012 + Math.random() * 0.01,
          })
          spawnTimer = 0
        }
      }

      // --- Update and draw smoke puffs ---
      const alivePuffs: SmokePuff[] = []
      for (const p of puffsRef.current) {
        if (animateRef.current) {
          p.life++
          p.y += p.vy
          p.x += p.vx + Math.sin(p.life * p.waveFreq + p.wavePhase) * 0.25

          // Smoke rises slower over time, expands more as it rises
          p.vy *= 0.999
          const age = p.life / p.maxLife
          if (p.radius < p.maxRadius) {
            // Grow slowly near tip, faster as it rises
            p.radius += p.growRate * (0.3 + age * 1.5)
          }

          // Spread out more as it rises
          p.vx += (Math.random() - 0.48) * (0.003 + age * 0.01)

          // Pointer disperses smoke
          if (ptrActive && ptr) {
            const dx = p.x - ptr.x
            const dy = p.y - ptr.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 70 && dist > 1) {
              const strength = (1 - dist / 70) * 0.6
              p.x += dx / dist * strength
              p.y += dy / dist * strength
            }
          }
        }

        if (p.life >= p.maxLife) continue
        alivePuffs.push(p)

        const lifeRatio = p.life / p.maxLife
        // Fade in, sustain, long fade out
        const fade = lifeRatio < 0.08 ? lifeRatio / 0.08
          : lifeRatio > 0.35 ? (1 - lifeRatio) / 0.65
          : 1
        const alpha = p.brightness * fade * currentOpacity

        if (alpha < 0.002) continue

        // Soft cloud puff — radial gradient
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius)
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
        glow.addColorStop(0.4, `rgba(255, 255, 255, ${alpha * 0.5})`)
        glow.addColorStop(0.75, `rgba(255, 255, 255, ${alpha * 0.15})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()
      }
      puffsRef.current = alivePuffs

      // Cap total puffs for performance
      if (puffsRef.current.length > 120) {
        puffsRef.current = puffsRef.current.slice(-100)
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
