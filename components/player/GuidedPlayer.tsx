'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, ChevronDown, Loader2, Lock, Repeat, FileText, X } from 'lucide-react'
import { transcriptParagraphs } from '@/lib/voice/transcript'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useAutoplayNext } from '@/hooks/useAutoplayNext'
import { CircularVisualizer } from './CircularVisualizer'
import { sourceCache, contextCache, analyserCache, BufferAnalyser, type AudioAnalyserLike } from './audio-analyser-cache'
import { VOICE_GUIDES } from '@/components/home/home-types'
import { GUIDE_LAYERS } from '@/components/home/GuidedSection'
import { isContentFree } from '@/lib/subscription-constants'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { SceneBackdrop } from '@/components/home/SceneBackdrop'
import { GUIDED_SCENE } from '@/lib/home/scenes'
import { useDayScene } from '@/components/home/DayBackdrop'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

const IS_NATIVE = typeof window !== 'undefined' && !!(window as any).Capacitor

interface GuidedPlayerProps {
  guideId: string
  guideName: string
  isPlaying: boolean
  isLoading: boolean
  audioElement: HTMLAudioElement | null
  onTogglePlay: () => void
  onClose: () => void
  onSwitchGuide: (guideId: string, guideName: string) => void
  onLockedGuide?: (guideId: string, guideName: string) => void
  /** Fires when the track plays to its end (not on close or switch). Home
   *  uses it to mark a Daily Guide session done when it was played there. */
  onEnded?: () => void
  /** The guide's script — the exact words of the audio — for reading along. */
  transcript?: string | null
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function svgBg(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export function GuidedPlayer({
  guideId,
  guideName,
  isPlaying,
  isLoading,
  audioElement,
  onTogglePlay,
  onClose,
  onSwitchGuide,
  onLockedGuide,
  onEnded,
  transcript = null,
}: GuidedPlayerProps) {
  const [showTranscript, setShowTranscript] = useState(false)
  const paragraphs = transcriptParagraphs(transcript)
  const selectorRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [analyser, setAnalyser] = useState<AudioAnalyserLike | null>(null)
  const subscription = useSubscriptionOptional()
  const isPremium = subscription?.isPremium ?? false

  useBodyScrollLock()

  const autoplay = useAutoplayNext()

  /**
   * Roll into the next guide when this one ends.
   *
   * Wraps around, and skips anything locked on this tier rather than
   * advancing into a paywall — being interrupted by an upsell you didn't ask
   * for is the opposite of what someone lying still with their eyes closed
   * wants. If everything else is locked it simply stops.
   */
  useEffect(() => {
    if (!audioElement || !autoplay.enabled) return

    const onEnded = () => {
      const start = VOICE_GUIDES.findIndex(g => g.id === guideId)
      if (start === -1) return
      for (let step = 1; step <= VOICE_GUIDES.length; step++) {
        const candidate = VOICE_GUIDES[(start + step) % VOICE_GUIDES.length]
        if (candidate.id === guideId) break
        if (isContentFree('voiceGuide', candidate.id, isPremium)) {
          onSwitchGuide(candidate.id, candidate.name)
          return
        }
      }
    }

    audioElement.addEventListener('ended', onEnded)
    return () => audioElement.removeEventListener('ended', onEnded)
  }, [audioElement, autoplay.enabled, guideId, isPremium, onSwitchGuide])

  // Played to the end — independent of autoplay, which only decides what
  // comes next.
  useEffect(() => {
    if (!audioElement || !onEnded) return
    audioElement.addEventListener('ended', onEnded)
    return () => audioElement.removeEventListener('ended', onEnded)
  }, [audioElement, onEnded])

  // Keepalive handled by useAudioSideEffects at the provider level — no duplicate needed here

  // Connect audio element to analyser for real audio-reactive visualization
  // On native: use BufferAnalyser (no createMediaElementSource = no audio artifacts)
  // On web: use Web Audio API createMediaElementSource for true FFT data
  useEffect(() => {
    if (!audioElement) { setAnalyser(null); return }

    if (IS_NATIVE) {
      // Decode audio into AudioBuffer for BufferAnalyser — audio-reactive without Web Audio routing
      const setup = async () => {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
          const response = await fetch(audioElement.src)
          const arrayBuffer = await response.arrayBuffer()
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
          setAnalyser(new BufferAnalyser(audioBuffer, audioElement, 64))
          audioCtx.close().catch(() => {})
        } catch {
          setAnalyser(null)
        }
      }
      setup()
      return
    }

    try {
      let audioCtx = contextCache.get(audioElement)
      let source = sourceCache.get(audioElement)
      let node = analyserCache.get(audioElement)

      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        contextCache.set(audioElement, audioCtx)
      }
      if (!source) {
        source = audioCtx.createMediaElementSource(audioElement)
        sourceCache.set(audioElement, source)
      }
      if (!node) {
        node = audioCtx.createAnalyser()
        node.fftSize = 128
        node.smoothingTimeConstant = 0.75
        analyserCache.set(audioElement, node)
        source.connect(node)
        node.connect(audioCtx.destination)
      }
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
      setAnalyser(node)
    } catch {
      const cached = analyserCache.get(audioElement)
      if (cached) setAnalyser(cached)
    }
  }, [audioElement])

