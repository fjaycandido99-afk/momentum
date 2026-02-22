'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Play, Pause, Check, SkipForward, RotateCcw } from 'lucide-react'
import { FeatureHint } from '@/components/ui/FeatureHint'

// Dark atmospheric background images (same as Discover page)
// Note: bg1-3 and bg17 don't exist
const BACKGROUND_IMAGES = [
  '/backgrounds/bg4.jpg',
  '/backgrounds/bg5.jpg',
  '/backgrounds/bg6.jpg',
  '/backgrounds/bg7.jpg',
  '/backgrounds/bg8.jpg',
  '/backgrounds/bg9.jpg',
  '/backgrounds/bg10.jpg',
  '/backgrounds/bg11.jpg',
  '/backgrounds/bg12.jpg',
  '/backgrounds/bg13.jpg',
  '/backgrounds/bg14.jpg',
  '/backgrounds/bg15.jpg',
  '/backgrounds/bg16.jpg',
  '/backgrounds/bg18.jpg',
  '/backgrounds/bg19.jpg',
  '/backgrounds/bg20.jpg',
  '/backgrounds/bg21.jpg',
  '/backgrounds/bg22.jpg',
  '/backgrounds/bg23.jpg',
  '/backgrounds/bg24.jpg',
  '/backgrounds/bg25.jpg',
  '/backgrounds/bg26.jpg',
  '/backgrounds/bg27.jpg',
  '/backgrounds/bg28.jpg',
  '/backgrounds/bg29.jpg',
  '/backgrounds/bg30.jpg',
  '/backgrounds/bg31.jpg',
]

// Daily motivation topics - synced with Discover page
const DAILY_TOPICS = [
  { word: 'Discipline', tagline: 'Master yourself first' },
  { word: 'Focus', tagline: 'Eliminate distractions' },
  { word: 'Mindset', tagline: 'Your thoughts shape reality' },
  { word: 'Courage', tagline: 'Face your fears' },
  { word: 'Resilience', tagline: 'Rise after every fall' },
  { word: 'Hustle', tagline: 'Outwork everyone' },
  { word: 'Confidence', tagline: 'Believe in yourself' },
]

// Day type definition
type DayType = 'work' | 'off' | 'recovery' | 'class' | 'study' | 'exam'

// Day type to content mode mapping
type ContentMode = 'motivation' | 'focus_music' | 'calm_music' | 'relax_music'

const DAY_TYPE_CONTENT: Record<DayType, { mode: ContentMode; genre?: string; title: string; tagline: string }> = {
  work: { mode: 'motivation', title: '', tagline: '' }, // Uses DAILY_TOPICS
  class: { mode: 'focus_music', genre: 'study', title: 'Focus Mode', tagline: 'Music for concentration' },
  study: { mode: 'focus_music', genre: 'lofi', title: 'Study Session', tagline: 'Lo-fi beats to study to' },
  exam: { mode: 'calm_music', genre: 'ambient', title: 'Calm Mind', tagline: 'Peaceful sounds for clarity' },
  off: { mode: 'relax_music', genre: 'piano', title: 'Unwind', tagline: 'Gentle melodies for rest' },
  recovery: { mode: 'relax_music', genre: 'ambient', title: 'Restore', tagline: 'Ambient sounds for healing' },
}

interface MusicVideo {
  id: string
  title: string
  youtubeId: string
  channel?: string
  duration?: number
}

// Seeded random for consistent daily selection
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Get today's background image (consistent for the day)
function getTodaysBackground() {
  const now = new Date()
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const index = Math.floor(seededRandom(dateSeed + 888) * BACKGROUND_IMAGES.length)
  return BACKGROUND_IMAGES[index]
}

interface MotivationVideo {
  id: string
  title: string
  youtubeId: string
  channel: string
  thumbnail?: string
  duration?: number
}

