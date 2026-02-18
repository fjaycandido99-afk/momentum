'use client'

import { useEffect, useRef, useCallback, memo } from 'react'

interface AudioVisualizerProps {
  audioElement?: HTMLAudioElement | null
  isPlaying: boolean
  barCount?: number
  height?: number
  className?: string
  /** Compact inline mode for section headers (fewer bars, shorter height) */
  inline?: boolean
}

// Cache MediaElementSource nodes — each audio element can only have one
const sourceCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>()
const contextCache = new WeakMap<HTMLAudioElement, AudioContext>()
const analyserCache = new WeakMap<HTMLAudioElement, AnalyserNode>()

function AudioVisualizerInner({
  audioElement,
  isPlaying,
  barCount = 32,
  height = 48,
  className = '',
  inline = false,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const smoothedRef = useRef<Float32Array | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const prefersReducedMotion = useRef(false)

  // Inline mode defaults
  const effectiveBarCount = inline ? 3 : barCount
  const effectiveHeight = inline ? 12 : height
  const barWidth = inline ? 2 : 2
  const barGap = inline ? 2 : 1
  const borderRadius = inline ? 1 : 1

  // Check for reduced motion preference
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

  // Connect audio element to analyser
  useEffect(() => {
    if (!audioElement) {
      analyserRef.current = null
      return
    }

    try {
      // Reuse existing AudioContext and source for this element
      let audioCtx = contextCache.get(audioElement)
      let source = sourceCache.get(audioElement)
      let analyser = analyserCache.get(audioElement)

      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        contextCache.set(audioElement, audioCtx)
      }

      if (!source) {
        source = audioCtx.createMediaElementSource(audioElement)
        sourceCache.set(audioElement, source)
      }

      if (!analyser) {
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 128 // 64 frequency bins
        analyser.smoothingTimeConstant = 0.75
        analyserCache.set(audioElement, analyser)

        // Connect: source -> analyser -> destination
        source.connect(analyser)
        analyser.connect(audioCtx.destination)
      }

      analyserRef.current = analyser

      // Resume context if suspended (browser autoplay policy)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {})
      }
    } catch (err) {
      // "already connected" or other errors — the source may already be wired up
      // Try to get the cached analyser anyway
      const cachedAnalyser = analyserCache.get(audioElement)
      if (cachedAnalyser) {
        analyserRef.current = cachedAnalyser
      }
      console.warn('[AudioVisualizer] Setup warning:', err)
    }
  }, [audioElement])

  // Draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    // Size canvas to match CSS dimensions at device pixel ratio
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
    }

    ctx.clearRect(0, 0, w, h)

    // Initialize smoothed values
    if (!smoothedRef.current || smoothedRef.current.length !== effectiveBarCount) {
      smoothedRef.current = new Float32Array(effectiveBarCount)
    }

    const smoothed = smoothedRef.current
    const analyser = analyserRef.current

    if (analyser && isPlaying && !prefersReducedMotion.current) {
      // Get frequency data
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(dataArray)

      // Map frequency bins to bar count
      const binCount = dataArray.length
      const binsPerBar = Math.max(1, Math.floor(binCount / effectiveBarCount))

      for (let i = 0; i < effectiveBarCount; i++) {
        // Average the frequency bins for this bar
        let sum = 0
        const startBin = Math.floor(i * (binCount / effectiveBarCount))
        const endBin = Math.min(startBin + binsPerBar, binCount)
        for (let j = startBin; j < endBin; j++) {
          sum += dataArray[j]
        }
        const avg = sum / (endBin - startBin)
        const normalized = avg / 255 // 0 to 1

        // Smooth with linear interpolation
        const lerpFactor = 0.25
        smoothed[i] = smoothed[i] + (normalized - smoothed[i]) * lerpFactor
      }
    } else {
      // Decay to minimum when not playing
      const decayRate = 0.08
      for (let i = 0; i < effectiveBarCount; i++) {
        smoothed[i] = smoothed[i] * (1 - decayRate)
        if (smoothed[i] < 0.01) smoothed[i] = 0
      }
    }

    // Draw bars
    const totalBarWidth = effectiveBarCount * barWidth + (effectiveBarCount - 1) * barGap
    const startX = (w - totalBarWidth) / 2

    for (let i = 0; i < effectiveBarCount; i++) {
      const value = smoothed[i]
      const minHeight = inline ? 2 : 3
      const barH = Math.max(minHeight, value * h * 0.85)

      // Opacity based on amplitude: 0.4 to 0.9
      const opacity = 0.4 + value * 0.5

      const x = startX + i * (barWidth + barGap)
      const y = h - barH

      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
      ctx.beginPath()
      // Rounded top
      if (barH > borderRadius * 2) {
        ctx.moveTo(x, y + barH)
        ctx.lineTo(x, y + borderRadius)
        ctx.arcTo(x, y, x + barWidth, y, borderRadius)
        ctx.arcTo(x + barWidth, y, x + barWidth, y + borderRadius, borderRadius)
        ctx.lineTo(x + barWidth, y + barH)
      } else {
        ctx.rect(x, y, barWidth, barH)
      }
      ctx.fill()
    }

    // Static bars for reduced motion
    if (prefersReducedMotion.current && isPlaying) {
      // Show static bars at ~50% height
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < effectiveBarCount; i++) {
        const staticHeight = h * 0.3 + (i % 3) * h * 0.15
        const x = startX + i * (barWidth + barGap)
        const y = h - staticHeight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.beginPath()
        ctx.moveTo(x, y + staticHeight)
        ctx.lineTo(x, y + borderRadius)
        ctx.arcTo(x, y, x + barWidth, y, borderRadius)
        ctx.arcTo(x + barWidth, y, x + barWidth, y + borderRadius, borderRadius)
        ctx.lineTo(x + barWidth, y + staticHeight)
        ctx.fill()
      }
      return // Don't loop for reduced motion
    }

    animFrameRef.current = requestAnimationFrame(draw)
  }, [isPlaying, effectiveBarCount, effectiveHeight, barWidth, barGap, borderRadius, inline])

  // Start / stop animation loop
  useEffect(() => {
    // Always run the draw loop (for decay animation when stopping)
    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [draw])

  // For reduced motion, redraw when isPlaying changes
  useEffect(() => {
    if (prefersReducedMotion.current) {
      // Single draw for static bars
      requestAnimationFrame(draw)
    }
  }, [isPlaying, draw])

  const totalWidth = effectiveBarCount * barWidth + (effectiveBarCount - 1) * barGap

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: inline ? `${totalWidth}px` : '100%',
        height: `${effectiveHeight}px`,
        display: 'block',
      }}
      aria-hidden="true"
    />
  )
}

export const AudioVisualizer = memo(AudioVisualizerInner)