  // Track playback time
  useEffect(() => {
    if (!audioElement) return
    const updateTime = () => setCurrentTime(audioElement.currentTime)
    const updateDuration = () => setDuration(audioElement.duration || 0)
    audioElement.addEventListener('timeupdate', updateTime)
    audioElement.addEventListener('loadedmetadata', updateDuration)
    audioElement.addEventListener('durationchange', updateDuration)
    if (audioElement.duration) setDuration(audioElement.duration)
    return () => {
      audioElement.removeEventListener('timeupdate', updateTime)
      audioElement.removeEventListener('loadedmetadata', updateDuration)
      audioElement.removeEventListener('durationchange', updateDuration)
    }
  }, [audioElement])

  // Scroll active guide into view
  useEffect(() => {
    if (selectorRef.current) {
      const el = selectorRef.current.querySelector(`[data-guide-id="${guideId}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [guideId])

  // Seek on progress bar click/touch
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!audioElement || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    audioElement.currentTime = fraction * duration
  }, [audioElement, duration])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const activeGuide = VOICE_GUIDES.find(g => g.id === guideId)
  // Its own room photo when one is made; until then, Home's sky for the hour.
  const dayScene = useDayScene()
  const room = GUIDED_SCENE.tall ? GUIDED_SCENE : dayScene

  return (
    <div className="fixed inset-0 z-[55] flex flex-col overflow-hidden overscroll-none bg-black">
      {/* The room the session happens in (lib/home/scenes GUIDED_SCENE):
          one still photograph behind everything, tall on a phone and wide
          on an iPad in landscape. */}
      <SceneBackdrop key={room?.tall ?? 'none'} src={room?.tall} wideSrc={room?.wide} opacity={0.9} />
      {/* Transcript: the guide's exact words, over the player — the audio keeps
          playing, and closing it returns to the ring. For reading along, or
          reading instead of listening. */}
      {showTranscript && (
        <div className="absolute inset-0 z-40 bg-black/95 flex flex-col" role="dialog" aria-modal="true" aria-label={`${guideName} transcript`}>
          <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] h-16 shrink-0">
            <span className="text-px-11 font-medium uppercase tracking-[0.34em] text-white/80">Transcript</span>
            <button
              onClick={() => setShowTranscript(false)}
              aria-label="Close transcript"
              className="tap-44 w-11 h-11 rounded-full border border-white/25 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] md:max-w-[640px] md:mx-auto md:w-full">
            <h2 className="text-px-28 text-white leading-tight mt-2" style={SERIF}>{guideName}</h2>
            <div className="mt-5 space-y-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-px-17 text-white/90 leading-relaxed">{p}</p>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Top bar */}
      <div className="relative flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] h-16 z-20">
        <button
          aria-label="Close player"
          onClick={onClose}
          className="w-11 h-11 rounded-full border border-white/25 bg-black/30 backdrop-blur-sm flex items-center justify-center"
        >
          <ChevronDown className="w-5 h-5 text-white" />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 text-px-11 font-medium uppercase tracking-[0.34em] text-white/80">
          Guided
        </span>
        {paragraphs.length > 0 ? (
          <button
            onClick={() => setShowTranscript(true)}
            aria-label="Show transcript"
            className="tap-44 w-11 h-11 rounded-full border border-white/25 bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <FileText className="w-5 h-5 text-white" />
          </button>
        ) : (
          <div className="w-11" />
        )}
      </div>

      {/* Center: circular visualizer + title */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-6">
        {/* Circular ring visualizer, lit from behind with the scene's blue —
            drawn in the canvas (glow), never a CSS filter: that froze it. */}
        <div className="mb-10">
          <CircularVisualizer
            analyser={analyser}
            isPlaying={isPlaying}
            simulated={!analyser && isPlaying}
            barCount={72}
            glow="150 175 255"
            dial
            size={260}
          />
        </div>

        {/* Guide name */}
        <h1 className="text-px-44 leading-tight text-white text-center" style={{ ...SERIF, fontWeight: 600 }}>{guideName}</h1>
        {activeGuide && (
          <p className="text-lg text-white/60 mt-1 text-center">{activeGuide.tagline}</p>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative flex-shrink-0 px-6 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-4 z-10 md:max-w-[640px] md:mx-auto md:w-full">
        {/* Progress bar */}
        <div className="mb-5">
          <div
            className="relative w-full h-1 bg-white/15 rounded-full cursor-pointer"
            onClick={handleSeek}
            onTouchStart={handleSeek}
          >
            <div
              className="h-full rounded-full transition-[width] duration-100 bg-gradient-to-r from-[#7f9bff] to-white shadow-[0_0_12px_rgb(127_155_255/0.8)]"
              style={{ width: `${progress}%` }}
            />
            {/* The knob, so the bar reads as something you can drag. */}
            <span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_10px_rgb(127_155_255/0.9)] pointer-events-none"
              style={{ left: `${progress}%` }}
              aria-hidden
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-px-13 text-white/70 tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-px-13 text-white/70 tabular-nums">{duration > 0 ? formatTime(duration) : '--:--'}</span>
          </div>
        </div>

        {/* Keep playing — one preference shared with music and motivation,
            because it's one intention: settled in, keep it going. */}
        <div className="flex justify-center pb-3">
          <button
            onClick={autoplay.toggle}
            aria-pressed={autoplay.enabled}
            className={`inline-flex items-center gap-2 h-11 px-5 rounded-full text-px-14 font-medium backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
              autoplay.enabled
                ? 'bg-black/40 border border-white/30 text-white'
                : 'bg-black/30 border border-white/15 text-white/55 hover:text-white/80'
            }`}
          >
            <Repeat className="w-4 h-4" />
            {autoplay.enabled ? 'Keep playing' : 'Stop after this'}
          </button>
        </div>

        {/* Guide selector — miniature SVG pattern cards */}
        <div ref={selectorRef} className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
          {VOICE_GUIDES.map((guide) => {
            const isActive = guide.id === guideId
            const isLocked = !isContentFree('voiceGuide', guide.id, isPremium)
            const layers = GUIDE_LAYERS[guide.id] || GUIDE_LAYERS['anxiety']
            return (
              <button
                key={guide.id}
                data-guide-id={guide.id}
                onClick={() => {
                  if (guide.id === guideId) return
                  if (isLocked) {
                    onLockedGuide?.(guide.id, guide.name)
                  } else {
                    onSwitchGuide(guide.id, guide.name)
                  }
                }}
                className="flex flex-col items-center gap-2 shrink-0"
              >
                <div className={`relative w-[76px] h-[92px] rounded-2xl overflow-hidden transition-all duration-200 ${
                  isActive
                    ? 'border-2 border-white bg-black scene-selected'
                    : 'border border-white/15 bg-black/70'
                }`}>
                  {/* Lock badge */}
                  {isLocked && !isActive && (
                    <div className="absolute top-1 right-1 z-20">
                      <Lock className="w-2.5 h-2.5 text-white/70" />
                    </div>
                  )}
                  {/* SVG pattern layers */}
                  {layers.map((layer, i) => (
                    <div
                      key={i}
                      className={`absolute inset-0 ${isActive && isPlaying ? layer.cls : ''}`}
                      style={{
                        backgroundImage: svgBg(layer.svg),
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: isActive ? 1 : 0.5,
                        ...(isActive && isPlaying ? {
                          animationDuration: layer.dur,
                          WebkitAnimationDuration: layer.dur,
                        } : {}),
                      }}
                    />
                  ))}
                </div>
                <span className={`text-px-12 transition-colors whitespace-nowrap ${isActive ? 'text-white font-semibold' : 'text-white/60'}`}>
                  {guide.name}
                </span>
              </button>
            )
          })}
        </div>

        {/* Play/Pause button */}
        <div className="flex justify-center py-2">
          <button
            aria-label={isLoading ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
            onClick={onTogglePlay}
            disabled={isLoading}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center transition-transform active:scale-95 disabled:opacity-80 shadow-[0_0_0_4px_rgb(127_155_255/0.35),0_0_40px_rgb(127_155_255/0.55)]"
          >
            {isLoading ? (
              <Loader2 className="w-7 h-7 text-black animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7 text-black" fill="black" />
            ) : (
              <Play className="w-7 h-7 text-black ml-0.5" fill="black" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
