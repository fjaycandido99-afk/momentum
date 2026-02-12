'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface SandGrain {
  x: number
  y: number
  vy: number
  vx: number
  radius: number
  brightness: number
}

interface HourglassBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function HourglassBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: HourglassBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const grainsRef = useRef<SandGrain[]>([])
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const imgLoadedRef = useRef(false)

  useEffect(() => { animateRef.current = animate }, [animate])

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!imgRef.current) {
      const img = new Image()
      img.src = '/hourglass.jpg'
      img.onload = () => { imgLoadedRef.current = true }
      imgRef.current = img
    }

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

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (!imgLoadedRef.current || !imgRef.current) {
        animFrameRef.current = requestAnimationFrame(draw)
        return
      }

      const img = imgRef.current
      const imgW = img.naturalWidth
      const imgH = img.naturalHeight

      // Crop black borders
      const cropTop = imgH * 0.04
      const cropBottom = imgH * 0.06
      const cropX = imgW * 0.08
      const srcX = cropX
      const srcY = cropTop
      const srcW = imgW - cropX * 2
      const srcH = imgH - cropTop - cropBottom

      // Fit to canvas — center, fill more space
      const maxH = h * 0.75
      const aspect = srcW / srcH
      let destH = maxH
      let destW = destH * aspect
      if (destW > w * 0.65) {
        destW = w * 0.65
        destH = destW / aspect
      }
      const destX = (w - destW) / 2
      const destY = (h - destH) / 2

      // Draw hourglass image
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.55 * currentOpacity
      ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH)
      ctx.restore()

      // Positions mapped to the image
      const cx = destX + destW * 0.5
      const neckY = destY + destH * 0.48
      // Top of the sand pile already drawn in the image
      const sandPileTop = destY + destH * 0.7

      // --- Spawn grains from neck ---
      if (animateRef.current) {
        spawnTimer++
        if (spawnTimer > 2 && grainsRef.current.length < 35) {
          grainsRef.current.push({
            x: cx + (Math.random() - 0.5) * 2.5,
            y: neckY + 1 + Math.random() * 4,
            vy: 0.3 + Math.random() * 0.4,
            vx: (Math.random() - 0.5) * 0.15,
            radius: 0.4 + Math.random() * 0.6,
            brightness: 0.2 + Math.random() * 0.2,
          })
          spawnTimer = 0
        }
      }

      // --- Update and draw falling grains ---
      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false
      const alive: SandGrain[] = []

      for (const g of grainsRef.current) {
        if (animateRef.current) {
          g.y += g.vy
          g.x += g.vx
          g.vy += 0.008
          g.vx += (Math.random() - 0.5) * 0.03

          // Slight spread below neck
          if (g.y > neckY + 5) {
            g.vx += (Math.random() - 0.5) * 0.04
          }

          // Settle when reaching the sand pile in the image
          if (g.y >= sandPileTop) continue

          // Pointer repel
          if (ptrActive && ptr) {
            const dx = g.x - ptr.x
            const dy = g.y - ptr.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 45 && dist > 1) {
              const strength = (1 - dist / 45) * 0.2
              g.x += dx / dist * strength
              g.y += dy / dist * strength
            }
          }
        }

        const alpha = g.brightness * currentOpacity
        ctx.beginPath()
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
        alive.push(g)
      }
      grainsRef.current = alive

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
