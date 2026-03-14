'use client'

import { useEffect, useRef, useCallback, memo } from 'react'
import type { AudioAnalyserLike } from './audio-analyser-cache'

interface CircularVisualizerProps {
  analyser?: AudioAnalyserLike | null
  isPlaying: boolean
  /** When true, generates a pleasing animated waveform without real audio data */
  simulatedMode?: boolean
  barCount?: number
  size?: number
  className?: string
}

function CircularVisualizerInner({
  analyser,
  isPlaying,
  simulatedMode = false,
  barCount = 64,
  size = 280,
  className = '',
}: CircularVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const smoothedRef = useRef<Float32Array | null>(null)
  const prefersReducedMotion = useRef(false)
  const timeRef = useRef(0)
  // Track consecutive zero-data frames to detect broken analyser (e.g. iOS WKWebView)
  const zeroFramesRef = useRef(0)
  const analyserBrokenRef = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      prefersReducedMotion.current = mq.matches
      const handler = (e: MediaQueryListEvent) => {
        prefersReducedMotion.current = e.matches
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [])

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

    if (isPlaying && !prefersReducedMotion.current) {
      // Determine if we should use real analyser or simulated
      let useReal = analyser && !simulatedMode && !analyserBrokenRef.current

      if (useReal) {
        // Real frequency data mode
        const dataArray = new Uint8Array(analyser!.frequencyBinCount)
        analyser!.getByteFrequencyData(dataArray)

        // Check if analyser is returning actual data
        let hasData = false
        for (let j = 0; j < dataArray.length; j++) {
          if (dataArray[j] > 0) { hasData = true; break }
        }

        if (hasData) {
          zeroFramesRef.current = 0
          const binCount = dataArray.length
          for (let i = 0; i < barCount; i++) {
            let sum = 0
            const startBin = Math.floor(i * (binCount / barCount))
            const endBin = Math.min(startBin + Math.max(1, Math.floor(binCount / barCount)), binCount)
            for (let j = startBin; j < endBin; j++) {
              sum += dataArray[j]
            }
            const avg = sum / (endBin - startBin)
            const normalized = avg / 255
            smoothed[i] = smoothed[i] + (normalized - smoothed[i]) * 0.25
          }
        } else {
          // Analyser returning zeros — count frames
          zeroFramesRef.current++
          // After 30 consecutive zero frames (~0.5s), mark analyser as broken
          // and fall through to simulated mode
          if (zeroFramesRef.current > 30) {
            analyserBrokenRef.current = true
            useReal = false
          }
        }
      }

      if (!useReal) {
        // Simulated waveform — organic, audio-like animation
        timeRef.current += 0.016 // ~60fps
        const t = timeRef.current
        for (let i = 0; i < barCount; i++) {
          const angle = (i / barCount) * Math.PI * 2
          // Layer multiple sine waves at different frequencies for organic movement
          const wave1 = Math.sin(angle * 3 + t * 2.5) * 0.3
          const wave2 = Math.sin(angle * 5 - t * 1.8) * 0.2
          const wave3 = Math.sin(angle * 7 + t * 3.2) * 0.15
          const wave4 = Math.sin(angle * 2 - t * 0.7) * 0.15
          // Breathing base that slowly pulses
          const breath = 0.18 + Math.sin(t * 0.8) * 0.06
          const target = Math.max(0, breath + wave1 + wave2 + wave3 + wave4)
          smoothed[i] = smoothed[i] + (target - smoothed[i]) * 0.15
        }
      }
    } else {
      // Fade out
      for (let i = 0; i < barCount; i++) {
        smoothed[i] = smoothed[i] * 0.92
        if (smoothed[i] < 0.01) smoothed[i] = 0
      }
    }

    // Draw circular bars
    const cx = w / 2
    const cy = h / 2
    const radius = Math.min(w, h) * 0.28
    const maxBarLength = Math.min(w, h) * 0.18
    const barWidth = 2
    const angleStep = (Math.PI * 2) / barCount

    // Subtle inner circle ring
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

    if (prefersReducedMotion.current && isPlaying) {
      return
    }

    animFrameRef.current = requestAnimationFrame(draw)
  }, [isPlaying, barCount, size, analyser, simulatedMode])

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw)
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [draw])

  // Reset broken-analyser detection when playback restarts
  useEffect(() => {
    if (isPlaying) {
      zeroFramesRef.current = 0
      analyserBrokenRef.current = false
    }
  }, [isPlaying])

  useEffect(() => {
    if (prefersReducedMotion.current) {
      requestAnimationFrame(draw)
    }
  }, [isPlaying, draw])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'block',
      }}
      aria-hidden="true"
    />
  )
}

export const CircularVisualizer = memo(CircularVisualizerInner)
