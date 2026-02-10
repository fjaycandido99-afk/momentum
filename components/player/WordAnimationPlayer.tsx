'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Volume2, VolumeX, ExternalLink, Play, Pause, SkipForward, SkipBack } from 'lucide-react'
import { RainEffect } from '@/components/effects/RainEffect'
import { ConstellationBackground } from '@/components/player/ConstellationBackground'
import type { YTPlayer } from '@/lib/youtube-types'
import '@/lib/youtube-types' // Import for global Window.YT declaration

interface WordAnimationPlayerProps {
  word: string
  script: string
  color: string
  youtubeId: string
  backgroundImage?: string
  showRain?: boolean
  showConstellation?: boolean
  onClose: () => void
  /** When true, audio is owned by the parent — no YT player is created here */
  externalAudio?: boolean
  /** Current play state from parent (used when externalAudio is true) */
  externalPlaying?: boolean
  /** Toggle play/pause on parent's audio (used when externalAudio is true) */
  onTogglePlay?: () => void
  /** Duration in seconds from parent's YT player */
  externalDuration?: number
  /** Current playback time from parent's YT player */
  externalCurrentTime?: number
  /** Seek to a specific time (seconds) on parent's YT player */
  onSeek?: (seconds: number) => void
  /** Skip to next video in playlist */
  onSkipNext?: () => void
  /** Skip to previous video in playlist */
  onSkipPrevious?: () => void
  /** Whether there's a next video available */
  hasNext?: boolean
  /** Whether there's a previous video available */
  hasPrevious?: boolean
  /** Category label shown as a pill above the title (e.g. "Music" or "Motivation") */
  category?: string
}

// Clean dark theme - subtle and atmospheric
const colorMap: Record<string, { primary: string; glow: string; bg: string }> = {
  'from-white/[0.06] to-white/[0.02]': { primary: 'rgba(245, 245, 250, 0.95)', glow: 'rgba(245, 245, 250, 0.2)', bg: '#08080c' },
}

