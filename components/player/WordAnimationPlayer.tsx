'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Volume2, VolumeX, ExternalLink, Play, Pause } from 'lucide-react'
import { RainEffect } from '@/components/effects/RainEffect'

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          videoId: string
          playerVars?: Record<string, number | string>
          events?: {
            onReady?: (event: { target: YTPlayer }) => void
            onStateChange?: (event: { data: number }) => void
            onError?: (event: { data: number }) => void
          }
        }
      ) => YTPlayer
    }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  setVolume: (volume: number) => void
  destroy: () => void
  getDuration: () => number
  getCurrentTime: () => number
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
}

interface WordAnimationPlayerProps {
  word: string
  script: string
  color: string
  youtubeId: string
  backgroundImage?: string
  showRain?: boolean
  onClose: () => void
}

// Clean dark theme - subtle and atmospheric
const colorMap: Record<string, { primary: string; glow: string; bg: string }> = {
  'from-white/[0.06] to-white/[0.02]': { primary: 'rgba(245, 245, 250, 0.95)', glow: 'rgba(245, 245, 250, 0.2)', bg: '#08080c' },
}

export function WordAnimationPlayer({ word, color, youtubeId, backgroundImage, showRain = false, onClose }: WordAnimationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [embedError, setEmbedError] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Get background color from the gradient class
  const bgColor = colorMap[color]?.bg || '#08080c'
  const progressColor = colorMap[color]?.primary || 'rgba(139, 92, 246, 0.9)'

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  // Load YouTube IFrame API
  useEffect(() => {
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
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(80)
            event.target.playVideo()
            setPlayerReady(true)
            setIsPlaying(true)
            // Get video duration
            const videoDuration = event.target.getDuration()
            setDuration(videoDuration)
            // Start progress tracking
            progressIntervalRef.current = setInterval(() => {
              if (playerRef.current) {
                const time = playerRef.current.getCurrentTime()
                setCurrentTime(time)
              }
            }, 1000)
          },
          onStateChange: (event) => {
            if (event.data === 1) {
              setIsPlaying(true)
            }
          },
          onError: (event) => {
            console.error('YouTube player error:', event.data)
            // Error 150: embedding disabled by owner
            // Error 101: video removed or private
            // Error 2: invalid video ID
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
  }, [youtubeId])

  // Toggle mute
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
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo()
        setIsPlaying(false)
      } else {
        playerRef.current.playVideo()
        setIsPlaying(true)
      }
    }
  }, [isPlaying])

  // Seek to position
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (playerRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percent = clickX / rect.width
      const seekTime = percent * duration
      playerRef.current.seekTo(seekTime, true)
      setCurrentTime(seekTime)
    }
  }, [duration])

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Background image */}
      {backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/60" />
          {/* Rain effect for lo-fi backgrounds */}
          {showRain && <RainEffect intensity="medium" showLightning />}
        </>
      )}

      {/* Hidden YouTube player container */}
      <div
        ref={containerRef}
        className="absolute -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden pointer-events-none"
      />

      {/* Close & Mute buttons */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={toggleMute}
          className="p-3 rounded-full bg-black/30 hover:bg-black/50 transition-colors backdrop-blur-sm"
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-white" />
          ) : (
            <Volume2 className="w-6 h-6 text-white" />
          )}
        </button>
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-black/30 hover:bg-black/50 transition-colors backdrop-blur-sm"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8">
        {/* Title */}
        <h1
          className="text-4xl md:text-5xl font-bold text-white uppercase tracking-widest text-center mb-8"
          style={{ textShadow: '0 4px 30px rgba(0,0,0,0.8)' }}
        >
          {word}
        </h1>

        {/* Status text or error fallback */}
        {embedError ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-white/70 text-sm text-center">
              This video can't be embedded
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
            {/* Play/Pause button */}
            <button
              onClick={togglePlay}
              disabled={!playerReady}
              className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center disabled:opacity-50 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-float"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" fill="white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              )}
            </button>

            {/* Seekable progress bar */}
            <div className="w-full animate-fade-in">
              <div
                className="h-3 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
                onClick={handleSeek}
              >
                {!playerReady && <div className="absolute inset-0 animate-shimmer" />}
                <div
                  className="h-full rounded-full transition-all duration-100 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                  style={{
                    width: playerReady ? `${progressPercent}%` : '0%',
                    backgroundColor: 'white',
                  }}
                />
              </div>
              <div className="flex justify-between mt-3 text-white/80 text-sm font-medium">
                <span>{formatTime(currentTime)}</span>
                <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
              </div>
            </div>

            <p className="text-white/70 text-sm">
              {!playerReady ? 'Loading...' : isPlaying ? 'Now playing' : 'Paused'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
