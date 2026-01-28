'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Settings, PenLine, Play, X, ChevronDown, ChevronRight, Sun, Wind, Sparkles, Heart, Moon, Anchor, Loader2 } from 'lucide-react'
import { ENDEL_MODES } from '@/components/player/EndelPlayer'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'
import { StreakBadge } from '@/components/daily-guide/StreakDisplay'
import { ModeSelector } from './ModeSelector'
import { BottomPlayerBar } from './BottomPlayerBar'

const WordAnimationPlayer = dynamic(
  () => import('@/components/player/WordAnimationPlayer').then(mod => mod.WordAnimationPlayer),
  { ssr: false }
)

const EndelPlayerComponent = dynamic(
  () => import('@/components/player/EndelPlayer').then(mod => mod.EndelPlayer),
  { ssr: false }
)

type Mode = 'focus' | 'relax' | 'sleep' | 'energy'

// --- Helpers ---

function getTimeContext() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 9) return { suggested: 'energy' as const, greeting: 'Good morning' }
  if (hour >= 9 && hour < 17) return { suggested: 'focus' as const, greeting: 'Good afternoon' }
  if (hour >= 17 && hour < 21) return { suggested: 'relax' as const, greeting: 'Good evening' }
  return { suggested: 'sleep' as const, greeting: 'Good night' }
}

function getSuggestedMode(mood?: string | null, energy?: string | null, timeSuggested?: Mode): Mode {
  if (mood === 'low' && energy === 'low') return 'relax'
  if (mood === 'low' && energy === 'high') return 'focus'
  if (mood === 'low') return 'relax'
  if (mood === 'high' && energy === 'high') return 'energy'
  if (mood === 'high' && energy === 'low') return 'relax'
  if (mood === 'medium' && energy === 'high') return 'energy'
  if (mood === 'medium' && energy === 'low') return 'relax'
  if (energy === 'low') return 'sleep'
  if (energy === 'high') return 'energy'
  return timeSuggested || 'focus'
}

// Daily topic rotation
const TOPIC_NAMES = ['Discipline', 'Focus', 'Mindset', 'Courage', 'Resilience', 'Hustle', 'Confidence']
const TOPIC_TAGLINES: Record<string, string> = {
  Discipline: 'Master yourself first',
  Focus: 'Eliminate distractions',
  Mindset: 'Your thoughts shape reality',
  Courage: 'Fear is the enemy of progress',
  Resilience: 'Get back up every time',
  Hustle: 'Outwork everyone',
  Confidence: 'Believe in yourself',
}

function getTodaysTopicName() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
  return TOPIC_NAMES[dayOfYear % TOPIC_NAMES.length]
}

// Music genres - all shown as separate sections
const MUSIC_GENRES = [
  { id: 'lofi', word: 'Lo-Fi', tagline: 'Chill beats' },
  { id: 'classical', word: 'Classical', tagline: 'Timeless' },
  { id: 'piano', word: 'Piano', tagline: 'Peaceful keys' },
  { id: 'jazz', word: 'Jazz', tagline: 'Smooth vibes' },
  { id: 'study', word: 'Study', tagline: 'Focus music' },
  { id: 'ambient', word: 'Ambient', tagline: 'Atmospheric' },
]

// Voice guides
const VOICE_GUIDES = [
  { id: 'breathing', name: 'Breathing', tagline: 'Center your mind', icon: Wind },
  { id: 'affirmation', name: 'Affirmations', tagline: 'Build self-belief', icon: Sparkles },
  { id: 'gratitude', name: 'Gratitude', tagline: 'Appreciate the moment', icon: Heart },
  { id: 'sleep', name: 'Sleep', tagline: 'Peaceful sleep', icon: Moon },
  { id: 'anxiety', name: 'Grounding', tagline: 'Find your center', icon: Anchor },
]

// Background images for motivation video player
const BACKGROUND_IMAGES = Array.from({ length: 31 }, (_, i) => `/backgrounds/bg${i + 1}.jpg`)

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getTodaysBackgrounds() {
  const now = new Date()
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  return shuffleWithSeed(BACKGROUND_IMAGES, dateSeed + 777)
}

// --- Video type ---
interface VideoItem {
  id: string
  title: string
  youtubeId: string
  channel: string
  thumbnail?: string
}

// --- Main Component ---

