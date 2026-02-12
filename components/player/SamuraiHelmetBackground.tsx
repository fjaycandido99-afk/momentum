'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface Ember {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  brightness: number
}

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  life: number
}

interface SamuraiHelmetBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function SamuraiHelmetBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: SamuraiHelmetBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const imageLoadedRef = useRef(false)
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)
  const embersRef = useRef<Ember[]>([])
  const ripplesRef = useRef<Ripple[]>([])

  // Drag state
  const draggingRef = useRef(false)
  const offsetXRef = useRef(0)
  const offsetYRef = useRef(0)
  const posXRef = useRef(0)
  const posYRef = useRef(0)
  const touchActiveRef = useRef(false)
  const touchXRef = useRef(0)
  const touchYRef = useRef(0)
  const trailTimerRef = useRef(0)

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

    if (!imageRef.current) {
      const img = new Image()
      img.src = '/samurai-helmet.jpg'
      img.onload = () => {
        imageRef.current = img
        imageLoadedRef.current = true
      }
    }

    let time = 0
    let currentOpacity = 0.2

    const getImageBounds = (w: number, h: number) => {
      if (!imageRef.current) return { destW: 0, destH: 0 }
      const img = imageRef.current
      const imgAspect = img.naturalWidth / img.naturalHeight
      const maxH = h * 0.65
      const maxW = w * 0.80
      let destH = maxH
      let destW = destH * imgAspect
      if (destW > maxW) {
        destW = maxW
        destH = destW / imgAspect
      }
      return { destW, destH }
    }

    // Burst embers from a point
    const burstEmbers = (bx: number, by: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 3
        embersRef.current.push({
          x: bx,
          y: by,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          size: 1.5 + Math.random() * 2.5,
          life: 0,
          maxLife: 80 + Math.random() * 80,
          brightness: 0.5 + Math.random() * 0.5,
        })
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const w = rect.width
      const h = rect.height
      const cx = w / 2 + posXRef.current
      const cy = h / 2 + posYRef.current
      const { destW, destH } = getImageBounds(w, h)

      const pad = 40
      if (Math.abs(px - cx) < destW / 2 + pad && Math.abs(py - cy) < destH / 2 + pad) {
        draggingRef.current = true
        touchActiveRef.current = true
        offsetXRef.current = px - cx
        offsetYRef.current = py - cy
        touchXRef.current = px
        touchYRef.current = py
        canvas.setPointerCapture(e.pointerId)

        // Burst embers on touch
        burstEmbers(px - cx, py - cy, 12)

        // Ripple on touch
        ripplesRef.current.push({
          x: px - cx,
          y: py - cy,
          radius: 0,
          maxRadius: 120,
          life: 0,
        })
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      posXRef.current = px - offsetXRef.current - rect.width / 2
      posYRef.current = py - offsetYRef.current - rect.height / 2
      touchXRef.current = px
      touchYRef.current = py
    }

    const handlePointerUp = () => {
      draggingRef.current = false
      touchActiveRef.current = false
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerUp)

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const targetOpacity = animateRef.current ? 1 : 0.15
      currentOpacity += (targetOpacity - currentOpacity) * 0.03

      if (animateRef.current) {
        time += 0.01
      }

      // Ease back to center when not dragging
      if (!draggingRef.current && (Math.abs(posXRef.current) > 0.5 || Math.abs(posYRef.current) > 0.5)) {
        posXRef.current *= 0.97
        posYRef.current *= 0.97
      }

      const cx = w / 2 + posXRef.current
      const cy = h / 2 + posYRef.current

      if (imageLoadedRef.current && imageRef.current) {
        const { destW, destH } = getImageBounds(w, h)

        // Ripple waves from touch
        const aliveRipples: Ripple[] = []
        for (const r of ripplesRef.current) {
          r.life++
          r.radius += 2
          if (r.radius >= r.maxRadius) continue
          aliveRipples.push(r)

          const progress = r.radius / r.maxRadius
          const alpha = (1 - progress) * 0.25

          ctx.beginPath()
          ctx.arc(cx + r.x, cy + r.y, r.radius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * currentOpacity})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
        ripplesRef.current = aliveRipples

        // Spawn trail embers while dragging
        if (touchActiveRef.current && animateRef.current) {
          trailTimerRef.current++
          if (trailTimerRef.current > 2) {
            const tx = touchXRef.current - cx
            const ty = touchYRef.current - cy
            embersRef.current.push({
              x: tx + (Math.random() - 0.5) * 10,
              y: ty + (Math.random() - 0.5) * 10,
              vx: (Math.random() - 0.5) * 1.5,
              vy: -0.5 - Math.random() * 1.5,
              size: 1 + Math.random() * 2,
              life: 0,
              maxLife: 60 + Math.random() * 60,
              brightness: 0.4 + Math.random() * 0.4,
            })
            trailTimerRef.current = 0
          }
        }

        // Update and draw embers (only from touch interactions)
        const alive: Ember[] = []
        for (const e of embersRef.current) {
          if (animateRef.current) {
            e.life++
            e.x += e.vx + Math.sin(time * 2 + e.life * 0.03) * 0.1
            e.y += e.vy
            e.vx *= 0.99
            e.vy *= 0.99
            e.size *= 0.998
          }

          if (e.life >= e.maxLife) continue
          alive.push(e)

          const lifeRatio = e.life / e.maxLife
          const fade = lifeRatio < 0.1 ? lifeRatio / 0.1 :
                       lifeRatio > 0.5 ? (1 - lifeRatio) / 0.5 : 1
          const alpha = e.brightness * fade * 0.7 * currentOpacity

          const ex = cx + e.x
          const ey = cy + e.y

          const glow = ctx.createRadialGradient(ex, ey, 0, ex, ey, e.size * 2.5)
          glow.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.fillStyle = glow
          ctx.fillRect(ex - e.size * 2.5, ey - e.size * 2.5, e.size * 5, e.size * 5)
        }
        embersRef.current = alive

        // Draw the helmet — lighter makes black invisible
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.6 * currentOpacity
        ctx.drawImage(
          imageRef.current,
          cx - destW / 2,
          cy - destH / 2,
          destW, destH
        )
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerUp)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  useEffect(() => {
    const cleanup = startAnimation()
    return cleanup
  }, [startAnimation])

  return <canvas ref={canvasRef} style={{ touchAction: 'none' }} className={`w-full h-full ${className}`} />
}
