'use client'

import { useRef, useEffect, useCallback, memo } from 'react'

interface WaveformScrubberProps {
  progress: number // 0-1
  duration: number
  currentTime: number
  onSeek?: (time: number) => void
  className?: string
}

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Produces deterministic output for a given seed so the waveform
 * pattern stays consistent across renders.
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generate a pseudo-waveform pattern based on duration as seed.
 * Returns an array of normalized heights (0.2 - 1.0).
 */
function generateWaveform(barCount: number, duration: number): Float32Array {
  // Use duration as seed so pattern is consistent for same content
  const seed = Math.round(duration * 100)
  const rng = mulberry32(seed)
  const heights = new Float32Array(barCount)

  for (let i = 0; i < barCount; i++) {
    // Base random height
    let h = 0.2 + rng() * 0.8 // Range: 0.2 to 1.0

    // Add some organic shape — peaks in the middle, quieter at edges
    const center = barCount / 2
    const distFromCenter = Math.abs(i - center) / center
    const envelope = 1 - distFromCenter * 0.3
    h *= envelope

    // Ensure within range
    heights[i] = Math.max(0.2, Math.min(1.0, h))
  }

  // Smooth pass: average with neighbors for a more natural look
  const smoothed = new Float32Array(barCount)
  for (let i = 0; i < barCount; i++) {
    const prev = i > 0 ? heights[i - 1] : heights[i]
    const next = i < barCount - 1 ? heights[i + 1] : heights[i]
    smoothed[i] = heights[i] * 0.6 + prev * 0.2 + next * 0.2
  }

  return smoothed
}

function WaveformScrubberInner({
  progress,
  duration,
  currentTime,
  onSeek,
  className = '',
}: WaveformScrubberProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const waveformRef = useRef<Float32Array | null>(null)
  const animFrameRef = useRef<number>(0)
  const displayProgressRef = useRef(progress)
  const isDraggingRef = useRef(false)
  const barCountRef = useRef(90)

  const TOTAL_HEIGHT = 40
  const BAR_WIDTH = 2
  const BAR_GAP = 1

  // Generate waveform on duration change
  useEffect(() => {
    if (duration > 0) {
      // Calculate bar count based on canvas width
      const canvas = canvasRef.current
      if (canvas) {
        const w = canvas.clientWidth
        const count = Math.min(120, Math.max(80, Math.floor(w / (BAR_WIDTH + BAR_GAP))))
        barCountRef.current = count
      }
      waveformRef.current = generateWaveform(barCountRef.current, duration)
    }
  }, [duration])

  // Draw the waveform
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

      // Recalculate bar count if canvas resized
      const count = Math.min(120, Math.max(80, Math.floor(w / (BAR_WIDTH + BAR_GAP))))
      if (count !== barCountRef.current) {
        barCountRef.current = count
        waveformRef.current = generateWaveform(count, duration)
      }
    }

    ctx.clearRect(0, 0, w, h)

    const waveform = waveformRef.current
    if (!waveform) return

    const barCount = waveform.length
    const totalBarsWidth = barCount * BAR_WIDTH + (barCount - 1) * BAR_GAP
    const startX = (w - totalBarsWidth) / 2

    // Smooth progress interpolation
    const targetProgress = progress
    const lerpSpeed = 0.15
    displayProgressRef.current += (targetProgress - displayProgressRef.current) * lerpSpeed
    const displayProgress = isDraggingRef.current ? progress : displayProgressRef.current

    // The playhead position in pixels
    const playheadX = startX + displayProgress * totalBarsWidth

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const x = startX + i * (BAR_WIDTH + BAR_GAP)
      const barH = Math.max(4, waveform[i] * h * 0.9)
      const y = (h - barH) / 2 // Center vertically

      // Bars before playhead are brighter
      const barCenter = x + BAR_WIDTH / 2
      const isBeforePlayhead = barCenter <= playheadX

      if (isBeforePlayhead) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
      }

      // Draw bar with rounded caps
      const radius = 1
      ctx.beginPath()
      if (barH > radius * 2) {
        ctx.moveTo(x, y + barH - radius)
        ctx.arcTo(x, y + barH, x + BAR_WIDTH, y + barH, radius)
        ctx.arcTo(x + BAR_WIDTH, y + barH, x + BAR_WIDTH, y + barH - radius, radius)
        ctx.lineTo(x + BAR_WIDTH, y + radius)
        ctx.arcTo(x + BAR_WIDTH, y, x, y, radius)
        ctx.arcTo(x, y, x, y + radius, radius)
        ctx.closePath()
      } else {
        ctx.rect(x, y, BAR_WIDTH, barH)
      }
      ctx.fill()
    }

    // Draw playhead line
    if (displayProgress > 0 && displayProgress < 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 1)'
      ctx.fillRect(playheadX - 1, 0, 2, h)
    }

    // Continue animation if progress is smoothing
    if (Math.abs(displayProgressRef.current - targetProgress) > 0.001) {
      animFrameRef.current = requestAnimationFrame(draw)
    }
  }, [progress, duration])

  // Redraw when progress changes
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw)
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [draw])

  // Seek handler — calculate time from touch/click position
  const handleSeek = useCallback(
    (clientX: number) => {
      if (!onSeek || !canvasRef.current || duration <= 0) return

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const ratio = Math.max(0, Math.min(1, x / rect.width))
      const seekTime = ratio * duration

      onSeek(seekTime)
    },
    [onSeek, duration]
  )

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!onSeek) return
      isDraggingRef.current = true
      handleSeek(e.touches[0].clientX)
    },
    [handleSeek, onSeek]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return
      e.preventDefault()
      handleSeek(e.touches[0].clientX)
    },
    [handleSeek]
  )

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  // Mouse/pointer handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!onSeek || e.pointerType === 'touch') return // Touch handled separately
      isDraggingRef.current = true
      handleSeek(e.clientX)
    },
    [handleSeek, onSeek]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current || e.pointerType === 'touch') return
      handleSeek(e.clientX)
    },
    [handleSeek]
  )

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={`w-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full cursor-pointer"
        style={{ height: `${TOTAL_HEIGHT}px`, display: 'block', touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="slider"
        aria-label="Playback progress"
        aria-valuenow={Math.round(currentTime)}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
      />
      {/* Time labels */}
      <div className="flex justify-between mt-1.5 px-0.5">
        <span className="text-[10px] text-white/60 tabular-nums">{formatTime(currentTime)}</span>
        <span className="text-[10px] text-white/60 tabular-nums">{formatTime(duration)}</span>
      </div>
    </div>
  )
}

export const WaveformScrubber = memo(WaveformScrubberInner)
