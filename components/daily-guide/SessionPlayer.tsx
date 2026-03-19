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

const IS_NATIVE = typeof window !== 'undefined' && !!(window as any).Capacitor

// Check if native AudioAnalyzer plugin is registered (only true after new build with plugin)
const HAS_NATIVE_AUDIO_PLUGIN = IS_NATIVE && !!(window as any).Capacitor?.Plugins?.AudioAnalyzer

interface SessionPlayerProps {
  session: SessionType
  script: string
  audioBase64: string | null
  duration: number
  onClose: () => void
  onComplete: () => void
}

// ─── Web-only player (uses HTMLAudioElement + createMediaElementSource) ───

function useWebPlayer(audioBase64: string | null, onComplete: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const setupDone = useRef(false)

  const [analyser, setAnalyser] = useState<AudioAnalyserLike | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  const setupAnalyser = useCallback(() => {
    // Skip Web Audio on native — native AudioAnalyzer plugin provides frequency data instead
    if (setupDone.current || !audioRef.current || IS_NATIVE) return
    setupDone.current = true
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const source = ctx.createMediaElementSource(audioRef.current)
      const node = ctx.createAnalyser()
      node.fftSize = 256
      node.smoothingTimeConstant = 0.7
      source.connect(node)
      node.connect(ctx.destination)
      audioCtxRef.current = ctx
      setAnalyser(node)
    } catch {}
  }, [])

  useEffect(() => {
    if (!audioBase64) { setIsLoaded(true); return }
    let cancelled = false

    // Convert base64 to blob URL — try fetch(data:URI) first, fall back to atob chunked
    const loadAudio = async () => {
      try {
        let blob: Blob
        try {
          const res = await fetch(`data:audio/mpeg;base64,${audioBase64}`)
          blob = await res.blob()
        } catch {
          // Fallback for WKWebView where fetch(data:URI) may not work
          const bin = atob(audioBase64)
          const bytes = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
          blob = new Blob([bytes], { type: 'audio/mpeg' })
        }
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url

        const audio = new Audio(url)
        audioRef.current = audio

        audio.onloadedmetadata = () => {
          if (cancelled) return
          setAudioDuration(audio.duration)
          setIsLoaded(true)
          audio.play()
            .then(() => { if (!cancelled) { setIsPlaying(true); setupAnalyser() } })
            .catch(() => {})
        }
        audio.onended = () => { if (!cancelled) { setIsPlaying(false); onComplete() } }
        audio.onerror = () => { if (!cancelled) setIsLoaded(true) }
      } catch {
        if (!cancelled) setIsLoaded(true)
      }
    }
    loadAudio()

    const timer = setInterval(() => {
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
    }, 100)

    return () => {
      cancelled = true
      clearInterval(timer)
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {})
      setupDone.current = false
      setAnalyser(null)
    }
  }, [audioBase64])

  const play = useCallback(() => {
    if (!audioRef.current) return
    setupAnalyser()
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume().catch(() => {})
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
  }, [setupAnalyser])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setIsPlaying(false)
  }, [])

  const seek = useCallback((time: number) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time) }
  }, [])

  const restart = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    setCurrentTime(0)
    setupAnalyser()
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume().catch(() => {})
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
  }, [setupAnalyser])

  return { analyser, isPlaying, currentTime, audioDuration, isLoaded, play, pause, seek, restart }
}

// ─── Native-only player (uses Capacitor AudioAnalyzer plugin) ───

