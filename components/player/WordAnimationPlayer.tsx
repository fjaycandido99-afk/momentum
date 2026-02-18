'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Volume2, VolumeX, ExternalLink, Play, Pause, SkipForward, SkipBack, PenLine, Image, Video, X } from 'lucide-react'
import { PlayerJournalSheet } from './PlayerJournalSheet'
import type { YTPlayer } from '@/lib/youtube-types'
import '@/lib/youtube-types' // Import for global Window.YT declaration

interface WordAnimationPlayerProps {
  word: string
  script: string
  color: string
  youtubeId: string
  backgroundImage?: string
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

export function WordAnimationPlayer({ word, color, youtubeId, backgroundImage, onClose, externalAudio = false, externalPlaying, onTogglePlay, externalDuration, externalCurrentTime, onSeek, onSkipNext, onSkipPrevious, hasNext = false, hasPrevious = false, category }: WordAnimationPlayerProps) {
  const [isPlayingLocal, setIsPlayingLocal] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [embedError, setEmbedError] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Video/Image view mode (defaults to image for all categories)
  const [viewMode, setViewMode] = useState<'image' | 'video'>('image')
  const visiblePlayerRef = useRef<YTPlayer | null>(null)
  const visibleContainerRef = useRef<HTMLDivElement>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const latestTimeRef = useRef(0)

  // Journal FAB state (motivation-only)
  const [showJournalFAB, setShowJournalFAB] = useState(false)
  const [showNudge, setShowNudge] = useState(false)
  const [showJournal, setShowJournal] = useState(false)
  const journalTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Unified playing state: external mode uses parent state, local mode uses own state
  const isPlaying = externalAudio ? (externalPlaying ?? false) : isPlayingLocal

  // Unified duration/time: external mode uses parent values, local uses own
  const activeDuration = externalAudio ? (externalDuration ?? 0) : duration
  const activeCurrentTime = externalAudio ? (externalCurrentTime ?? 0) : currentTime
  const activeReady = externalAudio ? (activeDuration > 0) : playerReady

  // Get background color from the gradient class
  const bgColor = colorMap[color]?.bg || '#08080c'

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

  // Show journal FAB after 30s of playback, nudge fades after 5s
  useEffect(() => {
    journalTimerRef.current = setTimeout(() => {
      setShowJournalFAB(true)
      setShowNudge(true)
      setTimeout(() => setShowNudge(false), 5000)
    }, 30000)
    return () => {
      if (journalTimerRef.current) clearTimeout(journalTimerRef.current)
    }
  }, [])

  // Keep latestTimeRef in sync for the sync interval closure
  latestTimeRef.current = activeCurrentTime

  // Visible YouTube player for video mode (muted, synced to background audio)
  useEffect(() => {
    if (viewMode !== 'video' || !visibleContainerRef.current) {
      // Cleanup when switching back to image mode
      if (visiblePlayerRef.current) {
        visiblePlayerRef.current.destroy()
        visiblePlayerRef.current = null
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
      return
    }

    const createVisiblePlayer = () => {
      if (!visibleContainerRef.current || !window.YT) return

      // Clear any existing content
      visibleContainerRef.current.innerHTML = ''
      const playerDiv = document.createElement('div')
      playerDiv.id = 'yt-visible-' + Date.now()
      visibleContainerRef.current.appendChild(playerDiv)

      visiblePlayerRef.current = new window.YT.Player(playerDiv.id, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          playsinline: 1,
          mute: 1,
        },
        events: {
          onReady: (event) => {
            event.target.mute()
            // Seek to current position (use ref for latest value)
            const seekPos = latestTimeRef.current
            if (seekPos > 1) {
              event.target.seekTo(seekPos, true)
            }
            // Match play/pause state
            if (isPlaying) {
              event.target.playVideo()
            } else {
              event.target.pauseVideo()
            }
          },
          onStateChange: () => {
            // Keep it muted always
            if (visiblePlayerRef.current) {
              visiblePlayerRef.current.mute()
            }
          },
        },
      })

      // Periodic sync every 5s (uses ref so we always get latest time)
      syncIntervalRef.current = setInterval(() => {
        if (!visiblePlayerRef.current) return
        const audioTime = latestTimeRef.current
        const videoTime = visiblePlayerRef.current.getCurrentTime()
        if (Math.abs(audioTime - videoTime) > 2) {
          visiblePlayerRef.current.seekTo(audioTime, true)
        }
      }, 5000)
    }

    if (window.YT) {
      createVisiblePlayer()
    }
    // YT API should already be loaded since the background player uses it

    return () => {
      if (visiblePlayerRef.current) {
        visiblePlayerRef.current.destroy()
        visiblePlayerRef.current = null
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, youtubeId])

  // Sync visible player play/pause state with audio
  useEffect(() => {
    if (viewMode !== 'video' || !visiblePlayerRef.current) return
    try {
      if (isPlaying) {
        visiblePlayerRef.current.playVideo()
      } else {
        visiblePlayerRef.current.pauseVideo()
      }
    } catch { /* player may not be ready */ }
  }, [isPlaying, viewMode])

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
        const seekTime = percent * activeDuration
        onSeek(seekTime)
        // Sync visible player too
        if (visiblePlayerRef.current) {
          visiblePlayerRef.current.seekTo(seekTime, true)
        }
      }
    } else if (playerRef.current && duration > 0) {
      const seekTime = percent * duration
      playerRef.current.seekTo(seekTime, true)
      setCurrentTime(seekTime)
      if (visiblePlayerRef.current) {
        visiblePlayerRef.current.seekTo(seekTime, true)
      }
    }
  }, [duration, externalAudio, activeDuration, onSeek])

  // Remaining time as negative (Spotify-style)
  const remainingTime = activeDuration > 0 ? activeDuration - activeCurrentTime : 0

  return (
    <div className="fixed inset-0 z-[55] overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Hidden YouTube player container (only for local audio mode) */}
      {!externalAudio && (
        <div
          ref={containerRef}
          className="absolute -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden pointer-events-none"
        />
      )}

      {/* === Fullscreen artwork background === */}
      <div className="absolute inset-0">
        {viewMode === 'video' ? (
          <>
            <div
              ref={visibleContainerRef}
              className="w-full h-full [&>div]:w-full [&>div]:h-full [&>div>iframe]:w-full [&>div>iframe]:h-full"
            />
            {/* Block YouTube UI */}
            <div className="absolute inset-0 z-[2]" />
          </>
        ) : (
          <>
            {backgroundImage ? (
              <img
                src={backgroundImage}
                alt={word}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/[0.02]" />
            )}
          </>
        )}
        {/* Bottom gradient for controls readability */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-[3] pointer-events-none" />
      </div>

      {/* === Top bar === */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] h-14 z-20">
        {/* Switch to video (motivation only) or chevron down */}
        {category === 'Motivation' ? (
          <button
            onClick={() => setViewMode(viewMode === 'video' ? 'image' : 'video')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm focus-visible:outline-none"
          >
            <Video className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-medium text-white">
              {viewMode === 'video' ? 'Switch to image' : 'Switch to video'}
            </span>
          </button>
        ) : (
          <button
            aria-label="Close player"
            onClick={onClose}
            className="p-2 -ml-2 focus-visible:outline-none"
          >
            <ChevronDown className="w-7 h-7 text-white" />
          </button>
        )}

        {/* Mute (local audio only) */}
        <div className="flex items-center">
          {!externalAudio && (
            <button
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              onClick={toggleMute}
              className="p-2 focus-visible:outline-none"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white/70" />
              ) : (
                <Volume2 className="w-5 h-5 text-white/70" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* === Bottom controls (overlaid on artwork) === */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)]">

        {/* Title row: thumbnail + title + close */}
        <div className="flex items-center gap-3 mb-4">
          {/* Small thumbnail */}
          <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-white/10">
            {backgroundImage ? (
              <img
                src={backgroundImage}
                alt={word}
                className="w-full h-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40 text-xs font-bold">
                {word.charAt(0)}
              </div>
            )}
          </div>
          {/* Title + category */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate">{word}</h1>
            <p className="text-xs text-white/60 truncate">
              {category || 'Now playing'}
            </p>
          </div>
          {/* Close button */}
          <button
            aria-label="Close player"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 flex-shrink-0 focus-visible:outline-none"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {/* Error fallback */}
        {!externalAudio && embedError ? (
          <div className="flex flex-col items-center gap-3 mb-4">
            <p className="text-white/70 text-sm">This video can&apos;t be embedded</p>
            <a
              href={`https://www.youtube.com/watch?v=${youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Watch on YouTube
            </a>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="mb-3">
              <div
                className="h-[3px] bg-white/25 rounded-full cursor-pointer relative group"
                onClick={handleSeek}
              >
                {!activeReady && <div className="absolute inset-0 animate-shimmer rounded-full" />}
                <div
                  className="h-full rounded-full transition-[width] duration-100 relative"
                  style={{
                    width: activeReady ? `${progressPercent}%` : '0%',
                    backgroundColor: 'white',
                  }}
                >
                  {/* Scrubber dot */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
                </div>
              </div>
              <div className="flex justify-between mt-1.5 text-[11px] text-white/50 font-medium">
                <span>{formatTime(activeCurrentTime)}</span>
                <span>{activeDuration > 0 ? `-${formatTime(remainingTime)}` : '--:--'}</span>
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-center gap-8 py-1">
              {/* Previous */}
              <button
                aria-label="Previous"
                onClick={onSkipPrevious}
                disabled={!hasPrevious}
                className="p-2 disabled:opacity-30 focus-visible:outline-none"
              >
                <SkipBack className="w-7 h-7 text-white" fill="white" />
              </button>

              {/* Play/Pause — large white circle */}
              <button
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlay}
                disabled={!activeReady && !externalAudio}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center disabled:opacity-40 transition-transform active:scale-95 focus-visible:outline-none"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 text-black" fill="black" />
                ) : (
                  <Play className="w-7 h-7 text-black ml-0.5" fill="black" />
                )}
              </button>

              {/* Next */}
              <button
                aria-label="Next"
                onClick={onSkipNext}
                disabled={!hasNext}
                className="p-2 disabled:opacity-30 focus-visible:outline-none"
              >
                <SkipForward className="w-7 h-7 text-white" fill="white" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Journal FAB + nudge (motivation only, after 30s) */}
      {!showJournal && showJournalFAB && (
        <div className="absolute bottom-52 right-5 z-20 flex items-center gap-3 animate-fade-in">
          {showNudge && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-4 py-2 animate-nudge-in">
              <span className="text-white/90 text-xs font-medium whitespace-nowrap">
                Feeling inspired? Capture it.
              </span>
            </div>
          )}
          <button
            aria-label="Open journal"
            onClick={() => setShowJournal(true)}
            className="relative w-11 h-11 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0"
          >
            <span className="absolute inset-0 rounded-full animate-fab-pulse" />
            <PenLine className="w-4 h-4 text-white relative z-10" />
          </button>
        </div>
      )}

      {/* Journal sheet overlay */}
      <PlayerJournalSheet open={showJournal} onClose={() => setShowJournal(false)} />
    </div>
  )
}
