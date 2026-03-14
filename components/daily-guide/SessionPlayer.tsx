'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Play, Pause, RotateCcw, Check } from 'lucide-react'
import { useAudioOptional } from '@/contexts/AudioContext'
import { CircularVisualizer } from '@/components/player/CircularVisualizer'
import type { SessionType } from '@/lib/daily-guide/decision-tree'

// Session metadata
const SESSION_META: Record<SessionType, { label: string; subtitle: string }> = {
  morning_prime: { label: 'Morning Prime', subtitle: 'Wake up, set intention, energy' },
  midday_reset: { label: 'Midday Reset', subtitle: 'Recharge, affirm, refocus' },
  wind_down: { label: 'Wind Down', subtitle: 'Reflect, release, ground' },
  bedtime_story: { label: 'Bedtime Story', subtitle: 'Motivational sleep story' },
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Convert base64 string to ArrayBuffer */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

interface SessionPlayerProps {
  session: SessionType
  script: string
  audioBase64: string | null
  duration: number
  onClose: () => void
  onComplete: () => void
}

export function SessionPlayer({
  session,
  script,
  audioBase64,
  duration,
  onClose,
  onComplete,
}: SessionPlayerProps) {
  const audioContext = useAudioOptional()
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Web Audio refs for buffer-based analyser
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const analyserSetupDone = useRef(false)

  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  // Decode audio buffer once for visualizer (separate from HTMLAudioElement playback)
  const decodedBufferReady = useRef(false)
  useEffect(() => {
    if (!audioBase64 || decodedBufferReady.current) return
    decodedBufferReady.current = true

    // Pre-decode the audio data so it's ready when user taps play
    try {
      const arrayBuffer = base64ToArrayBuffer(audioBase64)
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      ctx.decodeAudioData(arrayBuffer).then((decoded) => {
        audioBufferRef.current = decoded
        // Close this temporary context — we'll create a fresh one on user gesture
        ctx.close().catch(() => {})
      }).catch(() => {
        ctx.close().catch(() => {})
      })
    } catch {}
  }, [audioBase64])

  /**
   * Start a silent BufferSourceNode synced to the audio element for visualizer analysis.
   * The HTMLAudioElement handles actual playback; this buffer source feeds the AnalyserNode
   * through a zero-gain node so we get frequency data without double audio.
   * MUST be called from a user gesture on mobile.
   */
  const startVisualiserSource = useCallback((fromTime: number) => {
    if (!audioBufferRef.current) return

    // Create AudioContext on first call (user gesture guarantees it won't be suspended)
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = ctx

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.75
      analyserRef.current = analyser

      // Zero-gain node: audio flows through analyser for data but produces no sound
      const gain = ctx.createGain()
      gain.gain.value = 0
      gainRef.current = gain

      analyser.connect(gain)
      gain.connect(ctx.destination)

      setAnalyserNode(analyser)
      analyserSetupDone.current = true
    }

    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    // Stop any existing buffer source
    if (bufferSourceRef.current) {
      try { bufferSourceRef.current.stop() } catch {}
      bufferSourceRef.current.disconnect()
      bufferSourceRef.current = null
    }

    // Create new buffer source starting at the current playback position
    const source = ctx.createBufferSource()
    source.buffer = audioBufferRef.current
    source.connect(analyserRef.current!)
    bufferSourceRef.current = source

    const offset = Math.max(0, Math.min(fromTime, audioBufferRef.current.duration))
    source.start(0, offset)
  }, [])

  /** Stop the visualiser buffer source (on pause/end) */
  const stopVisualiserSource = useCallback(() => {
    if (bufferSourceRef.current) {
      try { bufferSourceRef.current.stop() } catch {}
      bufferSourceRef.current.disconnect()
      bufferSourceRef.current = null
    }
  }, [])

  // Initialize audio element
  useEffect(() => {
    if (!audioBase64) {
      setIsLoaded(true)
      return
    }

    // Use blob URL instead of data URL for better WKWebView compatibility
    const arrayBuffer = base64ToArrayBuffer(audioBase64)
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
    const blobUrl = URL.createObjectURL(blob)

    const audio = new Audio(blobUrl)
    audioRef.current = audio

    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration)
      setIsLoaded(true)
      // Try auto-play (works on desktop, may fail on mobile)
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Auto-play blocked (mobile) — user will tap play button
        })
    }

    audio.onended = () => {
      setIsPlaying(false)
      stopVisualiserSource()
      setIsCompleted(true)
      onComplete()
    }

    audio.onerror = () => {
      setIsLoaded(true)
    }

    audioContext?.pauseMusic()

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      URL.revokeObjectURL(blobUrl)
      stopVisualiserSource()
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
      analyserRef.current = null
      gainRef.current = null
      analyserSetupDone.current = false
      decodedBufferReady.current = false
      setAnalyserNode(null)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [audioBase64])

  // Time tracking
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime)
        }
      }, 100)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      stopVisualiserSource()
      setIsPlaying(false)
    } else {
      // Start visualiser from current position (user gesture)
      startVisualiserSource(audioRef.current.currentTime)
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }, [isPlaying, startVisualiserSource, stopVisualiserSource])

  const restart = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    setCurrentTime(0)
    setIsCompleted(false)
    startVisualiserSource(0)
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
  }, [startVisualiserSource])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!audioRef.current || audioDuration <= 0) return
    const bar = e.currentTarget
    const rect = bar.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const newTime = fraction * audioDuration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
    // Re-sync visualiser source to new position
    if (isPlaying) {
      startVisualiserSource(newTime)
    }
  }, [audioDuration, isPlaying, startVisualiserSource])

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0
  const meta = SESSION_META[session]

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, overflow: 'hidden', backgroundColor: '#000000' }}
    >
      {/* Circular visualizer centered on screen */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Soft radial glow behind the circle */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, transparent 70%)',
            filter: 'blur(40px)',
            opacity: isPlaying ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
          }}
        />

        {/* Circular waveform */}
        <div style={{ opacity: isPlaying ? 0.85 : 0.15, transition: 'opacity 1s ease-in-out' }}>
          <CircularVisualizer
            analyser={analyserNode}
            isPlaying={isPlaying}
            barCount={80}
            size={300}
          />
        </div>

        {/* Bottom gradient for controls readability */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none" />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center px-4 pt-[env(safe-area-inset-top)] h-14 z-20">
        <button
          onClick={onClose}
          className="p-2 -ml-2 focus-visible:outline-none"
          aria-label="Close"
        >
          <ChevronDown className="w-7 h-7 text-white" />
        </button>
      </div>

      {/* Bottom — title + progress + controls */}
      <div
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1.25rem calc(env(safe-area-inset-bottom, 0px) + 16px)', zIndex: 10 }}
      >
        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-1 text-center">{meta.label}</h2>
        <p className="text-sm text-white/50 mb-6 text-center">{meta.subtitle}</p>

        {/* Completion badge */}
        {isCompleted && (
          <div className="flex flex-col items-center gap-2 mb-4 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-sm text-emerald-400 font-medium">Session Complete</p>
          </div>
        )}

        {/* Progress bar */}
        {audioBase64 && (
          <div className="w-full mb-5">
            <div
              className="h-[3px] bg-white/25 rounded-full cursor-pointer relative group"
              onClick={handleSeek}
            >
              <div
                className="h-full rounded-full transition-[width] duration-100 relative"
                style={{ width: `${progress}%`, backgroundColor: 'white' }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
              </div>
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-white/50 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{audioDuration > 0 ? `-${formatTime(audioDuration - currentTime)}` : '--:--'}</span>
            </div>
          </div>
        )}

        {/* Controls row */}
        <div className="flex items-center justify-center gap-8">
          {isCompleted ? (
            <>
              <button
                onClick={restart}
                className="p-2 focus-visible:outline-none"
                aria-label="Restart"
              >
                <RotateCcw className="w-7 h-7 text-white" />
              </button>
              <button
                onClick={onClose}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none"
              >
                <Check className="w-7 h-7 text-black" />
              </button>
              <div className="w-11" />
            </>
          ) : audioBase64 ? (
            <button
              onClick={togglePlay}
              disabled={!isLoaded}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center disabled:opacity-40 transition-transform active:scale-95 focus-visible:outline-none"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 text-black" fill="black" />
              ) : (
                <Play className="w-7 h-7 text-black ml-0.5" fill="black" />
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                setIsCompleted(true)
                onComplete()
              }}
              className="px-6 py-3 rounded-full bg-white/15 focus-visible:outline-none"
            >
              <span className="text-sm font-medium text-white">Mark as Complete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
