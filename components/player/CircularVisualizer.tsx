'use client'

import { useEffect, useRef, useCallback, memo } from 'react'
import type { AudioAnalyserLike } from './audio-analyser-cache'

interface CircularVisualizerProps {
  analyser?: AudioAnalyserLike | null
  isPlaying: boolean
  /** Use animated simulation instead of real audio data */
  simulated?: boolean
  barCount?: number
  size?: number
  className?: string
}

function CircularVisualizerInner({
  analyser,
  isPlaying,
  simulated = false,
  barCount = 64,
  size = 280,
  className = '',
}: CircularVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const smoothedRef = useRef<Float32Array | null>(null)
  const timeRef = useRef(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === 0 || h === 0) {
      animFrameRef.current = requestAnimationFrame(draw)
      return
    }

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
    }

    ctx.clearRect(0, 0, w, h)

    if (!smoothedRef.current || smoothedRef.current.length !== barCount) {
      smoothedRef.current = new Float32Array(barCount)
    }

    const smoothed = smoothedRef.current

    if (isPlaying) {
      if (!simulated && analyser) {
        // Real frequency data from Web Audio AnalyserNode
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)
        const binCount = dataArray.length
        for (let i = 0; i < barCount; i++) {
          const startBin = Math.floor(i * (binCount / barCount))
          const endBin = Math.min(startBin + Math.max(1, Math.floor(binCount / barCount)), binCount)
          let sum = 0
          for (let j = startBin; j < endBin; j++) sum += dataArray[j]
          const normalized = (sum / (endBin - startBin)) / 255
          smoothed[i] += (normalized - smoothed[i]) * 0.25
        }
      } else {
        // Simulated audio-reactive animation
        timeRef.current += 0.018
        const t = timeRef.current
        for (let i = 0; i < barCount; i++) {
          const a = (i / barCount) * Math.PI * 2
          // Multiple layered waves at different speeds for organic feel
          const v1 = Math.sin(a * 3 + t * 2.2) * 0.28
          const v2 = Math.sin(a * 5 - t * 1.6) * 0.18
          const v3 = Math.sin(a * 8 + t * 3.5) * 0.12
          const v4 = Math.sin(a * 2 - t * 0.9) * 0.14
          const v5 = Math.sin(a * 13 + t * 4.1) * 0.08
          // Slow breathing pulse
          const breath = 0.22 + Math.sin(t * 0.7) * 0.08
          // Occasional emphasis bursts
          const burst = Math.max(0, Math.sin(t * 1.3) * Math.sin(t * 0.3)) * 0.15
          const target = Math.max(0.02, breath + v1 + v2 + v3 + v4 + v5 + burst)
          smoothed[i] += (target - smoothed[i]) * 0.18
        }
      }
    } else {
      // Fade out when paused
      for (let i = 0; i < barCount; i++) {
        smoothed[i] *= 0.92
        if (smoothed[i] < 0.01) smoothed[i] = 0
      }
    }

    const cx = w / 2
    const cy = h / 2
    const radius = Math.min(w, h) * 0.28
    const maxBarLength = Math.min(w, h) * 0.18
    const barWidth = 2
    const angleStep = (Math.PI * 2) / barCount

    // Inner circle ring
    ctx.beginPath()
    ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Outward bars
    for (let i = 0; i < barCount; i++) {
      const value = smoothed[i]
      const angle = i * angleStep - Math.PI / 2
      const barLength = Math.max(3, value * maxBarLength)
      const opacity = 0.6 + value * 0.4
      const x1 = cx + Math.cos(angle) * radius
      const y1 = cy + Math.sin(angle) * radius
      const x2 = cx + Math.cos(angle) * (radius + barLength)
      const y2 = cy + Math.sin(angle) * (radius + barLength)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`
      ctx.lineWidth = barWidth
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    // Inward reflection bars
    for (let i = 0; i < barCount; i++) {
      const value = smoothed[i]
      const angle = i * angleStep - Math.PI / 2
      const inwardLength = Math.max(1, value * maxBarLength * 0.35)
      const opacity = 0.25 + value * 0.3
      const x1 = cx + Math.cos(angle) * radius
      const y1 = cy + Math.sin(angle) * radius
      const x2 = cx + Math.cos(angle) * (radius - inwardLength)
      const y2 = cy + Math.sin(angle) * (radius - inwardLength)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`
      ctx.lineWidth = barWidth
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    animFrameRef.current = requestAnimationFrame(draw)
  }, [isPlaying, barCount, size, analyser, simulated])

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
      aria-hidden="true"
    />
  )
}

export const CircularVisualizer = memo(CircularVisualizerInner)
