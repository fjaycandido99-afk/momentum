'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

interface KatanaSwordBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function KatanaSwordBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 50,
}: KatanaSwordBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const imageLoadedRef = useRef(false)
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)

  // Drag state
  const draggingRef = useRef(false)
  const offsetXRef = useRef(0)
  const offsetYRef = useRef(0)
  const posXRef = useRef(0)
  const posYRef = useRef(0)

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
      img.src = '/katana.jpg'
      img.onload = () => {
        imageRef.current = img
        imageLoadedRef.current = true
      }
    }

    let angle = Math.PI // Start flipped (blade down)
    let currentOpacity = 0.2

    const getImageBounds = (w: number, h: number) => {
      if (!imageRef.current) return { destW: 0, destH: 0 }
      const img = imageRef.current
      const imgAspect = img.naturalWidth / img.naturalHeight
      const maxH = h * 0.85
      const maxW = w * 0.60
      let destH = maxH
      let destW = destH * imgAspect
      if (destW > maxW) {
        destW = maxW
        destH = destW / imgAspect
      }
      return { destW, destH }
    }

    // Pointer handlers for dragging
    const handlePointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const w = rect.width
      const h = rect.height
      const cx = w / 2 + posXRef.current
      const cy = h / 2 + posYRef.current
      const { destW, destH } = getImageBounds(w, h)

      // Check if pointer is near the katana (within its bounding box, with some padding)
      const pad = 40
      if (Math.abs(px - cx) < destW / 2 + pad && Math.abs(py - cy) < destH / 2 + pad) {
        draggingRef.current = true
        offsetXRef.current = px - cx
        offsetYRef.current = py - cy
        canvas.setPointerCapture(e.pointerId)
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      posXRef.current = px - offsetXRef.current - rect.width / 2
      posYRef.current = py - offsetYRef.current - rect.height / 2
    }

    const handlePointerUp = () => {
      draggingRef.current = false
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
        angle += 0.003
      }

      if (imageLoadedRef.current && imageRef.current) {
        const { destW, destH } = getImageBounds(w, h)

        // Ease back to center when not dragging
        if (!draggingRef.current) {
          posXRef.current *= 0.98
          posYRef.current *= 0.98
        }

        ctx.save()
        ctx.translate(w / 2 + posXRef.current, h / 2 + posYRef.current)
        ctx.rotate(angle)

        ctx.globalAlpha = 0.6 * currentOpacity

        ctx.drawImage(imageRef.current, -destW / 2, -destH / 2, destW, destH)
        ctx.restore()
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