export function ImmersiveHome() {
  const [timeContext] = useState(getTimeContext)
  const [activeMode, setActiveMode] = useState<Mode>(timeContext.suggested)
  const [isPlaying, setIsPlaying] = useState(false)

  // Overlays
  const [showMorningFlow, setShowMorningFlow] = useState(false)
  const [showEndelPlayer, setShowEndelPlayer] = useState(false)
  const [playingSound, setPlayingSound] = useState<{
    word: string
    color: string
    youtubeId: string
    backgroundImage?: string
  } | null>(null)

  // Guided voice playback (plays through bottom bar)
  const [guideLabel, setGuideLabel] = useState<string | null>(null)
  const [guideIsPlaying, setGuideIsPlaying] = useState(false)
  const [loadingGuide, setLoadingGuide] = useState<string | null>(null)
  const guideAudioRef = useRef<HTMLAudioElement | null>(null)

  const handlePlayGuide = async (guideId: string, guideName: string) => {
    // Stop any current guide audio
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    // Stop soundscape if playing
    if (isPlaying) setIsPlaying(false)

    setLoadingGuide(guideId)
    setGuideLabel(guideName)
    try {
      const typeMap: Record<string, string> = { anxiety: 'grounding' }
      const mappedType = typeMap[guideId] || guideId

      const response = await fetch('/api/daily-guide/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mappedType }),
      })
      const data = await response.json()

      if (data.audioBase64) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioBase64}`
        const audio = new Audio(audioUrl)
        guideAudioRef.current = audio

        audio.oncanplaythrough = () => {
          audio.play()
            .then(() => setGuideIsPlaying(true))
            .catch(err => console.error('Guide play error:', err))
        }
        audio.onended = () => {
          setGuideIsPlaying(false)
        }
        audio.onerror = () => {
          setGuideIsPlaying(false)
          setGuideLabel(null)
        }
      }
    } catch (err) {
      console.error('Guide fetch error:', err)
      setGuideLabel(null)
    } finally {
      setLoadingGuide(null)
    }
  }

  const toggleGuidePlay = () => {
    const audio = guideAudioRef.current
    if (!audio) return
    if (guideIsPlaying) {
      audio.pause()
      setGuideIsPlaying(false)
    } else {
      audio.play().then(() => setGuideIsPlaying(true))
    }
  }

  // Pull-down gesture for Morning Flow
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const PULL_THRESHOLD = 100

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current
    if (el && el.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 150))
    }
  }, [isPulling])

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD) {
      setShowMorningFlow(true)
    }
    setPullDistance(0)
    setIsPulling(false)
  }, [pullDistance])

  // Data
  const [streak, setStreak] = useState(0)
  const [motivationVideos, setMotivationVideos] = useState<VideoItem[]>([])
  const [genreVideos, setGenreVideos] = useState<Record<string, VideoItem[]>>({})
  const [genreBackgrounds, setGenreBackgrounds] = useState<Record<string, string[]>>({})
  const [loadingMotivation, setLoadingMotivation] = useState(true)
  const [loadingGenres, setLoadingGenres] = useState<Record<string, boolean>>(
    () => Object.fromEntries(MUSIC_GENRES.map(g => [g.id, true]))
  )

  const topicName = getTodaysTopicName()
  const config = ENDEL_MODES[activeMode]
  const [backgrounds] = useState(getTodaysBackgrounds)

  // Fetch all data on mount
  useEffect(() => {
    // Streak + mood
    fetch('/api/daily-guide/preferences')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.current_streak) setStreak(data.current_streak)
      })
      .catch(() => {})

    // Mood-based mode suggestion
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/daily-guide/journal?date=${today}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.mood_before || data?.energy_level) {
          const suggested = getSuggestedMode(data.mood_before, data.energy_level, timeContext.suggested)
          setActiveMode(suggested)
        }
      })
      .catch(() => {})

    // Motivation videos
    fetch(`/api/motivation-videos?topic=${topicName}`)
      .then(r => r.ok ? r.json() : { videos: [] })
      .then(data => setMotivationVideos(data.videos || []))
      .catch(() => {})
      .finally(() => setLoadingMotivation(false))

    // Fetch music videos + backgrounds for all genres in parallel
    MUSIC_GENRES.forEach(g => {
      // Videos
      fetch(`/api/music-videos?genre=${g.id}`)
        .then(r => r.ok ? r.json() : { videos: [] })
        .then(data => {
          setGenreVideos(prev => ({ ...prev, [g.id]: data.videos || [] }))
        })
        .catch(() => {})
        .finally(() => {
          setLoadingGenres(prev => ({ ...prev, [g.id]: false }))
        })

      // Genre-specific backgrounds from Supabase Storage
      // Shuffle per-genre with a genre-specific seed so genres sharing the same
      // image pool (e.g. classical & piano) display them in different order
      fetch(`/api/backgrounds?genre=${g.id}`)
        .then(r => r.ok ? r.json() : { images: [] })
        .then(data => {
          const urls: string[] = (data.images || []).map((img: { url: string }) => img.url)
          const genreSeed = g.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
          const shuffled = shuffleWithSeed(urls, genreSeed + 42)
          setGenreBackgrounds(prev => ({ ...prev, [g.id]: shuffled }))
        })
        .catch(() => {})
    })
  }, [topicName, timeContext.suggested])

  const handlePlayMotivation = (video: VideoItem, index: number) => {
    const backgrounds = getTodaysBackgrounds()
    setPlayingSound({
      word: topicName,
      color: 'from-white/[0.06] to-white/[0.02]',
      youtubeId: video.youtubeId,
      backgroundImage: backgrounds[index % backgrounds.length],
    })
  }

  const handlePlayMusic = (video: VideoItem, index: number, genreId: string, genreWord: string) => {
    const gBgs = genreBackgrounds[genreId] || []
    const bg = gBgs.length > 0
      ? gBgs[index % gBgs.length]
      : backgrounds[(index + 15) % backgrounds.length]
    setPlayingSound({
      word: genreWord,
      color: 'from-white/[0.06] to-white/[0.02]',
      youtubeId: video.youtubeId,
      backgroundImage: bg,
    })
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-screen bg-[#0a0a0f] text-white pb-28"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* --- Fullscreen overlays --- */}

      {/* Video/Music Player */}
      {playingSound && (
        <WordAnimationPlayer
          word={playingSound.word}
          script=""
          color={playingSound.color}
          youtubeId={playingSound.youtubeId}
          backgroundImage={playingSound.backgroundImage}
          showRain={false}
          onClose={() => setPlayingSound(null)}
        />
      )}

      {/* Endel Player (fullscreen orb) */}
      {showEndelPlayer && (
        <EndelPlayerComponent
          mode={activeMode}
          onClose={() => setShowEndelPlayer(false)}
        />
      )}

      {/* Morning Flow Overlay (drop-down) */}
      {showMorningFlow && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0f] overflow-y-auto animate-fade-in-down">
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-12 pb-4 bg-[#0a0a0f]/95 backdrop-blur-md">
            <h1 className="text-xl font-light text-white">Your Daily Guide</h1>
            <button
              onClick={() => setShowMorningFlow(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/15 transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
          <DailyGuideHome embedded />
        </div>
      )}

      {/* --- Hidden YouTube player for soundscape audio --- */}
      {isPlaying && config.sounds[0] && (
        <div className="absolute -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${config.sounds[0].youtubeId}?autoplay=1&loop=1&playlist=${config.sounds[0].youtubeId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="w-[1px] h-[1px]"
          />
        </div>
      )}

      {/* --- Pull-down indicator --- */}
      <div
        className="flex flex-col items-center justify-end overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px', opacity: pullDistance > 0 ? 1 : 0 }}
      >
        <div className="flex flex-col items-center gap-1 pb-2">
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-200 ${
              pullDistance >= PULL_THRESHOLD ? 'text-white rotate-180' : 'text-white/40'
            }`}
          />
          <span className="text-xs text-white/50">
            {pullDistance >= PULL_THRESHOLD ? 'Release for Daily Guide' : 'Pull down for Daily Guide'}
          </span>
        </div>
      </div>

      {/* --- Header --- */}
      <div className="flex items-center justify-between px-6 pt-12 pb-2 animate-fade-in-down">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">Explore</h1>
          <StreakBadge streak={streak} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/journal"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <PenLine className="w-5 h-5 text-white/60" />
          </Link>
          <Link
            href="/settings"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Settings className="w-5 h-5 text-white/60" />
          </Link>
        </div>
      </div>

      {/* --- Morning Flow Card --- */}
      <div className="px-6 mt-4 mb-8 animate-fade-in">
        <button
          onClick={() => setShowMorningFlow(true)}
          className="w-full text-left group"
        >
          <div className="relative p-6 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 overflow-hidden transition-all hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.06)] press-scale">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/[0.03] blur-2xl -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-white/10">
                  <Sun className="w-5 h-5 text-white/80" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Your Daily Guide</h2>
                  <p className="text-xs text-white/50">Morning flow, checkpoints & more</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-white/40">Tap to open your full guide</p>
                <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* --- Soundscapes --- */}
      <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <h2 className="text-lg font-semibold text-white px-6 mb-4">Soundscapes</h2>
        <div className="px-6">
          <ModeSelector activeMode={activeMode} onSelectMode={setActiveMode} />
        </div>
      </div>

      {/* --- Guided (circular icons like Soundscapes) --- */}
      <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.08s' }}>
        <h2 className="text-lg font-semibold text-white px-6 mb-4">Guided</h2>
        <div className="flex justify-evenly px-2 pb-2">
          {VOICE_GUIDES.map((guide) => {
            const Icon = guide.icon
            const isLoading = loadingGuide === guide.id
            return (
              <button
                key={guide.id}
                onClick={() => handlePlayGuide(guide.id, guide.name)}
                disabled={isLoading}
                className="flex flex-col items-center gap-2 press-scale"
              >
                <div className={`w-14 h-14 rounded-full border-2 border-white/15 bg-white/[0.03] flex items-center justify-center transition-all duration-200 ${isLoading ? 'border-white/40 bg-white/10' : ''}`}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
                  ) : (
                    <Icon
                      className="w-5 h-5 text-white/40 transition-colors duration-200"
                      strokeWidth={1.5}
                    />
                  )}
                </div>
                <span className="text-[11px] text-white/40">{guide.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* --- Motivation --- */}
      <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between px-6 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Motivation</h2>
            <p className="text-xs text-white/40 mt-0.5">{topicName} &middot; {TOPIC_TAGLINES[topicName]}</p>
          </div>
          <Link href="/discover" className="text-xs text-white/50 hover:text-white/70 transition-colors">
            Show all
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
          {loadingMotivation ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-40">
                <div className="w-40 h-40 rounded-2xl bg-white/5 border border-white/5 skeleton-shimmer" />
                <div className="h-3 bg-white/5 rounded mt-2 w-3/4" />
                <div className="h-2 bg-white/5 rounded mt-1.5 w-1/2" />
              </div>
            ))
          ) : (
            motivationVideos.slice(0, 8).map((video, index) => (
              <button
                key={video.id}
                onClick={() => handlePlayMotivation(video, index)}
                className="shrink-0 w-40 text-left group press-scale"
              >
                <div className="w-40 h-40 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden relative flex items-center justify-center group-hover:border-white/20 transition-all">
                  <img
                    src={backgrounds[index % backgrounds.length]}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
                  <Play className="w-8 h-8 text-white/60 relative z-10 group-hover:text-white/80 transition-colors" fill="rgba(255,255,255,0.3)" />
                </div>
                <p className="text-sm text-white/80 mt-2 line-clamp-2 leading-tight">{video.title}</p>
                <p className="text-xs text-white/40 mt-0.5">{video.channel}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* --- Music Genres --- */}
      {MUSIC_GENRES.map((g, gi) => {
        const videos = genreVideos[g.id] || []
        const gBgs = genreBackgrounds[g.id] || []
        const isLoading = loadingGenres[g.id]

        return (
          <div key={g.id} className="mb-8 animate-fade-in" style={{ animationDelay: `${0.2 + gi * 0.05}s` }}>
            <div className="flex items-center justify-between px-6 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{g.word}</h2>
                <p className="text-xs text-white/40 mt-0.5">{g.tagline}</p>
              </div>
              <Link href="/discover" className="text-xs text-white/50 hover:text-white/70 transition-colors">
                Show all
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="shrink-0 w-40">
                    <div className="w-40 h-40 rounded-2xl bg-white/5 border border-white/5 skeleton-shimmer" />
                    <div className="h-3 bg-white/5 rounded mt-2 w-3/4" />
                    <div className="h-2 bg-white/5 rounded mt-1.5 w-1/2" />
                  </div>
                ))
              ) : videos.length === 0 ? (
                <div className="text-sm text-white/40 py-8 px-2">No tracks available</div>
              ) : (
                videos.slice(0, 8).map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => handlePlayMusic(video, index, g.id, g.word)}
                    className="shrink-0 w-40 text-left group press-scale"
                  >
                    <div className="w-40 h-40 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden relative flex items-center justify-center group-hover:border-white/20 transition-all">
                      {(gBgs.length > 0 || backgrounds.length > 0) && (
                        <img
                          src={gBgs.length > 0
                            ? gBgs[index % gBgs.length]
                            : backgrounds[(index + 15 + gi * 5) % backgrounds.length]}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
                      <Play className="w-8 h-8 text-white/60 relative z-10 group-hover:text-white/80 transition-colors" fill="rgba(255,255,255,0.3)" />
                    </div>
                    <p className="text-sm text-white/80 mt-2 line-clamp-2 leading-tight">{video.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{video.channel}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )
      })}

      {/* --- Bottom Player Bar --- */}
      <BottomPlayerBar
        mode={activeMode}
        isPlaying={guideLabel ? guideIsPlaying : isPlaying}
        onTogglePlay={() => {
          if (guideLabel) {
            toggleGuidePlay()
          } else {
            setIsPlaying(!isPlaying)
          }
        }}
        onOpenPlayer={() => {
          if (!guideLabel) setShowEndelPlayer(true)
        }}
        label={guideLabel || undefined}
      />
    </div>
  )
}