function useNativePlayer(audioBase64: string | null, onComplete: () => void) {
  const adapterRef = useRef<any>(null)
  const pluginRef = useRef<any>(null)
  const listenersRef = useRef<any[]>([])
  const loaded = useRef(false)

  const [analyser, setAnalyser] = useState<AudioAnalyserLike | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!audioBase64) { setIsLoaded(true); return }

    let cancelled = false

    const init = async () => {
      try {
        // Dynamic import to avoid loading on web
        const { AudioAnalyzer, NativeAnalyserAdapter } = await import('@/lib/capacitor-audio-analyzer')
        pluginRef.current = AudioAnalyzer

        const adapter = new NativeAnalyserAdapter(64)
        adapterRef.current = adapter

        // Listen for frequency data
        const freqHandle = await AudioAnalyzer.addListener('frequencyData', (data) => {
          adapter.updateBands(data.bands)
        })
        listenersRef.current.push(freqHandle)

        // Listen for progress
        const progressHandle = await AudioAnalyzer.addListener('playbackProgress', (data) => {
          if (!cancelled) {
            setCurrentTime(data.currentTime)
            setIsPlaying(data.isPlaying)
          }
        })
        listenersRef.current.push(progressHandle)

        // Listen for completion
        const completeHandle = await AudioAnalyzer.addListener('playbackComplete', () => {
          if (!cancelled) {
            setIsPlaying(false)
            onComplete()
          }
        })
        listenersRef.current.push(completeHandle)

        // Load audio and auto-play
        const result = await AudioAnalyzer.loadBase64({ data: audioBase64 })
        if (!cancelled) {
          setAudioDuration(result.duration)
          setIsLoaded(true)
          setAnalyser(adapter)
          loaded.current = true
          // Auto-play to match web behavior
          await AudioAnalyzer.play()
          setIsPlaying(true)
        }
      } catch (err) {
        console.warn('[SessionPlayer] Native audio setup failed:', err)
        if (!cancelled) setIsLoaded(true)
      }
    }

    init()

    return () => {
      cancelled = true
      listenersRef.current.forEach(h => h.remove())
      listenersRef.current = []
      pluginRef.current?.stop().catch(() => {})
      loaded.current = false
      setAnalyser(null)
    }
  }, [audioBase64])

  const play = useCallback(async () => {
    if (!pluginRef.current || !loaded.current) return
    try {
      await pluginRef.current.play()
      setIsPlaying(true)
    } catch {}
  }, [])

  const pause = useCallback(async () => {
    if (!pluginRef.current) return
    try {
      const result = await pluginRef.current.pause()
      setCurrentTime(result.currentTime)
      setIsPlaying(false)
    } catch {}
  }, [])

  const seek = useCallback(async (time: number) => {
    if (!pluginRef.current) return
    try {
      await pluginRef.current.seek({ time })
      setCurrentTime(time)
    } catch {}
  }, [])

  const restart = useCallback(async () => {
    if (!pluginRef.current || !loaded.current) return
    try {
      await pluginRef.current.seek({ time: 0 })
      await pluginRef.current.play()
      setCurrentTime(0)
      setIsPlaying(true)
    } catch {}
  }, [])

  return { analyser, isPlaying, currentTime, audioDuration, isLoaded, play, pause, seek, restart }
}

// ─── SessionPlayer Component ───

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
  const [isCompleted, setIsCompleted] = useState(false)

  const handleComplete = useCallback(() => {
    setIsCompleted(true)
    onComplete()
  }, [onComplete])

  // Use native AudioAnalyzer plugin on native for real audio-reactive visualizer
  // Fall back to web player on web or when native plugin isn't available
  const useNativeAudio = HAS_NATIVE_AUDIO_PLUGIN
  const webPlayer = useWebPlayer(useNativeAudio ? null : audioBase64, handleComplete)
  const nativePlayer = useNativePlayer(useNativeAudio ? audioBase64 : null, handleComplete)
  const player = useNativeAudio ? nativePlayer : webPlayer

  const { analyser, isPlaying, currentTime, audioDuration, isLoaded, play, pause, seek, restart } = player

  // Pause background music when opening
  useEffect(() => {
    audioContext?.pauseMusic()
  }, [])

  // Set up Media Session for lock screen / background playback controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const meta = SESSION_META[session]

    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.label,
      artist: 'Voxu',
      album: 'Daily Guide',
    })
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'

    navigator.mediaSession.setActionHandler('play', () => play())
    navigator.mediaSession.setActionHandler('pause', () => pause())
    navigator.mediaSession.setActionHandler('stop', () => pause())

    return () => {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('stop', null)
    }
  }, [session, isPlaying, play, pause])

  const togglePlay = useCallback(() => {
    if (isPlaying) pause()
    else play()
  }, [isPlaying, play, pause])

  const handleRestart = useCallback(() => {
    setIsCompleted(false)
    restart()
  }, [restart])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (audioDuration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    seek(fraction * audioDuration)
  }, [audioDuration, seek])

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0
  const meta = SESSION_META[session]

  return (
    <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, overflow: 'hidden', backgroundColor: '#000000' }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute pointer-events-none" style={{ width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, transparent 70%)', filter: 'blur(40px)', opacity: isPlaying ? 1 : 0, transition: 'opacity 1.5s ease-in-out' }} />
        <div style={{ opacity: isPlaying ? 0.85 : 0.15, transition: 'opacity 1s ease-in-out' }}>
          <CircularVisualizer analyser={analyser} isPlaying={isPlaying} barCount={80} size={300} />
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
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check className="w-7 h-7 text-emerald-400" /></div>
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
              <button onClick={handleRestart} className="p-2 focus-visible:outline-none" aria-label="Restart"><RotateCcw className="w-7 h-7 text-white" /></button>
              <button onClick={onClose} className="w-16 h-16 rounded-full bg-white flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none"><Check className="w-7 h-7 text-black" /></button>
              <div className="w-11" />
            </>
          ) : audioBase64 ? (
            <button onClick={togglePlay} disabled={!isLoaded} className="w-16 h-16 rounded-full bg-white flex items-center justify-center disabled:opacity-40 transition-transform active:scale-95 focus-visible:outline-none" aria-label={isPlaying ? 'Pause' : 'Play'}>
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
