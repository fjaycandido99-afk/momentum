'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, ChevronDown, Loader2 } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { CircularVisualizer } from './CircularVisualizer'
import { sourceCache, contextCache, analyserCache, type AudioAnalyserLike } from './audio-analyser-cache'
import { VOICE_GUIDES } from '@/components/home/home-types'
import { GUIDE_LAYERS } from '@/components/home/GuidedSection'

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
}: GuidedPlayerProps) {
  const selectorRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [analyser, setAnalyser] = useState<AudioAnalyserLike | null>(null)

  useBodyScrollLock()

  // Connect audio element to Web Audio analyser for CircularVisualizer
  // Skip on native — createMediaElementSource causes audio distortion in WKWebView
  useEffect(() => {
    if (!audioElement || IS_NATIVE) { setAnalyser(null); return }
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

  return (
    <div className="fixed inset-0 z-[55] flex flex-col overflow-hidden overscroll-none bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] h-14 z-20">
        <button aria-label="Close player" onClick={onClose} className="p-2 -ml-2">
          <ChevronDown className="w-7 h-7 text-white" />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
          Guided
        </span>
        <div className="w-7" />
      </div>

      {/* Center: circular visualizer + title */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6">
        {/* Circular ring visualizer */}
        <div className="mb-10">
          <CircularVisualizer
            analyser={analyser}
            isPlaying={isPlaying}
            simulated={!analyser && isPlaying}
            barCount={64}
            size={200}
          />
        </div>

        {/* Guide name */}
        <h1 className="text-2xl font-bold text-white mb-1">{guideName}</h1>
        {activeGuide && (
          <p className="text-sm text-white/50">{activeGuide.tagline}</p>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex-shrink-0 px-6 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-4 z-10">
        {/* Progress bar */}
        <div className="mb-5">
          <div
            className="w-full h-1 bg-white/10 rounded-full cursor-pointer"
            onClick={handleSeek}
            onTouchStart={handleSeek}
          >
            <div
              className="h-full bg-white rounded-full transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-white/40 tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-[11px] text-white/40 tabular-nums">{duration > 0 ? formatTime(duration) : '--:--'}</span>
          </div>
        </div>

        {/* Guide selector — miniature SVG pattern cards */}
        <div ref={selectorRef} className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
          {VOICE_GUIDES.map((guide) => {
            const isActive = guide.id === guideId
            const layers = GUIDE_LAYERS[guide.id] || GUIDE_LAYERS['anxiety']
            return (
              <button
                key={guide.id}
                data-guide-id={guide.id}
                onClick={() => {
                  if (guide.id !== guideId) onSwitchGuide(guide.id, guide.name)
                }}
                className="flex flex-col items-center gap-1.5 shrink-0"
              >
                <div className={`relative w-14 h-[72px] rounded-xl overflow-hidden transition-all duration-200 ${
                  isActive
                    ? 'border-2 border-white bg-black'
                    : 'border border-white/15 bg-black'
                }`}>
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
                <span className={`text-[9px] transition-colors whitespace-nowrap ${isActive ? 'text-white' : 'text-white/50'}`}>
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
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center transition-transform active:scale-95 disabled:opacity-80"
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
