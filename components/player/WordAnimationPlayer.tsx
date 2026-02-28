'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Volume2, VolumeX, ExternalLink, Play, Pause, SkipForward, SkipBack, PenLine, Image, Video, X } from 'lucide-react'
import { PlayerJournalSheet } from './PlayerJournalSheet'
import { useDeviceTilt } from '@/hooks/useDeviceTilt'
import type { YTPlayer } from '@/lib/youtube-types'
import '@/lib/youtube-types' // Import for global Window.YT declaration

interface WordAnimationPlayerProps {
  word: string
  script: string
  color: string
  youtubeId: string
  backgroundImage?: string
  /** Full image pool for slideshow — picks 10 random images seeded by youtubeId */
  backgroundImages?: string[]
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

// --- Seeded shuffle (same algorithm as home-types) ---
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function pickSlideshowImages(pool: string[], youtubeId: string, count = 10): string[] {
  // Create a numeric seed from the youtubeId string
  let seed = 0
  for (let i = 0; i < youtubeId.length; i++) {
    seed = (seed * 31 + youtubeId.charCodeAt(i)) | 0
  }
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

// --- Background Slideshow ---
function BackgroundSlideshow({ images, words, playing, youtubeId }: {
  images: string[]
  words: string[]
  playing: boolean
  youtubeId: string
}) {
  const slides = useRef<string[]>([])
  const indexRef = useRef(0)
  const activeLayerRef = useRef<'a' | 'b'>('a')
  const [layerA, setLayerA] = useState('')
  const [layerB, setLayerB] = useState('')
  const [visibleLayer, setVisibleLayer] = useState<'a' | 'b'>('a')
  const [currentWord, setCurrentWord] = useState('')
  const [wordVisible, setWordVisible] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Pick 10 images when youtubeId or image pool changes
  useEffect(() => {
    slides.current = pickSlideshowImages(images, youtubeId)
    indexRef.current = 0
    activeLayerRef.current = 'a'
    const first = slides.current[0] || ''
    setLayerA(first)
    setLayerB(first)
    setVisibleLayer('a')
  }, [images, youtubeId])

  // Show the first word once words arrive
  useEffect(() => {
    if (words.length > 0 && !currentWord) {
      setCurrentWord(words[0])
      // Small delay so the initial fade-in is visible
      requestAnimationFrame(() => setWordVisible(true))
    }
  }, [words, currentWord])

  // Reset word when youtubeId changes
  useEffect(() => {
    setCurrentWord('')
    setWordVisible(false)
  }, [youtubeId])

  // Advance: crossfade image + word together
  const advance = useCallback(() => {
    const nextIndex = (indexRef.current + 1) % slides.current.length
    const nextSrc = slides.current[nextIndex]
    if (!nextSrc) return
    indexRef.current = nextIndex

    // Step 1: fade out the word
    setWordVisible(false)

    const doFlip = () => {
      const hidden = activeLayerRef.current === 'a' ? 'b' : 'a'
      if (hidden === 'b') setLayerB(nextSrc)
      else setLayerA(nextSrc)

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          activeLayerRef.current = hidden
          setVisibleLayer(hidden)

          // Step 2: after image starts crossfading, swap word and fade it in
          setTimeout(() => {
            setCurrentWord(prev => {
              const wordList = words
              if (wordList.length === 0) return prev
              const idx = wordList.indexOf(prev)
              return wordList[(idx + 1) % wordList.length]
            })
            setWordVisible(true)
          }, 800)
        })
      })
    }

