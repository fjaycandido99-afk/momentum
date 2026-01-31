'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Play, Pause, Check, SkipForward, RotateCcw } from 'lucide-react'

// Dark atmospheric background images (same as Discover page)
const BACKGROUND_IMAGES = [
  '/backgrounds/bg1.jpg',
  '/backgrounds/bg2.jpg',
  '/backgrounds/bg3.jpg',
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
  '/backgrounds/bg17.jpg',
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
}

// Get today's topic based on day of year
function getTodaysTopic() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return DAILY_TOPICS[dayOfYear % DAILY_TOPICS.length]
}

export function MicroLessonVideo({ isCompleted, onComplete, onSkip }: MicroLessonVideoProps) {
  const [topic] = useState(getTodaysTopic())
  const [video, setVideo] = useState<MotivationVideo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  // Get today's dark background image (memoized)
  const backgroundImage = useMemo(() => getTodaysBackground(), [])

  // Fetch a motivation video for today's topic (same video all day)
  useEffect(() => {
    async function fetchVideo() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/motivation-videos?topic=${topic.word}`)
        const data = await response.json()
        if (data.videos && data.videos.length > 0) {
          const shortVideos = data.videos.filter((v: MotivationVideo) =>
            v.duration && v.duration <= 300
          )
          const videoPool = shortVideos.length > 0 ? shortVideos : data.videos
          const sortedVideos = [...videoPool].sort((a: MotivationVideo, b: MotivationVideo) => a.youtubeId.localeCompare(b.youtubeId))

          const now = new Date()
          const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
          const videoIndex = Math.floor(seededRandom(dateSeed + 456) * sortedVideos.length)
          setVideo(sortedVideos[videoIndex])
        } else {
          setError('No videos available')
        }
      } catch (err) {
        console.error('Failed to fetch motivation video:', err)
        setError('Failed to load video')
      } finally {
        setLoading(false)
      }
    }
    fetchVideo()
  }, [topic.word])

  // Elapsed timer
  useEffect(() => {
    if (isPlaying && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, isPaused])

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
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlay = () => {
    setIsPlaying(true)
    setIsPaused(false)
    setElapsed(0)
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

  const totalDuration = video.duration || 0
  const progress = totalDuration > 0 ? Math.min(elapsed / totalDuration, 1) : 0

  return (
    <div className={`rounded-2xl overflow-hidden transition-all ${
      isCompleted && !isPlaying ? 'bg-white/[0.03] border border-white/10' : 'border border-white/15 shadow-[0_0_15px_rgba(255,255,255,0.06)]'
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
            <img
              src={backgroundImage}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
          </div>
          <div className="relative p-6">
            <div className="text-center mb-4 mt-2">
              <h2 className="text-3xl font-bold text-white tracking-wide uppercase mb-1">
                {topic.word}
              </h2>
              <p className="text-xs text-white/60">{topic.tagline}</p>
            </div>

            {/* Pause/Play button */}
            <div className="flex justify-center mb-4">
              <button
                onClick={handlePauseToggle}
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
                <span className="text-[10px] text-white/40">{formatTime(elapsed)}</span>
                <span className="text-[10px] text-white/40">
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
            className="w-full relative group"
          >
            {/* Dark background image */}
            <div className="absolute inset-0">
              <img
                src={backgroundImage}
                alt=""
                className={`w-full h-full object-cover ${isCompleted ? 'opacity-60' : ''}`}
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
                  isCompleted ? 'text-white/70' : 'text-white'
                }`}>
                  {topic.word}
                </h2>
                <p className={`text-sm mt-2 ${isCompleted ? 'text-white/50' : 'text-white/70'}`}>
                  {topic.tagline}
                </p>
              </div>

              <div className="flex justify-center mb-6">
                <div className={`flex items-center justify-center w-16 h-16 rounded-full transition-all ${
                  isCompleted
                    ? 'bg-white/10 text-white/60 group-hover:bg-white/20 group-hover:scale-105'
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
                <p className={`text-sm ${isCompleted ? 'text-white/40' : 'text-white/50'}`}>
                  {isCompleted ? 'Tap to rewatch' : video.duration ? formatTime(video.duration) : ''}
                </p>
              </div>
            </div>
          </button>

          {/* Skip option */}
          {!isCompleted && onSkip && (
            <button
              onClick={onSkip}
              className="w-full py-2.5 bg-white/5 text-xs text-white/50 hover:text-white/70 hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
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