export function WordAnimationPlayer({ word, color, youtubeId, backgroundImage, showRain = false, showConstellation = false, onClose, externalAudio = false, externalPlaying, onTogglePlay, externalDuration, externalCurrentTime, onSeek, onSkipNext, onSkipPrevious, hasNext = false, hasPrevious = false, category }: WordAnimationPlayerProps) {
  const [isPlayingLocal, setIsPlayingLocal] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [embedError, setEmbedError] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Unified playing state: external mode uses parent state, local mode uses own state
  const isPlaying = externalAudio ? (externalPlaying ?? false) : isPlayingLocal

  // Unified duration/time: external mode uses parent values, local uses own
  const activeDuration = externalAudio ? (externalDuration ?? 0) : duration
  const activeCurrentTime = externalAudio ? (externalCurrentTime ?? 0) : currentTime
  const activeReady = externalAudio ? (activeDuration > 0) : playerReady

  // Get background color from the gradient class
  const bgColor = colorMap[color]?.bg || '#08080c'
  const progressColor = colorMap[color]?.primary || 'rgba(139, 92, 246, 0.9)'

  // Format seconds to h:mm:ss or m:ss
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage
  const progressPercent = activeDuration > 0 ? (activeCurrentTime / activeDuration) * 100 : 0

  // Load YouTube IFrame API (only when NOT in external audio mode)
  useEffect(() => {
    if (externalAudio) return

    const loadYouTubeAPI = () => {
      if (window.YT) {
        initPlayer()
        return
      }

      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = initPlayer
    }

    const initPlayer = () => {
      if (!containerRef.current) return

      const playerDiv = document.createElement('div')
      playerDiv.id = 'yt-player-' + Date.now()
      containerRef.current.appendChild(playerDiv)

      playerRef.current = new window.YT.Player(playerDiv.id, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          loop: 1,
          playlist: youtubeId,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(80)
            event.target.playVideo()
            setPlayerReady(true)
            const videoDuration = event.target.getDuration()
            setDuration(videoDuration)
            progressIntervalRef.current = setInterval(() => {
              if (playerRef.current) {
                const time = playerRef.current.getCurrentTime()
                setCurrentTime(time)
              }
            }, 1000)
          },
          onStateChange: (event) => {
            if (event.data === 1) {
              setIsPlayingLocal(true)
            } else if (event.data === 2 || event.data === 5 || event.data === 0) {
              setIsPlayingLocal(false)
            }
          },
          onError: (event) => {
            console.error('YouTube player error:', event.data)
            if (event.data === 150 || event.data === 101 || event.data === 2) {
              setEmbedError(true)
            }
          },
        },
      })
    }

    loadYouTubeAPI()

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [youtubeId, externalAudio])

  // Toggle mute (only for local audio mode)
  const toggleMute = useCallback(() => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.setVolume(80)
      } else {
        playerRef.current.setVolume(0)
      }
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (externalAudio) {
      onTogglePlay?.()
      return
    }
    if (playerRef.current) {
      if (isPlayingLocal) {
        playerRef.current.pauseVideo()
        setIsPlayingLocal(false)
      } else {
        playerRef.current.playVideo()
        setIsPlayingLocal(true)
      }
    }
  }, [externalAudio, onTogglePlay, isPlayingLocal])

  // Seek to position
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = clickX / rect.width
    if (externalAudio) {
      if (activeDuration > 0 && onSeek) {
        onSeek(percent * activeDuration)
      }
    } else if (playerRef.current && duration > 0) {
      const seekTime = percent * duration
      playerRef.current.seekTo(seekTime, true)
      setCurrentTime(seekTime)
    }
  }, [duration, externalAudio, activeDuration, onSeek])

  return (
    <div
      className="fixed inset-0 z-[55] overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Background image */}
      {backgroundImage && (
        <>
          <img
            src={backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/60" />
          {/* Rain effect for lo-fi backgrounds */}
          {showRain && <RainEffect intensity="medium" showLightning />}
        </>
      )}

      {/* Constellation background for cosmic sounds */}
      {showConstellation && !backgroundImage && (
        <div className="absolute inset-0">
          <ConstellationBackground animate nodeCount={60} connectionDist={130} speed={0.2} />
        </div>
      )}

      {/* Hidden YouTube player container (only for local audio mode) */}
      {!externalAudio && (
        <div
          ref={containerRef}
          className="absolute -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden pointer-events-none"
        />
      )}

      {/* Close & Mute buttons */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        {!externalAudio && (
          <button
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            onClick={toggleMute}
            className="p-3 rounded-full bg-black/30 hover:bg-black/50 transition-colors backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-white" />
            ) : (
              <Volume2 className="w-6 h-6 text-white" />
            )}
          </button>
        )}
        <button
          aria-label="Close player"
          onClick={onClose}
          className="p-3 rounded-full bg-black/30 hover:bg-black/50 transition-colors backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8">
        {/* Category pill */}
        {category && (
          <span className="category-pill mb-4">{category}</span>
        )}

        {/* Title */}
        <h1
          className="text-4xl md:text-5xl font-bold text-white uppercase tracking-widest text-center mb-8"
          style={{ textShadow: '0 4px 30px rgba(0,0,0,0.8)' }}
        >
          {word}
        </h1>

        {/* Status text or error fallback */}
        {!externalAudio && embedError ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-white/95 text-sm text-center">
              This video can&apos;t be embedded
            </p>
            <a
              href={`https://www.youtube.com/watch?v=${youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <ExternalLink className="w-5 h-5" />
              Watch on YouTube
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            {/* Playback controls */}
            <div className="flex items-center gap-3">
              {/* Previous button */}
              {(hasPrevious || onSkipPrevious) && (
                <button
                  aria-label="Previous"
                  onClick={onSkipPrevious}
                  disabled={!hasPrevious}
                  className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  <SkipBack className="w-5 h-5 text-white" fill="white" />
                </button>
              )}

              {/* Play/Pause button */}
              <button
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlay}
                disabled={!activeReady && !externalAudio}
                className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center disabled:opacity-40 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-float focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" fill="white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                )}
              </button>

              {/* Next/Skip button */}
              {(hasNext || onSkipNext) && (
                <button
                  aria-label="Next"
                  onClick={onSkipNext}
                  disabled={!hasNext}
                  className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  <SkipForward className="w-5 h-5 text-white" fill="white" />
                </button>
              )}
            </div>

            {/* Seekable progress bar */}
            <div className="w-full animate-fade-in">
              <div
                className="h-3 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
                onClick={handleSeek}
              >
                {!activeReady && <div className="absolute inset-0 animate-shimmer" />}
                <div
                  className="h-full rounded-full transition-all duration-100 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                  style={{
                    width: activeReady ? `${progressPercent}%` : '0%',
                    backgroundColor: 'white',
                  }}
                />
              </div>
              <div className="flex justify-between mt-3 text-white/95 text-sm font-medium">
                <span>{formatTime(activeCurrentTime)}</span>
                <span>{activeDuration > 0 ? formatTime(activeDuration) : '--:--'}</span>
              </div>
            </div>

            <p className="text-white/95 text-sm">
              {!activeReady ? 'Loading...' : isPlaying ? 'Now playing' : 'Paused'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