    // Use decode() to ensure image is fully decoded before crossfade.
    // This prevents the slideshow freezing on mobile (cached images can
    // fire onload synchronously before the handler is attached) and
    // ensures the image is paint-ready so the crossfade is smooth.
    const img = new window.Image()
    img.src = nextSrc
    if (typeof img.decode === 'function') {
      img.decode().then(doFlip).catch(doFlip)
    } else {
      // Fallback: attach onload BEFORE setting src to avoid sync-fire miss
      const fallback = new window.Image()
      fallback.onload = doFlip
      fallback.onerror = doFlip
      fallback.src = nextSrc
    }
  }, [words])

  // Timer: advance every 12s while playing
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (playing && slides.current.length > 1) {
      timerRef.current = setInterval(advance, 12000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [playing, advance, youtubeId])

  if (!layerA) return null

  return (
    <>
      <img
        src={layerA}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2s] ease-in-out will-change-[opacity] [backface-visibility:hidden]"
        style={{ opacity: visibleLayer === 'a' ? 1 : 0 }}
      />
      <img
        src={layerB || layerA}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2s] ease-in-out will-change-[opacity] [backface-visibility:hidden]"
        style={{ opacity: visibleLayer === 'b' ? 1 : 0 }}
      />
      {/* Centered word overlay — scales down for longer words so it never overflows */}
      {currentWord && (
        <div className="absolute inset-0 flex items-center justify-center z-[1] pointer-events-none px-4">
          <span
            className="font-black text-white/90 transition-opacity duration-[1.2s] ease-in-out drop-shadow-[0_4px_30px_rgba(0,0,0,0.7)] text-center"
            style={{
              opacity: wordVisible ? 1 : 0,
              fontSize: `min(3rem, calc((100vw - 2rem) / ${currentWord.length * 1.2}))`,
              letterSpacing: currentWord.length > 8 ? '0.12em' : '0.2em',
            }}
          >
            {currentWord}
          </span>
        </div>
      )}
    </>
  )
}

// Clean dark theme - subtle and atmospheric
const colorMap: Record<string, { primary: string; glow: string; bg: string }> = {
  'from-white/[0.06] to-white/[0.02]': { primary: 'rgba(245, 245, 250, 0.95)', glow: 'rgba(245, 245, 250, 0.2)', bg: '#08080c' },
}

