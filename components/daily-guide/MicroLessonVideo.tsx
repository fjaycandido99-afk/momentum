'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Play, Pause, Lightbulb, Check, SkipForward, X, RotateCcw } from 'lucide-react'

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

// Seeded random for consistent daily background
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
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Get today's dark background image (memoized)
  const backgroundImage = useMemo(() => getTodaysBackground(), [])

  // Timer for tracking playback
  useEffect(() => {
    if (isPlaying && !isPaused) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isPlaying, isPaused])

  // Fetch a motivation video for today's topic (same video all day)
  useEffect(() => {
    async function fetchVideo() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/motivation-videos?topic=${topic.word}`)
        const data = await response.json()
        if (data.videos && data.videos.length > 0) {
          // Pick a short video (prefer shorter ones for micro lesson)
          const shortVideos = data.videos.filter((v: MotivationVideo) =>
            v.duration && v.duration <= 300 // 5 minutes or less
          )
          const videoPool = shortVideos.length > 0 ? shortVideos : data.videos

          // Sort videos by ID to ensure consistent order (API might return different orders)
          const sortedVideos = [...videoPool].sort((a, b) => a.youtubeId.localeCompare(b.youtubeId))

          // Use seeded random to get same video for the entire day
          const now = new Date()
          const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
          const videoIndex = Math.floor(seededRandom(dateSeed + 456) * sortedVideos.length)
          const todaysVideo = sortedVideos[videoIndex]

          setVideo(todaysVideo)
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlay = () => {
    setCurrentTime(0)
    setIsPaused(false)
    setIsPlaying(true)
  }

  const handlePauseToggle = () => {
    setIsPaused(!isPaused)
  }

  const handleClose = () => {
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
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
    return (
      <div className="rounded-2xl overflow-hidden relative">
        <div className="absolute inset-0">
          <img
            src={backgroundImage}
            alt=""
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
        </div>
        <div className="relative p-5 text-center">
          <div className="mb-4 mt-2">
            <h2 className="text-xl font-bold text-white/60 tracking-wide uppercase">
              {topic.word}
            </h2>
            <p className="text-white/40 text-xs mt-1">{topic.tagline}</p>
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white/40" />
            </div>
          </div>
          <p className="text-white/40 text-sm">No video available today</p>
        </div>
      </div>
    )
  }

  // Audio-style player overlay (like Discover page)
  if (isPlaying) {
    const totalDuration = video.duration || 300 // Default 5 min if unknown
    const progress = Math.min((currentTime / totalDuration) * 100, 100)

    return (
      <div className="fixed inset-0 z-50 flex flex-col">
        {/* Dark background image */}
        <div className="absolute inset-0">
          <img
            src={backgroundImage}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Hidden YouTube iframe for audio */}
        {!isPaused && (
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&controls=0`}
            allow="autoplay; encrypted-media"
            className="absolute w-1 h-1 opacity-0 pointer-events-none"
            title={video.title}
          />
        )}

        {/* Header with close button */}
        <div className="relative p-4 flex items-center justify-end">
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main content - Topic word centered */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wider uppercase mb-4">
            {topic.word}
          </h1>
          <p className="text-white/60 text-sm">{topic.tagline}</p>
        </div>

        {/* Bottom controls */}
        <div className="relative p-6 pb-12">
          {/* Play/Pause button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={handlePauseToggle}
              className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105"
            >
              {isPaused ? (
                <Play className="w-7 h-7 text-white ml-1" fill="white" />
              ) : (
                <Pause className="w-7 h-7 text-white" />
              )}
            </button>
          </div>

          {/* Progress bar */}
          <div className="max-w-xs mx-auto mb-4">
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/60 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Timer */}
            <div className="flex justify-between mt-2 text-xs text-white/50">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(totalDuration)}</span>
            </div>
          </div>

          {/* Now playing info */}
          <div className="text-center">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Now playing</p>
            <p className="text-white text-sm truncate max-w-xs mx-auto">{video.title}</p>
            <p className="text-white/50 text-xs mt-0.5">{video.channel}</p>
          </div>

          {/* Done button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Card view with Discover-style dark background
  return (
    <div className={`rounded-2xl overflow-hidden transition-all ${
      isCompleted ? 'bg-white/[0.03] border border-white/10' : 'border border-white/15 shadow-[0_0_15px_rgba(255,255,255,0.06)] card-hover'
    }`}>
      {/* Background with dark atmospheric image */}
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
          {/* Dark gradient overlays for text readability */}
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
        <div className="relative p-5">
          {/* Topic word - large centered */}
          <div className="text-center mb-6 mt-2">
            <h2 className={`text-2xl font-bold tracking-wide uppercase ${
              isCompleted ? 'text-white/70' : 'text-white'
            }`}>
              {topic.word}
            </h2>
            <p className={`text-xs mt-1 ${isCompleted ? 'text-white/40' : 'text-white/60'}`}>
              {topic.tagline}
            </p>
          </div>

          {/* Play/Rewatch button centered */}
          <div className="flex justify-center mb-4">
            <div className={`flex items-center justify-center w-14 h-14 rounded-full transition-all ${
              isCompleted
                ? 'bg-white/10 text-white/70 group-hover:bg-white/20 group-hover:scale-105'
                : 'bg-white/20 backdrop-blur-sm text-white group-hover:bg-white/30 group-hover:scale-105'
            }`}>
              {isCompleted ? (
                <RotateCcw className="w-5 h-5" />
              ) : (
                <Play className="w-6 h-6 ml-1" fill="currentColor" />
              )}
            </div>
          </div>

          {/* Video info */}
          <div className="text-center">
            <h3 className={`font-medium text-sm leading-snug line-clamp-2 mb-1 ${
              isCompleted ? 'text-white/70' : 'text-white'
            }`}>
              {video.title}
            </h3>
            <p className={`text-xs ${isCompleted ? 'text-white/40' : 'text-white/50'}`}>
              {video.channel}
            </p>
            {video.duration && (
              <p className={`text-xs mt-1 ${isCompleted ? 'text-white/30' : 'text-white/40'}`}>
                {formatDuration(video.duration)}
              </p>
            )}
            {isCompleted && (
              <p className="text-xs text-white/50 mt-2">
                Tap to rewatch
              </p>
            )}
          </div>
        </div>
      </button>

      {/* Skip option - only show if not completed */}
      {!isCompleted && onSkip && (
        <button
          onClick={onSkip}
          className="w-full py-2.5 bg-white/5 text-xs text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
        >
          <SkipForward className="w-3 h-3" />
          Skip for today
        </button>
      )}
    </div>
  )
}