interface MicroLessonVideoProps {
  isCompleted: boolean
  onComplete: () => void
  onSkip?: () => void
  dayType?: DayType
  /** Called when actual video duration is known (seconds) */
  onDurationLoaded?: (seconds: number) => void
}

// Get today's topic based on day of year
function getTodaysTopic() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return DAILY_TOPICS[dayOfYear % DAILY_TOPICS.length]
}

export function MicroLessonVideo({ isCompleted, onComplete, onSkip, dayType = 'work', onDurationLoaded }: MicroLessonVideoProps) {
  const [topic] = useState(getTodaysTopic())
  const [video, setVideo] = useState<MotivationVideo | MusicVideo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<string>(getTodaysBackground())
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  // Get content config based on day type
  const contentConfig = DAY_TYPE_CONTENT[dayType]
  const isMotivationMode = contentConfig.mode === 'motivation'

  // Display title and tagline based on mode
  const displayTitle = isMotivationMode ? topic.word : contentConfig.title
  const displayTagline = isMotivationMode ? topic.tagline : contentConfig.tagline

  // Fetch genre-specific background for music mode, use static for motivation mode
  useEffect(() => {
    if (isMotivationMode) {
      // Use static local backgrounds for motivation mode
      setBackgroundImage(getTodaysBackground())
      return
    }

    // Fetch genre-specific backgrounds for music mode
    async function fetchBackground() {
      try {
        const response = await fetch(`/api/backgrounds?genre=${contentConfig.genre}`)
        const data = await response.json()

        if (data.images && data.images.length > 0) {
          // Sort by name for consistent selection
          const sortedBgs = [...data.images].sort((a: { name: string; url: string }, b: { name: string; url: string }) => a.name.localeCompare(b.name))

          // Use seeded random based on date for consistent daily selection
          const now = new Date()
          const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
          const bgIndex = Math.floor(seededRandom(dateSeed + 999) * sortedBgs.length)
          setBackgroundImage(sortedBgs[bgIndex].url)
        }
      } catch (err) {
        console.error('Failed to fetch background:', err)
        // Keep default background on error
      }
    }
    fetchBackground()
  }, [isMotivationMode, contentConfig.genre])

  // Fetch video based on day type (motivation or music)
  useEffect(() => {
    async function fetchVideo() {
      setLoading(true)
      setError(null)
      try {
        let response: Response
        let data: { videos?: (MotivationVideo | MusicVideo)[] }

        if (isMotivationMode) {
          // Fetch motivational video for work days
          response = await fetch(`/api/motivation-videos?topic=${displayTitle}`)
          data = await response.json()
        } else {
          // Fetch music video for student/off/recovery days
          response = await fetch(`/api/music-videos?genre=${contentConfig.genre}`)
          data = await response.json()
        }

        if (data.videos && data.videos.length > 0) {
          const videoPool = data.videos

          // Sort for consistent daily selection
          const sortedVideos = [...videoPool].sort((a, b) => a.youtubeId.localeCompare(b.youtubeId))

          // Use seeded random for same video all day
          const now = new Date()
          const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
          const videoIndex = Math.floor(seededRandom(dateSeed + 456) * sortedVideos.length)
          const selected = sortedVideos[videoIndex]
          setVideo(selected)

          // Report API duration immediately so timeRemaining is accurate before play
          if (selected.duration && selected.duration > 0) {
            onDurationLoaded?.(selected.duration)
          }
        } else {
          setError('No videos available')
        }
      } catch (err) {
        console.error('Failed to fetch video:', err)
        setError('Failed to load video')
      } finally {
        setLoading(false)
      }
    }
    fetchVideo()
  }, [topic.word, isMotivationMode, contentConfig.genre])

  // Track real duration from YouTube (more accurate than API metadata)
  const [ytDuration, setYtDuration] = useState(0)
  const durationReportedRef = useRef(false)
  const onDurationLoadedRef = useRef(onDurationLoaded)
  onDurationLoadedRef.current = onDurationLoaded

  // Listen for YouTube iframe postMessage events for accurate time tracking
  useEffect(() => {
    if (!isPlaying) return

    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return
      try {
        const data = JSON.parse(event.data)
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            setElapsed(Math.floor(data.info.currentTime))
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setYtDuration(Math.floor(data.info.duration))
            if (!durationReportedRef.current) {
              durationReportedRef.current = true
              onDurationLoadedRef.current?.(Math.floor(data.info.duration))
            }
          }
        }
        // Detect video ended via state change
        if (data.event === 'onStateChange' && data.info === 0) {
          // Video ended naturally
        }
      } catch {
        // Ignore non-JSON messages
      }
    }

    window.addEventListener('message', handleMessage)

    // Tell YouTube to start sending events
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*')
    }

    return () => window.removeEventListener('message', handleMessage)
  }, [isPlaying])

  // Fallback: interval-based timer only when YouTube messages aren't arriving
  const lastYtUpdateRef = useRef(0)
  useEffect(() => {
    if (!isPlaying || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    // Check periodically if YouTube is sending updates; only use fallback if not
    timerRef.current = setInterval(() => {
      const now = Date.now()
      if (now - lastYtUpdateRef.current > 3000) {
        // No YouTube update in 3s, increment manually as fallback
        setElapsed(prev => prev + 1)
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, isPaused])

  // Track when we last got a YouTube time update
  useEffect(() => {
    // elapsed is updated by YouTube messages — record the timestamp
    lastYtUpdateRef.current = Date.now()
  }, [elapsed])

  const sendCommand = useCallback((command: string) => {
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command }),
        '*'
      )
    }
  }, [])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handlePlay = () => {
    setIsPlaying(true)
    setIsPaused(false)
    setElapsed(0)

    // Override browser media session to show our title instead of YouTube's
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: displayTitle,
        artist: 'Voxu',
        album: displayTagline,
      })
    }
  }

  const handlePauseToggle = () => {
    if (isPaused) {
      sendCommand('playVideo')
      setIsPaused(false)
    } else {
      sendCommand('pauseVideo')
      setIsPaused(true)
    }
  }

  const handleDone = () => {
    sendCommand('pauseVideo')
    if (timerRef.current) clearInterval(timerRef.current)
    setIsPlaying(false)
    setIsPaused(false)
    setElapsed(0)
    onComplete()
  }

  if (loading) {
    return (
      <div className="rounded-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-white/5" />
        <div className="relative p-5 animate-pulse">
          <div className="text-center mb-6 mt-2">
            <div className="h-7 bg-white/10 rounded w-32 mx-auto mb-2" />
            <div className="h-3 bg-white/10 rounded w-40 mx-auto" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-white/10" />
          </div>
          <div className="text-center">
            <div className="h-4 bg-white/10 rounded w-48 mx-auto mb-2" />
            <div className="h-3 bg-white/10 rounded w-24 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !video) {
    return null
  }

  // Prefer real duration from YouTube, then API metadata, then 0
  const totalDuration = ytDuration > 0 ? ytDuration : (video.duration || 0)
  const progress = totalDuration > 0 ? Math.min(elapsed / totalDuration, 1) : 0

  return (
    <div className={`rounded-2xl overflow-hidden transition-all ${
      isCompleted && !isPlaying ? 'bg-white/[0.03] border border-white/15' : 'border border-white/15 shadow-[0_0_15px_rgba(255,255,255,0.06)]'
    }`}>
      {/* Audio playing with motivational background */}
      {isPlaying && (
        <div className="relative">
          {/* Hidden YouTube iframe for audio only */}
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&enablejsapi=1`}
            allow="autoplay; encrypted-media"
            className="absolute w-0 h-0 opacity-0 pointer-events-none"
            title={video.title}
          />
          {/* Visual: background image with topic overlay */}
          <div className="absolute inset-0">
            <Image
              src={backgroundImage}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
          </div>
          <div className="relative p-6">
            <div className="text-center mb-4 mt-2">
              <h2 className="text-3xl font-bold text-white tracking-wide uppercase mb-1">
                {displayTitle}
              </h2>
              <p className="text-xs text-white/75">{displayTagline}</p>
            </div>

            {/* Pause/Play button */}
            <div className="flex justify-center mb-4">
              <button
                onClick={handlePauseToggle}
                aria-label={isPaused ? 'Resume playback' : 'Pause playback'}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 hover:scale-105 transition-all"
              >
                {isPaused ? (
                  <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
                ) : (
                  <Pause className="w-6 h-6" fill="currentColor" />
                )}
              </button>
            </div>

            {/* Progress bar + duration */}
            <div className="mb-5">
              <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/50 transition-all duration-1000"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-white/60">{formatTime(elapsed)}</span>
                <span className="text-[10px] text-white/60">
                  {totalDuration > 0 ? formatTime(totalDuration) : '--:--'}
                </span>
              </div>
            </div>

            {/* Done button */}
            <div className="flex justify-center">
              <button
                onClick={handleDone}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors"
              >
                <Check className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card preview when not playing */}
      {!isPlaying && (
        <>
          <button
            onClick={handlePlay}
            aria-label={isCompleted ? `Replay ${displayTitle}` : `Play ${displayTitle}`}
            className="w-full relative group"
          >
            {/* Dark background image */}
            <div className="absolute inset-0">
              <Image
                src={backgroundImage}
                alt=""
                fill
                sizes="100vw"
                className={`object-cover ${isCompleted ? 'opacity-60' : ''}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
            </div>

            {/* Completed badge */}
            {isCompleted && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                <Check className="w-3 h-3" />
                <span className="text-xs">Done</span>
              </div>
            )}

            {/* Content */}
            <div className="relative p-8 py-12">
              <div className="text-center mb-6 mt-4">
                <h2 className={`text-4xl font-bold tracking-wide uppercase ${
                  isCompleted ? 'text-white/85' : 'text-white'
                }`}>
                  {displayTitle}
                </h2>
                <p className={`text-sm mt-2 ${isCompleted ? 'text-white/70' : 'text-white/85'}`}>
                  {displayTagline}
                </p>
              </div>

              <div className="flex justify-center mb-6">
                <div className={`flex items-center justify-center w-16 h-16 rounded-full transition-all ${
                  isCompleted
                    ? 'bg-white/10 text-white/75 group-hover:bg-white/20 group-hover:scale-105'
                    : 'bg-white/20 backdrop-blur-sm text-white group-hover:bg-white/30 group-hover:scale-105'
                }`}>
                  {isCompleted ? (
                    <RotateCcw className="w-5 h-5" />
                  ) : (
                    <Play className="w-7 h-7 ml-0.5" fill="currentColor" />
                  )}
                </div>
              </div>

              <div className="text-center">
                <p className={`text-sm ${isCompleted ? 'text-white/60' : 'text-white/70'}`}>
                  {isCompleted ? 'Tap to rewatch' : video.duration ? formatTime(video.duration) : ''}
                </p>
              </div>
              {!isCompleted && (
                <div className="text-center mt-3">
                  <FeatureHint
                    id={isMotivationMode ? "micro-lesson" : "micro-lesson-music"}
                    text={isMotivationMode
                      ? "Audio motivation from top creators — plays in the background"
                      : "Focus music to help you concentrate — plays in the background"
                    }
                    mode="once"
                  />
                </div>
              )}
            </div>
          </button>

          {/* Skip option */}
          {!isCompleted && onSkip && (
            <button
              onClick={onSkip}
              className="w-full py-2.5 bg-white/5 text-xs text-white/70 hover:text-white/85 hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
            >
              <SkipForward className="w-3 h-3" />
              Skip for today
            </button>
          )}
        </>
      )}
    </div>
  )
}
