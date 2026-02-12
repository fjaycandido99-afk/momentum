'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface CandleFlamesBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function CandleFlamesBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: CandleFlamesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)
  const topOffsetRef = useRef(topOffset)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const imageLoadedRef = useRef(false)

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

    // Load candle image
    if (!imageRef.current) {
      const img = new Image()
      img.src = '/candle.jpg'
      img.onload = () => {
        imageLoadedRef.current = true
      }
      imageRef.current = img
    }

    let currentOpacity = 0.2
    let time = 0
    let flamePhase = 0
    let flickerPhase = 0
    let spawnTimer = 0
    // Wind state
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
        flamePhase += 0.06
        flickerPhase += 0.09 + Math.random() * 0.03

        // Wind gusts
        windTimer++
        if (windTimer > 200 + Math.random() * 300) {
          windTarget = (Math.random() - 0.5) * 4
          windTimer = 0
        }
        windStrength += (windTarget - windStrength) * 0.015
        if (Math.abs(windStrength) > 0.1) windTarget *= 0.97
      }

      const ptr = pointerRef?.current
      const ptrActive = ptr?.active ?? false

      // Draw candle image
      if (imageLoadedRef.current && imageRef.current) {
        const img = imageRef.current

        // Calculate image dimensions to fit centered
        const imgAspect = img.naturalWidth / img.naturalHeight
        const maxH = h * 0.75
        const maxW = w * 0.70
        let destH = maxH
        let destW = destH * imgAspect
        if (destW > maxW) {
          destW = maxW
          destH = destW / imgAspect
        }
        const destX = (w - destW) / 2
        const destY = (h - destH) / 2 + h * 0.03

        // Crop edges to remove any border artifacts
        const cropTop = img.naturalHeight * 0.02
        const cropBottom = img.naturalHeight * 0.03
        const cropSide = img.naturalWidth * 0.04

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.65 * currentOpacity

        ctx.drawImage(
          img,
          cropSide, cropTop,
          img.naturalWidth - cropSide * 2, img.naturalHeight - cropTop - cropBottom,
          destX, destY, destW, destH
        )
        ctx.restore()

        // Black out the image's static flame so only animated flame shows
        // Cover the flame + rays area of the image (top portion above candle body)
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        // Large soft mask to erase static flame + rays from image
        const maskX = destX + destW * 0.50
        const maskY = destY + destH * 0.32
        const maskRx = destW * 0.52
        const maskRy = destH * 0.32
        const maskGrad = ctx.createRadialGradient(maskX, maskY, 0, maskX, maskY, Math.max(maskRx, maskRy))
        maskGrad.addColorStop(0, 'rgba(0,0,0,1)')
        maskGrad.addColorStop(0.7, 'rgba(0,0,0,1)')
        maskGrad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = maskGrad
        ctx.beginPath()
        ctx.ellipse(maskX, maskY, maskRx, maskRy, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Flame position — sits on the wick where the image's flame meets the candle top
        const flameBaseX = destX + destW * 0.51
        const flameBaseY = destY + destH * 0.54

        // Pointer influence — blow flame
        let pointerWind = 0
        if (ptrActive && ptr) {
          const dx = flameBaseX - ptr.x
          const dy = flameBaseY - ptr.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120 && dist > 1) {
            pointerWind = (dx / dist) * (1 - dist / 120) * 6
          }
        }

        const sway = Math.sin(flamePhase) * 2.5 + windStrength + pointerWind
        const flickerScale = 0.85 + Math.sin(flickerPhase) * 0.15
        const flameHeight = 110 * flickerScale
        const flameWidth = 32 * (0.9 + Math.sin(flickerPhase * 1.3) * 0.1)

        const tipX = flameBaseX + sway
        const tipY = flameBaseY - flameHeight
        const flameAlpha = 0.7 * currentOpacity

        // Large ambient glow around flame
        const ambientR = flameHeight * 2.5
        const ambient = ctx.createRadialGradient(
          flameBaseX, flameBaseY - flameHeight * 0.3, 0,
          flameBaseX, flameBaseY - flameHeight * 0.3, ambientR
        )
        ambient.addColorStop(0, `rgba(255, 255, 255, ${flameAlpha * 0.15})`)
        ambient.addColorStop(0.3, `rgba(255, 255, 255, ${flameAlpha * 0.06})`)
        ambient.addColorStop(0.6, `rgba(255, 255, 255, ${flameAlpha * 0.02})`)
        ambient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.beginPath()
        ctx.arc(flameBaseX, flameBaseY - flameHeight * 0.3, ambientR, 0, Math.PI * 2)
        ctx.fillStyle = ambient
        ctx.fill()

        // Outer flame shape (bezier)
        ctx.beginPath()
        ctx.moveTo(flameBaseX, flameBaseY)
        ctx.bezierCurveTo(
          flameBaseX - flameWidth * 0.9, flameBaseY - flameHeight * 0.2,
          flameBaseX - flameWidth * 0.5 + sway * 0.3, flameBaseY - flameHeight * 0.6,
          tipX, tipY
        )
        ctx.bezierCurveTo(
          flameBaseX + flameWidth * 0.5 + sway * 0.3, flameBaseY - flameHeight * 0.6,
          flameBaseX + flameWidth * 0.9, flameBaseY - flameHeight * 0.2,
          flameBaseX, flameBaseY
        )
        const flameGrad = ctx.createLinearGradient(flameBaseX, flameBaseY, tipX, tipY)
        flameGrad.addColorStop(0, `rgba(255, 255, 255, ${flameAlpha * 0.6})`)
        flameGrad.addColorStop(0.3, `rgba(255, 255, 255, ${flameAlpha * 0.45})`)
        flameGrad.addColorStop(0.6, `rgba(255, 255, 255, ${flameAlpha * 0.25})`)
        flameGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = flameGrad
        ctx.fill()

        // Inner bright core
        const coreH = flameHeight * 0.5
        const coreTipX = flameBaseX + sway * 0.6
        const coreTipY = flameBaseY - coreH
        ctx.beginPath()
        ctx.moveTo(flameBaseX, flameBaseY)
        ctx.bezierCurveTo(
          flameBaseX - flameWidth * 0.35, flameBaseY - coreH * 0.3,
          flameBaseX - flameWidth * 0.2 + sway * 0.2, flameBaseY - coreH * 0.7,
          coreTipX, coreTipY
        )
        ctx.bezierCurveTo(
          flameBaseX + flameWidth * 0.2 + sway * 0.2, flameBaseY - coreH * 0.7,
          flameBaseX + flameWidth * 0.35, flameBaseY - coreH * 0.3,
          flameBaseX, flameBaseY
        )
        ctx.fillStyle = `rgba(255, 255, 255, ${flameAlpha * 0.8})`
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

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} />
}