export function WordAnimationPlayer({ word, color, youtubeId, backgroundImage, backgroundImages, onClose, externalAudio = false, externalPlaying, onTogglePlay, externalDuration, externalCurrentTime, onSeek, onSkipNext, onSkipPrevious, hasNext = false, hasPrevious = false, category }: WordAnimationPlayerProps) {
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
  // Track saved time when switching modes (single-player swap approach)
  const savedTimeRef = useRef(0)

  // Video display for externalAudio + video mode
  const videoDisplayRef = useRef<HTMLDivElement>(null)
  const videoDisplayPlayerRef = useRef<YTPlayer | null>(null)
  const videoProgressRef = useRef<NodeJS.Timeout | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)

  // Gyroscope / mouse tilt effect (motivation video mode only)
  const isTiltActive = viewMode === 'video' && category === 'Motivation'
  const { rotateX, rotateY } = useDeviceTilt({ enabled: isTiltActive })
  const tiltStyle = isTiltActive
    ? { transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`, transition: 'transform 0.1s ease-out' }
    : undefined

  // Journal FAB state (motivation-only)
  const [showJournalFAB, setShowJournalFAB] = useState(false)
  const [showNudge, setShowNudge] = useState(false)
  const [showJournal, setShowJournal] = useState(false)

  // Slideshow words (AI-generated, cached in localStorage)
  const [slideshowWords, setSlideshowWords] = useState<string[]>([])
  const journalTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Unified playing state: video mode uses its own player, external mode uses parent state, local uses own
  const isVideoMode = externalAudio && viewMode === 'video'
  const isPlaying = isVideoMode ? videoPlaying : externalAudio ? (externalPlaying ?? false) : isPlayingLocal

  // Unified duration/time
  const activeDuration = isVideoMode ? videoDuration : externalAudio ? (externalDuration ?? 0) : duration
  const activeCurrentTime = isVideoMode ? videoCurrentTime : externalAudio ? (externalCurrentTime ?? 0) : currentTime
  const activeReady = isVideoMode ? (videoDuration > 0) : externalAudio ? ((externalDuration ?? 0) > 0) : playerReady

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

  // Helper to create a YT player in a container
  const createPlayer = useCallback((container: HTMLDivElement, opts: {
    videoMode: boolean
    seekTo?: number
  }) => {
    if (!window.YT) return null

    container.innerHTML = ''
    const playerDiv = document.createElement('div')
    playerDiv.id = 'yt-player-' + Date.now()
    container.appendChild(playerDiv)

    const player = new window.YT.Player(playerDiv.id, {
      videoId: youtubeId,
      ...(opts.videoMode ? { width: '100%', height: '100%' } : {}),
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
          event.target.setVolume(isMuted ? 0 : 80)
          if (opts.seekTo && opts.seekTo > 1) {
            event.target.seekTo(opts.seekTo, true)
          }
          event.target.playVideo()
          setPlayerReady(true)
          const videoDuration = event.target.getDuration()
          if (videoDuration > 0) setDuration(videoDuration)
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
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

    return player
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId])

  // Load YouTube IFrame API and create initial player (only for local audio mode)
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
      playerRef.current = createPlayer(containerRef.current, { videoMode: false })
    }

    loadYouTubeAPI()

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [youtubeId, externalAudio, createPlayer])

  // Handle viewMode switch: destroy old player, create new one in the right container
  useEffect(() => {
    if (externalAudio || !window.YT) return
    // Skip on initial mount (handled by the init effect above)
    if (!playerRef.current) return

    // Save current playback time before destroying
    try {
      savedTimeRef.current = playerRef.current.getCurrentTime() || 0
    } catch { savedTimeRef.current = 0 }

    // Destroy the current player
    playerRef.current.destroy()
    playerRef.current = null
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    // Create new player in the correct container
    const container = containerRef.current
    if (!container) return

    playerRef.current = createPlayer(container, {
      videoMode: viewMode === 'video',
      seekTo: savedTimeRef.current,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  // ExternalAudio + video mode: create a player with audio+video (pause external)
  const wasExternalPlayingRef = useRef(false)
  useEffect(() => {
    if (!externalAudio) return
    if (viewMode !== 'video') {
      // Switching back to image — hand audio back to external player
      if (videoDisplayPlayerRef.current) {
        if (videoProgressRef.current) { clearInterval(videoProgressRef.current); videoProgressRef.current = null }
        // Get current position from visual player before destroying
        let resumeTime = 0
        try { resumeTime = videoDisplayPlayerRef.current.getCurrentTime() || 0 } catch {}
        try { videoDisplayPlayerRef.current.destroy() } catch {}
        videoDisplayPlayerRef.current = null
        // Seek external player to where the video left off, then resume
        if (resumeTime > 1 && onSeek) onSeek(resumeTime)
        if (wasExternalPlayingRef.current && onTogglePlay) onTogglePlay()
      }
      return
    }

    // Entering video mode — pause external audio, create visible player with sound
    wasExternalPlayingRef.current = !!externalPlaying
    if (externalPlaying && onTogglePlay) onTogglePlay()

    const createVisual = () => {
      if (!videoDisplayRef.current || !window.YT) return
      videoDisplayRef.current.innerHTML = ''
      const div = document.createElement('div')
      div.id = 'yt-visual-' + Date.now()
      videoDisplayRef.current.appendChild(div)

      const startAt = Math.floor(externalCurrentTime || 0)
      videoDisplayPlayerRef.current = new window.YT.Player(div.id, {
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
          start: startAt,
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(80)
            event.target.unMute()
            if (startAt > 1) event.target.seekTo(startAt, true)
            event.target.playVideo()
            const dur = event.target.getDuration()
            if (dur > 0) setVideoDuration(dur)
            // Track progress
            if (videoProgressRef.current) clearInterval(videoProgressRef.current)
            videoProgressRef.current = setInterval(() => {
              if (videoDisplayPlayerRef.current) {
                try {
                  setVideoCurrentTime(videoDisplayPlayerRef.current.getCurrentTime())
                  const d = videoDisplayPlayerRef.current.getDuration()
                  if (d > 0) setVideoDuration(d)
                } catch {}
              }
            }, 1000)
          },
          onStateChange: (event) => {
            setVideoPlaying(event.data === 1)
          },
        },
      })
    }

    if (window.YT) createVisual()
    else {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
      window.onYouTubeIframeAPIReady = createVisual
    }

    return () => {
      if (videoProgressRef.current) { clearInterval(videoProgressRef.current); videoProgressRef.current = null }
      if (videoDisplayPlayerRef.current) {
        try { videoDisplayPlayerRef.current.destroy() } catch {}
        videoDisplayPlayerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, externalAudio, youtubeId])

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

  // Fetch AI-generated slideshow words (cached in localStorage per youtubeId)
  useEffect(() => {
    if (!backgroundImages || backgroundImages.length === 0) return

    const cacheKey = `video-words-${youtubeId}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlideshowWords(parsed)
          return
        }
      } catch { /* ignore bad cache */ }
    }

    let cancelled = false
    fetch('/api/ai/video-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: word }),
    })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        const words = data.words
        if (Array.isArray(words) && words.length > 0) {
          setSlideshowWords(words)
          localStorage.setItem(cacheKey, JSON.stringify(words))
        }
      })
      .catch(() => { /* fail silently — slideshow works without words */ })

    return () => { cancelled = true }
  }, [youtubeId, word, backgroundImages])

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
    // In video mode with external audio, control the visual player directly
    if (externalAudio && viewMode === 'video' && videoDisplayPlayerRef.current) {
      try {
        const state = videoDisplayPlayerRef.current.getPlayerState()
        if (state === 1) videoDisplayPlayerRef.current.pauseVideo()
        else videoDisplayPlayerRef.current.playVideo()
      } catch {}
      return
    }
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
  }, [externalAudio, onTogglePlay, isPlayingLocal, viewMode])

  // Seek to position
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = clickX / rect.width
    if (externalAudio && viewMode === 'video' && videoDisplayPlayerRef.current) {
      // In video mode, seek the visual player directly
      try {
        const dur = videoDisplayPlayerRef.current.getDuration() || activeDuration
        if (dur > 0) {
          const seekTime = percent * dur
          videoDisplayPlayerRef.current.seekTo(seekTime, true)
        }
      } catch {}
    } else if (externalAudio) {
      if (activeDuration > 0 && onSeek) {
        const seekTime = percent * activeDuration
        onSeek(seekTime)
      }
    } else if (playerRef.current && duration > 0) {
      const seekTime = percent * duration
      playerRef.current.seekTo(seekTime, true)
      setCurrentTime(seekTime)
    }
  }, [duration, externalAudio, activeDuration, onSeek])

  // Remaining time as negative (Spotify-style)
  const remainingTime = activeDuration > 0 ? activeDuration - activeCurrentTime : 0

  return (
    <div className="fixed inset-0 z-[55] overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Single YouTube player container — toggles between hidden (audio) and visible (video) */}
      {!externalAudio && (
        <div
          ref={containerRef}
          className={viewMode === 'video'
            ? 'absolute inset-0 w-full h-full [&>div]:w-full [&>div]:h-full [&>div>iframe]:w-full [&>div>iframe]:h-full'
            : 'absolute -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden pointer-events-none'
          }
          style={tiltStyle}
        />
      )}

      {/* Visual-only muted video display for externalAudio + video mode */}
      {externalAudio && (
        <div
          ref={videoDisplayRef}
          className={viewMode === 'video'
            ? 'absolute inset-0 w-full h-full [&>div]:w-full [&>div]:h-full [&>div>iframe]:w-full [&>div>iframe]:h-full'
            : 'hidden'
          }
          style={tiltStyle}
        />
      )}

      {/* === Fullscreen artwork background === */}
      <div className="absolute inset-0">
        {viewMode === 'video' ? (
          <>
            {/* Block YouTube UI overlay */}
            <div className="absolute inset-0 z-[2] pointer-events-none" />
          </>
        ) : (
          <>
            {backgroundImages && backgroundImages.length > 0 ? (
              <BackgroundSlideshow
                images={backgroundImages}
                words={slideshowWords}
                playing={isPlaying}
                youtubeId={youtubeId}
              />
            ) : backgroundImage ? (
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
            {viewMode === 'video' ? (
              <Image className="w-3.5 h-3.5 text-white" />
            ) : (
              <Video className="w-3.5 h-3.5 text-white" />
            )}
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
