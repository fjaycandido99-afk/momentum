'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Play, Pause, RotateCcw, Check } from 'lucide-react'
import { useAudioOptional } from '@/contexts/AudioContext'
import { CircularVisualizer } from '@/components/player/CircularVisualizer'
import type { AudioAnalyserLike } from '@/components/player/audio-analyser-cache'
import type { SessionType } from '@/lib/daily-guide/decision-tree'

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
  const blobUrlRef = useRef<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Web Audio graph refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const setupDone = useRef(false)

  const [analyserNode, setAnalyserNode] = useState<AudioAnalyserLike | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  /**
   * Start a muted BufferSourceNode through an AnalyserNode.
   * The real audio plays via HTMLAudioElement.
   * This silent copy feeds the AnalyserNode with real frequency data.
   */
  const startVisualizerSource = useCallback((fromTime: number) => {
    if (!audioCtxRef.current || !audioBufferRef.current || !analyserRef.current) return

    // Stop any existing buffer source
    if (bufferSourceRef.current) {
      try { bufferSourceRef.current.stop() } catch {}
      bufferSourceRef.current.disconnect()
    }

    const source = audioCtxRef.current.createBufferSource()
    source.buffer = audioBufferRef.current
    source.connect(analyserRef.current)
    bufferSourceRef.current = source

    const offset = Math.max(0, Math.min(fromTime, audioBufferRef.current.duration))
    source.start(0, offset)
  }, [])

  const stopVisualizerSource = useCallback(() => {
    if (bufferSourceRef.current) {
      try { bufferSourceRef.current.stop() } catch {}
      bufferSourceRef.current.disconnect()
      bufferSourceRef.current = null
    }
  }, [])

  /**
   * Full setup: create AudioContext, decode audio, build graph.
   * MUST be called from user gesture (tap) so AudioContext is not suspended on iOS.
   * Only runs once — subsequent calls just start/restart the buffer source.
   */
  const setupAndStart = useCallback(async (fromTime: number) => {
    // Already set up — just restart the source
    if (setupDone.current) {
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume()
      }
      startVisualizerSource(fromTime)
      return
    }

    if (!audioBase64) return

    try {
      // 1. Create AudioContext in user gesture — will be "running" on iOS
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      await audioCtx.resume()

      // 2. Decode audio into buffer
      const binaryString = atob(audioBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
      const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer)

      // 3. Build graph: BufferSource → Analyser → Gain(0) → Destination
      //    Gain is 0 so no double audio — HTMLAudioElement handles real playback
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.7

      const gain = audioCtx.createGain()
      gain.gain.value = 0

      analyser.connect(gain)
      gain.connect(audioCtx.destination)

      // Store refs
      audioCtxRef.current = audioCtx
      audioBufferRef.current = audioBuffer
      analyserRef.current = analyser
      gainRef.current = gain
      setupDone.current = true

      setAnalyserNode(analyser)

      // 4. Start buffer source at current playback position
      startVisualizerSource(fromTime)
    } catch (err) {
      console.warn('[SessionPlayer] Visualizer setup failed:', err)
    }
  }, [audioBase64, startVisualizerSource])

  // Initialize audio element
  useEffect(() => {
    if (!audioBase64) {
      setIsLoaded(true)
      return
    }

    const binaryString = atob(audioBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'audio/mpeg' })
    const blobUrl = URL.createObjectURL(blob)
    blobUrlRef.current = blobUrl

    const audio = new Audio(blobUrl)
    audioRef.current = audio

    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration)
      setIsLoaded(true)
      // Try auto-play (desktop only — mobile blocks this)
      audio.play()
        .then(() => {
          setIsPlaying(true)
          setupAndStart(0)
        })
        .catch(() => {})
    }

    audio.onended = () => {
      setIsPlaying(false)
      stopVisualizerSource()
      setIsCompleted(true)
      onComplete()
    }

    audio.onerror = () => setIsLoaded(true)

    audioContext?.pauseMusic()

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      stopVisualizerSource()
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
      audioBufferRef.current = null
      analyserRef.current = null
      gainRef.current = null
      setupDone.current = false
      setAnalyserNode(null)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [audioBase64])

  // Time tracking
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
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
      stopVisualizerSource()
      setIsPlaying(false)
    } else {
      const time = audioRef.current.currentTime
      setupAndStart(time)
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }, [isPlaying, setupAndStart, stopVisualizerSource])

  const restart = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    setCurrentTime(0)
    setIsCompleted(false)
    setupAndStart(0)
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
  }, [setupAndStart])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!audioRef.current || audioDuration <= 0) return
    const bar = e.currentTarget
    const rect = bar.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const newTime = fraction * audioDuration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
    if (isPlaying) startVisualizerSource(newTime)
  }, [audioDuration, isPlaying, startVisualizerSource])

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0
  const meta = SESSION_META[session]

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, overflow: 'hidden', backgroundColor: '#000000' }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="absolute pointer-events-none"
          style={{
            width: '320px', height: '320px', borderRadius: '50%',
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, transparent 70%)',
            filter: 'blur(40px)',
            opacity: isPlaying ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
          }}
        />
        <div style={{ opacity: isPlaying ? 0.85 : 0.15, transition: 'opacity 1s ease-in-out' }}>
          <CircularVisualizer analyser={analyserNode} isPlaying={isPlaying} barCount={80} size={300} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none" />
      </div>

      <div className="absolute top-0 left-0 right-0 flex items-center px-4 pt-[env(safe-area-inset-top)] h-14 z-20">
        <button onClick={onClose} className="p-2 -ml-2 focus-visible:outline-none" aria-label="Close">
          <ChevronDown className="w-7 h-7 text-white" />
        </button>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1.25rem calc(env(safe-area-inset-bottom, 0px) + 16px)', zIndex: 10 }}>
        <h2 className="text-2xl font-bold text-white mb-1 text-center">{meta.label}</h2>
        <p className="text-sm text-white/50 mb-6 text-center">{meta.subtitle}</p>

        {isCompleted && (
          <div className="flex flex-col items-center gap-2 mb-4 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-sm text-emerald-400 font-medium">Session Complete</p>
          </div>
        )}

        {audioBase64 && (
          <div className="w-full mb-5">
            <div className="h-[3px] bg-white/25 rounded-full cursor-pointer relative group" onClick={handleSeek}>
              <div className="h-full rounded-full transition-[width] duration-100 relative" style={{ width: `${progress}%`, backgroundColor: 'white' }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
              </div>
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-white/50 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{audioDuration > 0 ? `-${formatTime(audioDuration - currentTime)}` : '--:--'}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-8">
          {isCompleted ? (
            <>
              <button onClick={restart} className="p-2 focus-visible:outline-none" aria-label="Restart">
                <RotateCcw className="w-7 h-7 text-white" />
              </button>
              <button onClick={onClose} className="w-16 h-16 rounded-full bg-white flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none">
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
              {isPlaying ? <Pause className="w-7 h-7 text-black" fill="black" /> : <Play className="w-7 h-7 text-black ml-0.5" fill="black" />}
            </button>
          ) : (
            <button onClick={() => { setIsCompleted(true); onComplete() }} className="px-6 py-3 rounded-full bg-white/15 focus-visible:outline-none">
              <span className="text-sm font-medium text-white">Mark as Complete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
