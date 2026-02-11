'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Settings, PenLine, Home, Save, ChevronDown, ChevronRight, Sun, Sparkles, Bot, Menu, X, BarChart3 } from 'lucide-react'
import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'
import type { YTPlayer } from '@/lib/youtube-types'
import '@/lib/youtube-types'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'
import { StreakBadge } from '@/components/daily-guide/StreakDisplay'
import { BottomPlayerBar } from './BottomPlayerBar'
import { DailySpark } from './DailySpark'
import { SoundscapesSection } from './SoundscapesSection'
import { GuidedSection } from './GuidedSection'
import { XPBadge } from './XPBadge'
import { MotivationSection } from './MotivationSection'
import { MusicGenreSection } from './MusicGenreSection'
import { SmartSessionCard } from './SmartSessionCard'
import { AIMeditationPlayer } from './AIMeditationPlayer'
import { ContinueListeningCard } from './ContinueListeningCard'
import { SavedMotivationSection } from './SavedMotivationSection'
import {
  Mode, VideoItem, MUSIC_GENRES,
  getTimeContext, getSuggestedMode, getTodaysTopicName, getTodaysBackgrounds, shuffleWithSeed,
  getMoodTopicName,
} from './home-types'
import { useAudioOptional } from '@/contexts/AudioContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { FREEMIUM_LIMITS } from '@/lib/subscription-constants'
import { PreviewPaywall, PreviewTimer, usePreview, AICoachNudge, useCoachNudge } from '@/components/premium/SoftLock'
import { useScrollReveal, useParallax, useMagneticHover, useRippleBurst } from '@/hooks/useHomeAnimations'
import { useSectionTransitions } from '@/hooks/useSectionTransitions'
import { useAudioStateMachine, type AudioState } from '@/hooks/useAudioStateMachine'
import { useAudioSideEffects } from '@/hooks/useAudioSideEffects'
import { useVisibilityResume } from '@/hooks/useVisibilityResume'
import { useMediaSession } from '@/hooks/useMediaSession'
import { useRecentlyPlayed } from '@/hooks/useRecentlyPlayed'
import { RecentlyPlayedSection } from './RecentlyPlayedSection'
import { LongPressPreview } from './LongPressPreview'

const WordAnimationPlayer = dynamic(
  () => import('@/components/player/WordAnimationPlayer').then(mod => mod.WordAnimationPlayer),
  { ssr: false }
)

const SoundscapePlayerComponent = dynamic(
  () => import('@/components/player/SoundscapePlayer').then(mod => mod.SoundscapePlayer),
  { ssr: false }
)

export function ImmersiveHome() {
  const [timeContext] = useState(getTimeContext)
  const [activeMode, setActiveMode] = useState<Mode>(timeContext.suggested)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioContext = useAudioOptional()
  const hasRestoredRef = useRef(false)
  const isRestorePendingRef = useRef(!!audioContext?.lastPlayed)

  // Audio state machine
  const [audioState, dispatch] = useAudioStateMachine()

  // Recently played
  const { recentlyPlayed, addRecentlyPlayed } = useRecentlyPlayed()

  // Shuffle toast
  const [shuffleToast, setShuffleToast] = useState<string | null>(null)
  const shuffleToastTimer = useRef<NodeJS.Timeout | null>(null)
  const showShuffleToast = useCallback((message: string) => {
    setShuffleToast(message)
    if (shuffleToastTimer.current) clearTimeout(shuffleToastTimer.current)
    shuffleToastTimer.current = setTimeout(() => setShuffleToast(null), 2000)
  }, [])

  // Long-press preview
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const handleLongPressStart = useCallback((video: VideoItem) => {
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(30)
      setPreviewVideo(video)
    }, 500)
  }, [])
  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // Subscription context for freemium gating
  const { isPremium, isContentFree, dailyFreeUnlockUsed, useDailyFreeUnlock, openUpgradeModal } = useSubscription()

  // Preview paywall state
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallContentName, setPaywallContentName] = useState('')
  const [previewUnlockCallback, setPreviewUnlockCallback] = useState<(() => void) | null>(null)

  // Preview timer hook
  const handlePreviewEnd = useCallback(() => {
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.pauseVideo() } catch {}
    }
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      try { soundscapePlayerRef.current.pauseVideo() } catch {}
    }
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
    }
    setShowPaywall(true)
  }, [])

  const { isPreviewActive, secondsLeft, startPreview, stopPreview } = usePreview({
    onPreviewEnd: handlePreviewEnd,
    previewDuration: FREEMIUM_LIMITS.previewSeconds,
  })

  // AI Coach nudge
  const { showNudge, dismissNudge } = useCoachNudge(
    isPremium ? Infinity : FREEMIUM_LIMITS.coachNudgeDelayMs
  )


  // Hamburger menu
  const [showMenu, setShowMenu] = useState(false)

  // Overlays
  const [showMorningFlow, setShowMorningFlow] = useState(false)
  const [aiMeditationTheme, setAiMeditationTheme] = useState<string | null>(null)

  // Player refs (kept imperative — not in reducer)
  const soundscapePlayerRef = useRef<YTPlayer | null>(null)
  const soundscapeContainerRef = useRef<HTMLDivElement>(null)
  const soundscapeReadyRef = useRef(false)
  const bgPlayerRef = useRef<YTPlayer | null>(null)
  const bgPlayerContainerRef = useRef<HTMLDivElement>(null)
  const bgProgressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const bgPlayerReadyRef = useRef(false)
  const keepaliveRef = useRef<HTMLAudioElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null)
  const currentBgVideoIdRef = useRef<string | null>(null)
  const currentScVideoIdRef = useRef<string | null>(null)
  const autoSkipNextRef = useRef<(() => void) | null>(null)
  const guideAudioRef = useRef<HTMLAudioElement | null>(null)
  const guideRequestId = useRef(0)

  // Debounce ref
  const toggleDebounceRef = useRef(false)
  const TOGGLE_DEBOUNCE_MS = 300

  const debouncedToggle = useCallback((action: () => void) => {
    if (toggleDebounceRef.current) return
    toggleDebounceRef.current = true
    action()
    setTimeout(() => { toggleDebounceRef.current = false }, TOGGLE_DEBOUNCE_MS)
  }, [])

  // --- Side-effect hooks ---
  useAudioSideEffects({
    state: audioState,
    refs: { bgPlayerRef, bgPlayerReadyRef, soundscapePlayerRef, soundscapeReadyRef: soundscapeReadyRef, bgProgressIntervalRef, keepaliveRef, wakeLockRef, currentBgVideoIdRef: currentBgVideoIdRef, currentScVideoIdRef: currentScVideoIdRef },
    audioContext,
    dispatch,
  })

  useVisibilityResume({
    state: audioState,
    bgPlayerRef, bgPlayerReadyRef,
    soundscapePlayerRef, soundscapeReadyRef: soundscapeReadyRef,
    currentBgVideoIdRef: currentBgVideoIdRef, currentScVideoIdRef: currentScVideoIdRef,
    guideAudioRef, wakeLockRef,
  })

  // Stop all audio — used by media session and other handlers
  const stopAllHomeAudio = useCallback(() => {
    // Imperative cleanup
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    if (isPlaying) setIsPlaying(false)
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.stopVideo() } catch {}
    }
    if (bgProgressIntervalRef.current) {
      clearInterval(bgProgressIntervalRef.current)
      bgProgressIntervalRef.current = null
    }
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      try { soundscapePlayerRef.current.stopVideo() } catch {}
    }
    currentBgVideoIdRef.current = null
    currentScVideoIdRef.current = null
    if (keepaliveRef.current) {
      keepaliveRef.current.pause()
      keepaliveRef.current.src = ''
      keepaliveRef.current = null
    }
    if (wakeLockRef.current) {
      try { wakeLockRef.current.release() } catch {}
      wakeLockRef.current = null
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none'
      navigator.mediaSession.metadata = null
    }
    dispatch({ type: 'STOP_ALL' })
  }, [isPlaying, dispatch])

  useMediaSession({
    state: audioState,
    dispatch,
    guideAudioRef,
    onStopAll: stopAllHomeAudio,
  })

  // Load YouTube IFrame API
  const [ytReady, setYtReady] = useState(false)
  useEffect(() => {
    if (window.YT && window.YT.Player) { setYtReady(true); return }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const first = document.getElementsByTagName('script')[0]
    first.parentNode?.insertBefore(tag, first)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); setYtReady(true) }
  }, [])

  // Pre-create YT players
  useEffect(() => {
    if (!ytReady) return

    const observe = (container: HTMLDivElement | null) => {
      if (!container) return null
      const obs = new MutationObserver(mutations => {
        for (const m of mutations)
          for (const n of m.addedNodes)
            if (n instanceof HTMLIFrameElement) n.allow = 'autoplay; encrypted-media'
      })
      obs.observe(container, { childList: true, subtree: true })
      return obs
    }
    const obs1 = observe(bgPlayerContainerRef.current)
    const obs2 = observe(soundscapeContainerRef.current)

    // Background music player
    if (!bgPlayerRef.current && bgPlayerContainerRef.current) {
      bgPlayerContainerRef.current.innerHTML = ''
      const div = document.createElement('div')
      div.id = 'bg-yt-pre'
      bgPlayerContainerRef.current.appendChild(div)
      bgPlayerRef.current = new window.YT.Player('bg-yt-pre', {
        height: '1', width: '1',
        playerVars: { controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0, showinfo: 0, playsinline: 1 },
        events: {
          onReady: () => { bgPlayerReadyRef.current = true },
          onStateChange: (event) => {
            if (event.data === 1) {
              dispatch({ type: 'MUSIC_YT_PLAYING' })
              if (bgProgressIntervalRef.current) clearInterval(bgProgressIntervalRef.current)
              bgProgressIntervalRef.current = setInterval(() => {
                if (bgPlayerRef.current) {
                  try {
                    const ct = bgPlayerRef.current.getCurrentTime()
                    const d = bgPlayerRef.current.getDuration()
                    dispatch({ type: 'MUSIC_TIME_UPDATE', currentTime: ct, duration: d })
                  } catch {}
                }
              }, 1000)
            } else if (event.data === 2) {
              dispatch({ type: 'MUSIC_YT_PAUSED' })
            } else if (event.data === 0) {
              if (autoSkipNextRef.current) {
                autoSkipNextRef.current()
              } else {
                try { event.target.seekTo(0, true); event.target.playVideo() } catch {}
              }
            }
          },
        },
      })
    }

    // Soundscape player
    if (!soundscapePlayerRef.current && soundscapeContainerRef.current) {
      soundscapeContainerRef.current.innerHTML = ''
      const div = document.createElement('div')
      div.id = 'sc-yt-pre'
      soundscapeContainerRef.current.appendChild(div)
      soundscapePlayerRef.current = new window.YT.Player('sc-yt-pre', {
        height: '1', width: '1',
        playerVars: { controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0, showinfo: 0, playsinline: 1 },
        events: {
          onReady: () => { soundscapeReadyRef.current = true },
          onStateChange: (event) => {
            if (event.data === 1) dispatch({ type: 'SOUNDSCAPE_YT_PLAYING' })
            else if (event.data === 2) dispatch({ type: 'SOUNDSCAPE_YT_PAUSED' })
            else if (event.data === 0) {
              try { event.target.seekTo(0, true); event.target.playVideo() } catch {}
            }
          },
        },
      })
    }

    return () => { obs1?.disconnect(); obs2?.disconnect() }
  }, [ytReady, dispatch])

  // Imperative player helpers
  const createSoundscapePlayer = useCallback((youtubeId: string) => {
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      currentScVideoIdRef.current = youtubeId
      soundscapePlayerRef.current.loadVideoById(youtubeId)
      soundscapePlayerRef.current.setVolume(100)
    }
  }, [])

  const createBgMusicPlayer = useCallback((youtubeId: string) => {
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      currentBgVideoIdRef.current = youtubeId
      bgPlayerRef.current.loadVideoById(youtubeId)
      bgPlayerRef.current.setVolume(80)
    }
  }, [])

  const stopBackgroundMusic = useCallback(() => {
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.stopVideo() } catch {}
    }
    if (bgProgressIntervalRef.current) {
      clearInterval(bgProgressIntervalRef.current)
      bgProgressIntervalRef.current = null
    }
    currentBgVideoIdRef.current = null
    dispatch({ type: 'STOP_MUSIC' })
  }, [dispatch])

  // When daily guide starts, stop home audio
  useEffect(() => {
    if (audioContext?.isSessionActive && !audioState.homeAudioActive) {
      stopAllHomeAudio()
    }
  }, [audioContext?.isSessionActive, audioState.homeAudioActive, stopAllHomeAudio])

  // --- Guide playback ---
  const handlePlayGuide = async (guideId: string, guideName: string) => {
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    const thisRequest = ++guideRequestId.current

    if (isPlaying) setIsPlaying(false)
    // Stop soundscape imperative
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      try { soundscapePlayerRef.current.stopVideo() } catch {}
    }
    currentScVideoIdRef.current = null

    dispatch({ type: 'PLAY_GUIDE', guideId, guideName })

    try {
      const typeMap: Record<string, string> = { anxiety: 'grounding' }
      const mappedType = typeMap[guideId] || guideId

      const response = await fetch('/api/daily-guide/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mappedType }),
      })
      const data = await response.json()

      if (guideRequestId.current !== thisRequest) return

      if (data.audioBase64) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioBase64}`
        const audio = new Audio(audioUrl)
        guideAudioRef.current = audio

        audio.oncanplaythrough = () => {
          if (guideRequestId.current !== thisRequest) {
            audio.pause(); audio.src = ''; return
          }
          audio.play()
            .then(() => dispatch({ type: 'GUIDE_PLAY_STARTED' }))
            .catch(err => console.error('Guide play error:', err))
        }
        audio.onended = () => dispatch({ type: 'GUIDE_ENDED' })
        audio.onerror = () => dispatch({ type: 'GUIDE_ERROR' })
      }
    } catch (err) {
      console.error('Guide fetch error:', err)
      if (guideRequestId.current === thisRequest) {
        dispatch({ type: 'GUIDE_ERROR' })
      }
    } finally {
      if (guideRequestId.current === thisRequest) {
        dispatch({ type: 'GUIDE_LOADED' })
      }
    }
  }

  const toggleGuidePlay = () => {
    const audio = guideAudioRef.current
    if (!audio) return
    if (audioState.guideIsPlaying) {
      audio.pause()
      dispatch({ type: 'PAUSE_GUIDE' })
    } else {
      audio.play().then(() => dispatch({ type: 'RESUME_GUIDE' }))
    }
  }

  // --- Pull-down gesture ---
  const scrollRef = useRef<HTMLDivElement>(null)
  useScrollReveal(scrollRef)
  useSectionTransitions(scrollRef)
  useParallax(scrollRef)
  const { handlePointerMove: magneticMove, handlePointerLeave: magneticLeave } = useMagneticHover()
  const spawnRipple = useRippleBurst()

  const touchStartY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const PULL_THRESHOLD = 100

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (showMorningFlow) return
    const el = scrollRef.current
    if (el && el.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }, [showMorningFlow])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || showMorningFlow) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setPullDistance(Math.min(delta * 0.5, 150))
  }, [isPulling, showMorningFlow])

  const handleTouchEnd = useCallback(() => {
    if (showMorningFlow) return
    if (pullDistance >= PULL_THRESHOLD) {
      stopBackgroundMusic()
      setShowMorningFlow(true)
    }
    setPullDistance(0)
    setIsPulling(false)
  }, [pullDistance, showMorningFlow, stopBackgroundMusic])

  // --- Data fetching ---
  const [streak, setStreak] = useState(0)
  const [astrologyEnabled, setAstrologyEnabled] = useState(false)
  const [motivationByTopic, setMotivationByTopic] = useState<Record<string, VideoItem[]>>({})
  const [journalMood, setJournalMood] = useState<string | null>(null)
  const [savedMotivationVideos, setSavedMotivationVideos] = useState<VideoItem[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favoriteRecordMap, setFavoriteRecordMap] = useState<Map<string, string>>(new Map())
  const [shufflingTopic, setShufflingTopic] = useState<string | null>(null)
  const [savedMusicVideos, setSavedMusicVideos] = useState<VideoItem[]>([])
  const [musicFavoriteIds, setMusicFavoriteIds] = useState<Set<string>>(new Set())
  const [musicFavoriteRecordMap, setMusicFavoriteRecordMap] = useState<Map<string, string>>(new Map())
  const [shufflingGenre, setShufflingGenre] = useState<string | null>(null)
  const [genreVideos, setGenreVideos] = useState<Record<string, VideoItem[]>>({})
  const [genreBackgrounds, setGenreBackgrounds] = useState<Record<string, string[]>>({})
  const [loadingMotivation, setLoadingMotivation] = useState(true)
  const [loadingGenres, setLoadingGenres] = useState<Record<string, boolean>>(
    () => Object.fromEntries(MUSIC_GENRES.map(g => [g.id, true]))
  )

  const topicName = getTodaysTopicName()
  const [backgrounds] = useState(getTodaysBackgrounds)

  const moodTopic = getMoodTopicName(journalMood)
  const featuredTopic = moodTopic || topicName

  // Backward compat: derive motivationVideos from motivationByTopic for restore logic
  const motivationVideos = motivationByTopic[topicName] || []

  // Fetch preferences on mount and when page regains focus (e.g. back from settings)
  useEffect(() => {
    const fetchPrefs = () => {
      fetch('/api/daily-guide/preferences')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.current_streak) setStreak(data.current_streak)
          setAstrologyEnabled(!!data?.astrology_enabled)
        })
        .catch(() => {})
    }
    fetchPrefs()
    window.addEventListener('focus', fetchPrefs)

    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/daily-guide/journal?date=${today}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.mood_before || data?.energy_level) {
          const suggested = getSuggestedMode(data.mood_before, data.energy_level, timeContext.suggested)
          setActiveMode(suggested)
        }
        if (data?.journal_mood) {
          setJournalMood(data.journal_mood)
        }
      })
      .catch(() => {})

    // Fetch today's motivation topic
    fetch(`/api/motivation-videos?topic=${topicName}`)
      .then(r => r.ok ? r.json() : { videos: [] })
      .then(data => {
        setMotivationByTopic(prev => ({ ...prev, [topicName]: data.videos || [] }))
      })
      .catch(() => {})
      .finally(() => setLoadingMotivation(false))

    // Fetch favorites (motivation type)
    fetch('/api/favorites?type=motivation')
      .then(r => r.ok ? r.json() : { favorites: [] })
      .then((data: { favorites?: Array<{ id: string; content_id?: string; content_title?: string; content_text: string; thumbnail?: string }> }) => {
        const favorites = data.favorites || []
        const vids: VideoItem[] = []
        const ids = new Set<string>()
        const recordMap = new Map<string, string>()
        for (const f of favorites) {
          const youtubeId = f.content_id || ''
          if (!youtubeId) continue
          ids.add(youtubeId)
          recordMap.set(youtubeId, f.id)
          vids.push({
            id: `fav-${f.id}`,
            youtubeId,
            title: f.content_title || f.content_text,
            channel: '',
            thumbnail: f.thumbnail,
          })
        }
        setSavedMotivationVideos(vids)
        setFavoriteIds(ids)
        setFavoriteRecordMap(recordMap)
      })
      .catch(() => {})

    // Fetch favorites (music type)
    fetch('/api/favorites?type=music')
      .then(r => r.ok ? r.json() : { favorites: [] })
      .then((data: { favorites?: Array<{ id: string; content_id?: string; content_title?: string; content_text: string; thumbnail?: string }> }) => {
        const favorites = data.favorites || []
        const vids: VideoItem[] = []
        const ids = new Set<string>()
        const recordMap = new Map<string, string>()
        for (const f of favorites) {
          const youtubeId = f.content_id || ''
          if (!youtubeId) continue
          ids.add(youtubeId)
          recordMap.set(youtubeId, f.id)
          vids.push({
            id: `mfav-${f.id}`,
            youtubeId,
            title: f.content_title || f.content_text,
            channel: '',
            thumbnail: f.thumbnail,
          })
        }
        setSavedMusicVideos(vids)
        setMusicFavoriteIds(ids)
        setMusicFavoriteRecordMap(recordMap)
      })
      .catch(() => {})

    MUSIC_GENRES.forEach(g => {
      fetch(`/api/music-videos?genre=${g.id}`)
        .then(r => r.ok ? r.json() : { videos: [] })
        .then(data => setGenreVideos(prev => ({ ...prev, [g.id]: data.videos || [] })))
        .catch(() => {})
        .finally(() => setLoadingGenres(prev => ({ ...prev, [g.id]: false })))

      fetch(`/api/backgrounds?genre=${g.id}`)
        .then(r => r.ok ? r.json() : { images: [] })
        .then(data => {
          const urls: string[] = (data.images || []).map((img: { url: string }) => img.url)
          const now = new Date()
          const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
          const genreSeed = g.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
          const shuffled = shuffleWithSeed(urls, genreSeed + dateSeed)
          setGenreBackgrounds(prev => ({ ...prev, [g.id]: shuffled }))
        })
        .catch(() => {})
    })
    return () => window.removeEventListener('focus', fetchPrefs)
  }, [topicName, timeContext.suggested])

  // Fetch mood-based topic if it differs from already-fetched topics
  useEffect(() => {
    if (!moodTopic) return
    if (motivationByTopic[moodTopic]) return // already fetched
    fetch(`/api/motivation-videos?topic=${moodTopic}`)
      .then(r => r.ok ? r.json() : { videos: [] })
      .then(data => {
        setMotivationByTopic(prev => ({ ...prev, [moodTopic]: data.videos || [] }))
      })
      .catch(() => {})
  }, [moodTopic, motivationByTopic])

  // --- Restore last played ---
  // Phase 1: Immediately set backgroundMusic/activeSoundscape so the BottomPlayerBar
  // never falls through to the default soundscape during the restore window.
  const hasPlaylistRestoredRef = useRef(false)

  useEffect(() => {
    if (hasRestoredRef.current) return
    const lastPlayed = audioContext?.lastPlayed
    if (!lastPlayed) {
      isRestorePendingRef.current = false
      return
    }
    if (audioContext?.isSessionActive) return
    hasRestoredRef.current = true

    if (lastPlayed.type === 'music' && lastPlayed.genreId && lastPlayed.videoId) {
      const genre = MUSIC_GENRES.find(g => g.id === lastPlayed.genreId)
      if (genre) {
        dispatch({
          type: 'RESTORE_LAST_PLAYED',
          partial: {
            backgroundMusic: { youtubeId: lastPlayed.videoId, label: lastPlayed.genreWord || genre.word },
            musicPlaying: false,
            userPausedMusic: true,
          },
        })
      }
    } else if (lastPlayed.type === 'motivation' && lastPlayed.videoId) {
      dispatch({
        type: 'RESTORE_LAST_PLAYED',
        partial: {
          backgroundMusic: { youtubeId: lastPlayed.videoId, label: lastPlayed.label || topicName },
          musicPlaying: false,
          userPausedMusic: true,
        },
      })
    } else if (lastPlayed.type === 'soundscape' && lastPlayed.soundscapeId) {
      const item = SOUNDSCAPE_ITEMS.find(i => i.id === lastPlayed.soundscapeId)
      if (item) {
        dispatch({
          type: 'RESTORE_LAST_PLAYED',
          partial: {
            activeSoundscape: { soundId: item.id, label: item.label, subtitle: item.subtitle, youtubeId: item.youtubeId },
            soundscapeIsPlaying: false,
            userPausedSoundscape: true,
          },
        })
      }
    }
    // Clear pending flag after dispatch propagates
    isRestorePendingRef.current = false
  }, [audioContext?.lastPlayed, audioContext?.isSessionActive, topicName, dispatch])

  // Phase 2: Once genre/motivation videos load, upgrade the restore with full playlist data.
  // This runs reactively on genreVideos/motivationByTopic changes — no stale closure issues.
  useEffect(() => {
    if (hasPlaylistRestoredRef.current) return
    if (!hasRestoredRef.current) return // Phase 1 hasn't run yet
    const lastPlayed = audioContext?.lastPlayed
    if (!lastPlayed) return

    if (lastPlayed.type === 'music' && lastPlayed.genreId && lastPlayed.videoId) {
      const videos = genreVideos[lastPlayed.genreId]
      if (!videos || videos.length === 0) return // Not loaded yet — will re-run when it loads
      const genre = MUSIC_GENRES.find(g => g.id === lastPlayed.genreId)
      if (!genre) return
      hasPlaylistRestoredRef.current = true
      const videoIndex = lastPlayed.playlistIndex ?? 0
      const video = videos[videoIndex]
      dispatch({
        type: 'RESTORE_LAST_PLAYED',
        partial: {
          backgroundMusic: { youtubeId: lastPlayed.videoId, label: lastPlayed.genreWord || genre.word },
          musicPlaying: false,
          userPausedMusic: true,
          activeCardId: video?.id || null,
          currentPlaylist: {
            videos: videos.slice(0, 8),
            index: videoIndex,
            type: 'music',
            genreId: lastPlayed.genreId,
            genreWord: lastPlayed.genreWord || genre.word,
          },
        },
      })
    } else if (lastPlayed.type === 'motivation' && lastPlayed.videoId) {
      const restoredTopic = lastPlayed.label || topicName
      const topicVideos = motivationByTopic[restoredTopic] || motivationVideos
      if (topicVideos.length === 0) return // Not loaded yet
      hasPlaylistRestoredRef.current = true
      const videoIndex = lastPlayed.playlistIndex ?? 0
      const video = topicVideos[videoIndex]
      dispatch({
        type: 'RESTORE_LAST_PLAYED',
        partial: {
          backgroundMusic: { youtubeId: lastPlayed.videoId, label: restoredTopic },
          musicPlaying: false,
          userPausedMusic: true,
          activeCardId: video?.id || null,
          currentPlaylist: {
            videos: topicVideos.slice(0, 8),
            index: videoIndex,
            type: 'motivation',
          },
        },
      })
    } else {
      // Soundscape — no playlist needed, already fully restored in phase 1
      hasPlaylistRestoredRef.current = true
    }
  }, [audioContext?.lastPlayed, genreVideos, motivationVideos, motivationByTopic, topicName, dispatch])

  // --- Card tap animation ---
  const triggerTap = (videoId: string) => {
    dispatch({ type: 'TAP_CARD', videoId })
    setTimeout(() => dispatch({ type: 'CLEAR_TAP' }), 400)
  }

  // --- Play handlers ---
  const handlePlayMotivation = (video: VideoItem, index: number, topic?: string) => {
    const playTopic = topic || topicName
    const topicVideos = motivationByTopic[playTopic] || motivationVideos
    triggerTap(video.id)
    // Stop guide audio imperatively
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    if (isPlaying) setIsPlaying(false)
    // Stop soundscape imperatively
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      try { soundscapePlayerRef.current.stopVideo() } catch {}
    }
    currentScVideoIdRef.current = null

    const bg = backgrounds[index % backgrounds.length]
    dispatch({
      type: 'PLAY_MUSIC',
      youtubeId: video.youtubeId,
      label: playTopic,
      cardId: video.id,
      playlist: { videos: topicVideos.slice(0, 8), index, type: 'motivation' },
      playingSound: { word: playTopic, color: 'from-white/[0.06] to-white/[0.02]', youtubeId: video.youtubeId, backgroundImage: bg },
    })
    createBgMusicPlayer(video.youtubeId)

    audioContext?.setLastPlayed({
      type: 'motivation', videoId: video.youtubeId, label: playTopic, playlistIndex: index,
    })

    addRecentlyPlayed({
      youtubeId: video.youtubeId, title: video.title, type: 'motivation',
      label: playTopic, background: bg,
    })
  }

  const handlePlayMusic = (video: VideoItem, index: number, genreId: string, genreWord: string) => {
    triggerTap(video.id)
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    if (isPlaying) setIsPlaying(false)
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      try { soundscapePlayerRef.current.stopVideo() } catch {}
    }
    currentScVideoIdRef.current = null

    const genreVids = (genreVideos[genreId] || []).slice(0, 8)
    const gBgs = genreBackgrounds[genreId] || []
    const bg = gBgs.length > 0 ? gBgs[index % gBgs.length] : backgrounds[(index + 15) % backgrounds.length]

    dispatch({
      type: 'PLAY_MUSIC',
      youtubeId: video.youtubeId,
      label: genreWord,
      cardId: video.id,
      playlist: { videos: genreVids, index, type: 'music', genreId, genreWord },
      playingSound: { word: genreWord, color: 'from-white/[0.06] to-white/[0.02]', youtubeId: video.youtubeId, backgroundImage: bg },
    })
    createBgMusicPlayer(video.youtubeId)

    audioContext?.setLastPlayed({
      type: 'music', genreId, genreWord, videoId: video.youtubeId, label: genreWord, playlistIndex: index,
    })

    addRecentlyPlayed({
      youtubeId: video.youtubeId, title: video.title, type: 'music',
      genreId, genreWord, label: genreWord, background: bg,
    })
  }

  const handleClosePlayer = () => dispatch({ type: 'CLOSE_PLAYER' })

  const handleShuffleTopic = useCallback(async (topic: string) => {
    setShufflingTopic(topic)
    try {
      const seed = Date.now()
      const res = await fetch(`/api/motivation-videos?topic=${topic}&shuffle=true&seed=${seed}`)
      const data = res.ok ? await res.json() : { videos: [] }
      const vids = data.videos || []
      setMotivationByTopic(prev => ({ ...prev, [topic]: vids }))
      if (vids.length > 0) showShuffleToast(`Shuffled ${vids.length} videos`)
    } catch {}
    setShufflingTopic(null)
  }, [showShuffleToast])

  const handleToggleFavorite = useCallback(async (video: VideoItem) => {
    if (navigator.vibrate) navigator.vibrate(50)
    const youtubeId = video.youtubeId
    if (favoriteIds.has(youtubeId)) {
      // Remove favorite
      const recordId = favoriteRecordMap.get(youtubeId)
      if (recordId) {
        setFavoriteIds(prev => { const next = new Set(prev); next.delete(youtubeId); return next })
        setSavedMotivationVideos(prev => prev.filter(v => v.youtubeId !== youtubeId))
        setFavoriteRecordMap(prev => { const next = new Map(prev); next.delete(youtubeId); return next })
        try { await fetch(`/api/favorites?id=${recordId}`, { method: 'DELETE' }) } catch {}
      }
    } else {
      // Add favorite
      setFavoriteIds(prev => new Set(prev).add(youtubeId))
      setSavedMotivationVideos(prev => [...prev, video])
      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_type: 'motivation',
            content_text: video.title,
            content_id: youtubeId,
            content_title: video.title,
            thumbnail: video.thumbnail || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.id) {
            setFavoriteRecordMap(prev => new Map(prev).set(youtubeId, data.id))
          }
        }
      } catch {}
    }
  }, [favoriteIds, favoriteRecordMap])

  const handleShuffleGenre = useCallback(async (genreId: string) => {
    setShufflingGenre(genreId)
    try {
      const seed = Date.now()
      const res = await fetch(`/api/music-videos?genre=${genreId}&shuffle=true&seed=${seed}`)
      const data = res.ok ? await res.json() : { videos: [] }
      const vids = data.videos || []
      setGenreVideos(prev => ({ ...prev, [genreId]: vids }))
      if (vids.length > 0) showShuffleToast(`Shuffled ${vids.length} tracks`)
    } catch {}
    setShufflingGenre(null)
  }, [showShuffleToast])

  const handleToggleMusicFavorite = useCallback(async (video: VideoItem) => {
    if (navigator.vibrate) navigator.vibrate(50)
    const youtubeId = video.youtubeId
    if (musicFavoriteIds.has(youtubeId)) {
      const recordId = musicFavoriteRecordMap.get(youtubeId)
      if (recordId) {
        setMusicFavoriteIds(prev => { const next = new Set(prev); next.delete(youtubeId); return next })
        setSavedMusicVideos(prev => prev.filter(v => v.youtubeId !== youtubeId))
        setMusicFavoriteRecordMap(prev => { const next = new Map(prev); next.delete(youtubeId); return next })
        try { await fetch('/api/favorites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: recordId }) }) } catch {}
      }
    } else {
      setMusicFavoriteIds(prev => new Set(prev).add(youtubeId))
      setSavedMusicVideos(prev => [...prev, video])
      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_type: 'music',
            content_text: video.title,
            content_id: youtubeId,
            content_title: video.title,
            thumbnail: video.thumbnail || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.favorite?.id) {
            setMusicFavoriteRecordMap(prev => new Map(prev).set(youtubeId, data.favorite.id))
          }
        }
      } catch {}
    }
  }, [musicFavoriteIds, musicFavoriteRecordMap])

  const handleMusicSeek = useCallback((seconds: number) => {
    if (bgPlayerRef.current) {
      bgPlayerRef.current.seekTo(seconds, true)
      dispatch({ type: 'MUSIC_TIME_UPDATE', currentTime: seconds, duration: audioState.musicDuration })
    }
  }, [audioState.musicDuration, dispatch])

  // --- Skip ---
  const handleSkipNext = useCallback(() => {
    const pl = audioState.currentPlaylist
    if (!pl || pl.index >= pl.videos.length - 1) return
    const nextIndex = pl.index + 1
    const nextVideo = pl.videos[nextIndex]
    if (!nextVideo) return

    let bg: string | undefined
    if (pl.type === 'motivation') {
      const bgs = getTodaysBackgrounds()
      bg = bgs[nextIndex % bgs.length]
    } else {
      const gBgs = genreBackgrounds[pl.genreId || ''] || []
      bg = gBgs.length > 0 ? gBgs[nextIndex % gBgs.length] : backgrounds[(nextIndex + 15) % backgrounds.length]
    }

    dispatch({
      type: 'SKIP_NEXT', nextVideo, nextIndex, backgroundImage: bg,
      label: pl.type === 'motivation' ? topicName : (pl.genreWord || ''),
    })
    createBgMusicPlayer(nextVideo.youtubeId)

    if (pl.type === 'motivation') {
      audioContext?.setLastPlayed({ type: 'motivation', videoId: nextVideo.youtubeId, label: topicName, playlistIndex: nextIndex })
    } else {
      audioContext?.setLastPlayed({ type: 'music', genreId: pl.genreId, genreWord: pl.genreWord, videoId: nextVideo.youtubeId, label: pl.genreWord || '', playlistIndex: nextIndex })
    }
  }, [audioState.currentPlaylist, topicName, genreBackgrounds, backgrounds, createBgMusicPlayer, audioContext, dispatch])

  const handleSkipPrevious = useCallback(() => {
    const pl = audioState.currentPlaylist
    if (!pl || pl.index <= 0) return
    const prevIndex = pl.index - 1
    const prevVideo = pl.videos[prevIndex]
    if (!prevVideo) return

    let bg: string | undefined
    if (pl.type === 'motivation') {
      const bgs = getTodaysBackgrounds()
      bg = bgs[prevIndex % bgs.length]
    } else {
      const gBgs = genreBackgrounds[pl.genreId || ''] || []
      bg = gBgs.length > 0 ? gBgs[prevIndex % gBgs.length] : backgrounds[(prevIndex + 15) % backgrounds.length]
    }

    dispatch({
      type: 'SKIP_PREVIOUS', prevVideo, prevIndex, backgroundImage: bg,
      label: pl.type === 'motivation' ? topicName : (pl.genreWord || ''),
    })
    createBgMusicPlayer(prevVideo.youtubeId)

    if (pl.type === 'motivation') {
      audioContext?.setLastPlayed({ type: 'motivation', videoId: prevVideo.youtubeId, label: topicName, playlistIndex: prevIndex })
    } else {
      audioContext?.setLastPlayed({ type: 'music', genreId: pl.genreId, genreWord: pl.genreWord, videoId: prevVideo.youtubeId, label: pl.genreWord || '', playlistIndex: prevIndex })
    }
  }, [audioState.currentPlaylist, topicName, genreBackgrounds, backgrounds, createBgMusicPlayer, audioContext, dispatch])

  // Keep autoSkipNextRef in sync
  useEffect(() => {
    const pl = audioState.currentPlaylist
    if (pl && pl.index < pl.videos.length - 1) {
      autoSkipNextRef.current = handleSkipNext
    } else {
      autoSkipNextRef.current = null
    }
  }, [audioState.currentPlaylist, handleSkipNext])

  // --- Section callbacks ---
  const handleSoundscapePlay = useCallback((item: typeof SOUNDSCAPE_ITEMS[number], isLocked: boolean) => {
    if (isLocked) {
      stopPreview()
      setPaywallContentName(item.label)
      setPreviewUnlockCallback(() => () => {
        createSoundscapePlayer(item.youtubeId)
        dispatch({ type: 'SHOW_SOUNDSCAPE_PLAYER' })
      })
    }

    // Stop guide audio imperatively
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    if (isPlaying) setIsPlaying(false)
    // Stop bg music imperatively
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.stopVideo() } catch {}
    }
    if (bgProgressIntervalRef.current) {
      clearInterval(bgProgressIntervalRef.current)
      bgProgressIntervalRef.current = null
    }
    currentBgVideoIdRef.current = null

    dispatch({
      type: 'PLAY_SOUNDSCAPE',
      soundscape: { soundId: item.id, label: item.label, subtitle: item.subtitle, youtubeId: item.youtubeId },
    })
    createSoundscapePlayer(item.youtubeId)

    audioContext?.setLastPlayed({ type: 'soundscape', soundscapeId: item.id, label: item.label })

    if (isLocked) startPreview()
  }, [isPlaying, createSoundscapePlayer, stopPreview, startPreview, audioContext, dispatch])

  const handleSoundscapeReopen = useCallback(() => {
    dispatch({ type: 'SHOW_SOUNDSCAPE_PLAYER' })
  }, [dispatch])

  const handleGuidePlay = useCallback((guideId: string, name: string, isLocked: boolean) => {
    if (isLocked) {
      stopPreview()
      setPaywallContentName(name)
      setPreviewUnlockCallback(() => () => handlePlayGuide(guideId, name))
      handlePlayGuide(guideId, name)
      startPreview()
    } else {
      handlePlayGuide(guideId, name)
    }
  }, [stopPreview, startPreview])

  const handleMotivationPlay = useCallback((video: VideoItem, index: number, isLocked: boolean, topic?: string) => {
    if (isLocked) {
      stopPreview()
      setPaywallContentName(video.title)
      setPreviewUnlockCallback(() => () => handlePlayMotivation(video, index, topic))
      handlePlayMotivation(video, index, topic)
      startPreview()
    } else {
      handlePlayMotivation(video, index, topic)
    }
  }, [stopPreview, startPreview, topicName, motivationByTopic, motivationVideos, backgrounds, createBgMusicPlayer, audioContext, dispatch])

  const handleMusicGenrePlay = useCallback((video: VideoItem, index: number, genreId: string, genreWord: string, isLocked: boolean) => {
    if (isLocked) {
      stopPreview()
      setPaywallContentName(video.title)
      setPreviewUnlockCallback(() => () => handlePlayMusic(video, index, genreId, genreWord))
      handlePlayMusic(video, index, genreId, genreWord)
      startPreview()
    } else {
      handlePlayMusic(video, index, genreId, genreWord)
    }
  }, [stopPreview, startPreview, genreVideos, genreBackgrounds, backgrounds, createBgMusicPlayer, audioContext, dispatch])

  return (
    <div className="isolate min-h-screen">
    <div
      ref={scrollRef}
      className={`relative min-h-screen text-white pb-28 ${showMorningFlow || audioState.playingSound || audioState.showSoundscapePlayer ? 'overflow-hidden max-h-screen' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* --- Fullscreen overlays --- */}

      {/* Video/Music Player */}
      {audioState.playingSound && (
        <WordAnimationPlayer
          word={audioState.playingSound.word}
          script=""
          color={audioState.playingSound.color}
          youtubeId={audioState.playingSound.youtubeId}
          onSkipNext={audioState.currentPlaylist && audioState.currentPlaylist.index < audioState.currentPlaylist.videos.length - 1 ? handleSkipNext : undefined}
          onSkipPrevious={audioState.currentPlaylist && audioState.currentPlaylist.index > 0 ? handleSkipPrevious : undefined}
          hasNext={!!audioState.currentPlaylist && audioState.currentPlaylist.index < audioState.currentPlaylist.videos.length - 1}
          hasPrevious={!!audioState.currentPlaylist && audioState.currentPlaylist.index > 0}
          backgroundImage={audioState.playingSound.backgroundImage}
          showRain={false}
          onClose={handleClosePlayer}
          externalAudio
          externalPlaying={audioState.musicPlaying}
          onTogglePlay={() => debouncedToggle(() => {
            if (audioState.musicPlaying) {
              dispatch({ type: 'PAUSE_MUSIC' })
            } else {
              dispatch({ type: 'RESUME_MUSIC' })
            }
          })}
          externalDuration={audioState.musicDuration}
          externalCurrentTime={audioState.musicCurrentTime}
          onSeek={handleMusicSeek}
          category={audioState.currentPlaylist?.type === 'motivation' ? 'Motivation' : 'Music'}
        />
      )}

      {/* Persistent soundscape YouTube player container */}
      <div ref={soundscapeContainerRef} className="absolute -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden" />

      {/* Soundscape Player (fullscreen orb) */}
      {audioState.activeSoundscape && audioState.showSoundscapePlayer && (
        <SoundscapePlayerComponent
          soundId={audioState.activeSoundscape.soundId}
          label={audioState.activeSoundscape.label}
          subtitle={audioState.activeSoundscape.subtitle}
          youtubeId={audioState.activeSoundscape.youtubeId}
          isPlaying={audioState.soundscapeIsPlaying}
          onTogglePlay={() => debouncedToggle(() => {
            if (audioState.soundscapeIsPlaying) {
              dispatch({ type: 'PAUSE_SOUNDSCAPE' })
            } else {
              dispatch({ type: 'RESUME_SOUNDSCAPE' })
            }
          })}
          onClose={() => dispatch({ type: 'HIDE_SOUNDSCAPE_PLAYER' })}
          onSwitchSound={(id, label, subtitle, youtubeId) => {
            dispatch({ type: 'SWITCH_SOUNDSCAPE', soundscape: { soundId: id, label, subtitle, youtubeId } })
            createSoundscapePlayer(youtubeId)
          }}
        />
      )}

      {/* Morning Flow Overlay */}
      {showMorningFlow && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in-down">
          <div className="flex-1 overflow-y-auto pb-20">
            <DailyGuideHome embedded />
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-[70] flex justify-center pb-6 pt-3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
            <button
              onClick={() => {
                audioContext?.setSessionActive(false)
                setShowMorningFlow(false)
                // Re-trigger restore on next render by resetting refs
                hasRestoredRef.current = false
                hasPlaylistRestoredRef.current = false
              }}
              className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 backdrop-blur-sm transition-colors"
            >
              <Home className="w-4 h-4 text-white/95" />
              <span className="text-sm text-white/95">Home</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden YouTube API player for background music */}
      <div
        ref={bgPlayerContainerRef}
        className="absolute -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden pointer-events-none"
      />

      {/* Pull-down indicator */}
      <div
        className="flex flex-col items-center justify-end overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px', opacity: pullDistance > 0 ? 1 : 0 }}
      >
        <div className="flex flex-col items-center gap-1 pb-2">
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-200 ${
              pullDistance >= PULL_THRESHOLD ? 'text-white rotate-180' : 'text-white/95'
            }`}
          />
          <span className="text-xs text-white/95">
            {pullDistance >= PULL_THRESHOLD ? 'Release for Daily Guide' : 'Pull down for Daily Guide'}
          </span>
        </div>
      </div>

      {/* Header — hidden when any fullscreen overlay is active */}
      {!showMorningFlow && !audioState.playingSound && !audioState.showSoundscapePlayer && (
        <div className="relative z-50 flex items-center justify-between px-6 pt-12 pb-2 animate-fade-in-down header-fade-bg">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold shimmer-text">Explore</h1>
            <StreakBadge streak={streak} />
            <XPBadge />
          </div>
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label={showMenu ? 'Close menu' : 'Open menu'}
            className="p-2 rounded-full bg-[#111113] border border-white/15 hover:border-white/30 transition-colors press-scale"
          >
            {showMenu ? <X className="w-5 h-5 text-white/95" /> : <Menu className="w-5 h-5 text-white/95" />}
          </button>
        </div>
      )}

      {/* Hamburger Menu Dropdown */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
          <div className="absolute right-6 top-[72px] z-40 w-48 py-2 rounded-2xl bg-[#111113] border border-white/15 shadow-xl animate-fade-in-up">
            {astrologyEnabled && (
              <Link href="/astrology" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                <Sparkles className="w-4 h-4 text-white/70" />
                <span className="text-sm text-white/90">Cosmic Guide</span>
              </Link>
            )}
            <Link href="/journal" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <PenLine className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90">Journal</span>
            </Link>
            <Link href="/saved" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <Save className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90">Saved</span>
            </Link>
            <Link href="/progress" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <BarChart3 className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90">Progress</span>
            </Link>
            <div className="mx-3 my-1 border-t border-white/10" />
            <Link href="/settings" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <Settings className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90">Settings</span>
            </Link>
          </div>
        </>
      )}

      {/* Morning Flow Card */}
      <div className="px-6 mt-4 mb-8 liquid-reveal section-fade-bg">
        <button
          onClick={() => { stopBackgroundMusic(); setShowMorningFlow(true) }}
          className="w-full text-left group"
        >
          <div className="relative p-6 card-gradient-border-lg press-scale magnetic-tilt" onPointerMove={magneticMove} onPointerLeave={magneticLeave}>
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-[#111113] border border-white/15">
                  <Sun className="w-5 h-5 text-white/95" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Your Daily Guide</h2>
                  <p className="text-xs text-white/95">Morning flow, checkpoints & more</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-white/95">Tap to open your full guide</p>
                <ChevronRight className="w-5 h-5 text-white/95 group-hover:text-white/95 transition-colors" />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* AI Smart Session */}
      <SmartSessionCard
        isPremium={isPremium}
        onPlaySoundscape={(soundscapeId) => {
          const item = SOUNDSCAPE_ITEMS.find(i => i.id === soundscapeId)
          if (item) handleSoundscapePlay(item, false)
        }}
        onPlayGuide={(guideId) => {
          handlePlayGuide(guideId, guideId)
        }}
        onPlayGenre={(genreId) => {
          const videos = genreVideos[genreId]
          const genre = MUSIC_GENRES.find(g => g.id === genreId)
          if (videos?.length && genre) {
            handlePlayMusic(videos[0], 0, genreId, genre.word)
          }
        }}
        onOpenUpgrade={openUpgradeModal}
      />

      {/* Soundscapes */}
      <SoundscapesSection
        activeSoundscape={audioState.activeSoundscape}
        soundscapeIsPlaying={audioState.soundscapeIsPlaying}
        isContentFree={(type, id) => isContentFree(type, id)}
        onPlay={handleSoundscapePlay}
        onReopen={handleSoundscapeReopen}
      />

      {/* Guided */}
      <GuidedSection
        guideLabel={audioState.guideLabel}
        guideIsPlaying={audioState.guideIsPlaying}
        loadingGuide={audioState.loadingGuide}
        isContentFree={(type, id) => isContentFree(type, id)}
        onPlay={handleGuidePlay}
        onPlayAIMeditation={(themeId) => isPremium ? setAiMeditationTheme(themeId) : openUpgradeModal()}
        isPremium={isPremium}
      />

      {/* Continue Listening (when paused mid-motivation) */}
      {audioState.backgroundMusic && !audioState.musicPlaying && audioState.userPausedMusic
        && audioState.currentPlaylist?.type === 'motivation' && audioState.musicCurrentTime > 0 && (
        <ContinueListeningCard
          video={audioState.currentPlaylist.videos[audioState.currentPlaylist.index] || { id: '', title: audioState.backgroundMusic.label, youtubeId: audioState.backgroundMusic.youtubeId, channel: '' }}
          currentTime={audioState.musicCurrentTime}
          duration={audioState.musicDuration}
          background={backgrounds[audioState.currentPlaylist.index % backgrounds.length]}
          onResume={() => dispatch({ type: 'RESUME_MUSIC' })}
          onOpenPlayer={() => {
            const pl = audioState.currentPlaylist!
            const currentVideo = pl.videos[pl.index]
            if (currentVideo) {
              const bgs = getTodaysBackgrounds()
              dispatch({
                type: 'OPEN_FULLSCREEN_PLAYER',
                playingSound: { word: audioState.backgroundMusic!.label, color: 'from-white/[0.06] to-white/[0.02]', youtubeId: currentVideo.youtubeId, backgroundImage: bgs[pl.index % bgs.length] },
              })
            }
          }}
        />
      )}

      {/* Recently Played */}
      <RecentlyPlayedSection
        items={recentlyPlayed}
        activeCardId={audioState.activeCardId}
        musicPlaying={audioState.musicPlaying}
        onPlay={(item, index) => {
          if (item.type === 'motivation') {
            const video: VideoItem = { id: item.youtubeId, youtubeId: item.youtubeId, title: item.title, channel: '' }
            handlePlayMotivation(video, 0, item.label)
          } else {
            const video: VideoItem = { id: item.youtubeId, youtubeId: item.youtubeId, title: item.title, channel: '' }
            handlePlayMusic(video, 0, item.genreId || '', item.genreWord || item.label)
          }
        }}
        onMagneticMove={magneticMove}
        onMagneticLeave={magneticLeave}
        onRipple={spawnRipple}
      />

      {/* Featured Motivation Row — mood-based "For You" or today's topic */}
      <MotivationSection
        videos={motivationByTopic[featuredTopic] || []}
        loading={loadingMotivation}
        topicName={moodTopic ? 'For You' : featuredTopic}
        tagline={moodTopic ? `Based on your mood \u00b7 ${featuredTopic}` : undefined}
        heroCard={true}
        backgrounds={backgrounds}
        activeCardId={audioState.activeCardId}
        tappedCardId={audioState.tappedCardId}
        musicPlaying={audioState.musicPlaying}
        isContentFree={(type, index) => isContentFree(type, index)}
        onPlay={(video, index, isLocked) => handleMotivationPlay(video, index, isLocked, featuredTopic)}
        onMagneticMove={magneticMove}
        onMagneticLeave={magneticLeave}
        onRipple={spawnRipple}
        onShuffle={() => handleShuffleTopic(featuredTopic)}
        shuffling={shufflingTopic === featuredTopic}
        favoriteIds={favoriteIds}
        onToggleFavorite={handleToggleFavorite}
        progressPercent={audioState.currentPlaylist?.type === 'motivation' && audioState.musicDuration > 0
          ? (audioState.musicCurrentTime / audioState.musicDuration) * 100
          : undefined}
        onLongPressStart={handleLongPressStart}
        onLongPressEnd={handleLongPressEnd}
      />

      {/* Your Saves */}
      {savedMotivationVideos.length > 0 && (
        <SavedMotivationSection
          videos={savedMotivationVideos}
          backgrounds={backgrounds}
          activeCardId={audioState.activeCardId}
          tappedCardId={audioState.tappedCardId}
          musicPlaying={audioState.musicPlaying}
          onPlay={(video, index) => handlePlayMotivation(video, index)}
          onRemoveFavorite={handleToggleFavorite}
          onMagneticMove={magneticMove}
          onMagneticLeave={magneticLeave}
          onRipple={spawnRipple}
        />
      )}

      {/* Music Genres */}
      {MUSIC_GENRES.map((g, gi) => (
        <MusicGenreSection
          key={g.id}
          genre={g}
          videos={genreVideos[g.id] || []}
          genreBackgrounds={genreBackgrounds[g.id] || []}
          fallbackBackgrounds={backgrounds}
          genreIndex={gi}
          loading={loadingGenres[g.id]}
          activeCardId={audioState.activeCardId}
          tappedCardId={audioState.tappedCardId}
          musicPlaying={audioState.musicPlaying}
          isContentFree={(type, index) => isContentFree(type, index)}
          onPlay={handleMusicGenrePlay}
          onMagneticMove={magneticMove}
          onMagneticLeave={magneticLeave}
          onRipple={spawnRipple}
          heroCard={true}
          onShuffle={() => handleShuffleGenre(g.id)}
          shuffling={shufflingGenre === g.id}
          favoriteIds={musicFavoriteIds}
          onToggleFavorite={handleToggleMusicFavorite}
          progressPercent={audioState.currentPlaylist?.type === 'music' && audioState.currentPlaylist?.genreId === g.id && audioState.musicDuration > 0
            ? (audioState.musicCurrentTime / audioState.musicDuration) * 100
            : undefined}
          onLongPressStart={handleLongPressStart}
          onLongPressEnd={handleLongPressEnd}
        />
      ))}

      {/* Saved Music */}
      {savedMusicVideos.length > 0 && (
        <SavedMotivationSection
          label="Saved Music"
          subtitle="Tracks you loved"
          videos={savedMusicVideos}
          backgrounds={backgrounds}
          activeCardId={audioState.activeCardId}
          tappedCardId={audioState.tappedCardId}
          musicPlaying={audioState.musicPlaying}
          onPlay={(video, index) => handlePlayMusic(video, index, '', 'Saved Music')}
          onRemoveFavorite={handleToggleMusicFavorite}
          onMagneticMove={magneticMove}
          onMagneticLeave={magneticLeave}
          onRipple={spawnRipple}
        />
      )}

      {/* Daily Spark */}
      {!showMorningFlow && <DailySpark />}

      {/* Floating AI Coach Button */}
      <Link
        href="/coach"
        className="fixed right-5 bottom-28 z-30 p-3.5 rounded-full bg-gradient-to-br from-amber-500/25 to-orange-500/25 border border-amber-500/25 hover:border-amber-500/40 shadow-lg shadow-amber-500/10 transition-all press-scale backdrop-blur-sm"
      >
        <Bot className="w-6 h-6 text-amber-400" />
      </Link>

      {/* AI Coach Nudge */}
      {!isPremium && (
        <AICoachNudge isVisible={showNudge} onDismiss={dismissNudge} />
      )}

      {/* Preview Timer */}
      {isPreviewActive && <PreviewTimer secondsLeft={secondsLeft} />}

      {/* AI Meditation Player */}
      {aiMeditationTheme && (
        <AIMeditationPlayer
          onClose={() => setAiMeditationTheme(null)}
          preselectedTheme={aiMeditationTheme}
        />
      )}

      {/* Preview Paywall Modal */}
      <PreviewPaywall
        isOpen={showPaywall}
        onClose={() => { setShowPaywall(false); stopPreview() }}
        contentName={paywallContentName}
        showDailyUnlock={!dailyFreeUnlockUsed}
        onUseDailyUnlock={() => {
          useDailyFreeUnlock()
          stopPreview()
          if (previewUnlockCallback) {
            previewUnlockCallback()
            setPreviewUnlockCallback(null)
          }
        }}
      />

      {/* Bottom Player Bar */}
      <BottomPlayerBar
        mode={activeMode}
        isPlaying={
          audioState.backgroundMusic ? audioState.musicPlaying :
          audioState.guideLabel ? audioState.guideIsPlaying :
          audioState.activeSoundscape ? audioState.soundscapeIsPlaying :
          isPlaying
        }
        onTogglePlay={() => debouncedToggle(() => {
          if (audioState.backgroundMusic) {
            if (audioState.musicPlaying) {
              dispatch({ type: 'PAUSE_MUSIC' })
            } else {
              dispatch({ type: 'RESUME_MUSIC' })
              if (!currentBgVideoIdRef.current && audioState.backgroundMusic.youtubeId) {
                createBgMusicPlayer(audioState.backgroundMusic.youtubeId)
              }
            }
          } else if (audioState.guideLabel) {
            toggleGuidePlay()
          } else if (audioState.activeSoundscape) {
            if (audioState.soundscapeIsPlaying) {
              dispatch({ type: 'PAUSE_SOUNDSCAPE' })
            } else {
              dispatch({ type: 'RESUME_SOUNDSCAPE' })
              if (!currentScVideoIdRef.current && audioState.activeSoundscape.youtubeId) {
                createSoundscapePlayer(audioState.activeSoundscape.youtubeId)
              }
            }
          } else {
            // Don't default to soundscape if restore is still pending or session is active
            if (audioContext?.isSessionActive || isRestorePendingRef.current) return
            const item = SOUNDSCAPE_ITEMS.find(i => i.id === activeMode) || SOUNDSCAPE_ITEMS[0]
            dispatch({ type: 'PLAY_SOUNDSCAPE', soundscape: { soundId: item.id, label: item.label, subtitle: item.subtitle, youtubeId: item.youtubeId } })
            createSoundscapePlayer(item.youtubeId)
          }
        })}
        onOpenPlayer={() => {
          if (audioState.backgroundMusic && audioState.currentPlaylist) {
            const pl = audioState.currentPlaylist
            const currentVideo = pl.videos[pl.index]
            if (currentVideo) {
              let bg: string | undefined
              if (pl.type === 'motivation') {
                const bgs = getTodaysBackgrounds()
                bg = bgs[pl.index % bgs.length]
              } else {
                const gBgs = genreBackgrounds[pl.genreId || ''] || []
                bg = gBgs.length > 0 ? gBgs[pl.index % gBgs.length] : backgrounds[(pl.index + 15) % backgrounds.length]
              }
              dispatch({
                type: 'OPEN_FULLSCREEN_PLAYER',
                playingSound: { word: audioState.backgroundMusic.label, color: 'from-white/[0.06] to-white/[0.02]', youtubeId: currentVideo.youtubeId, backgroundImage: bg },
              })
            }
            return
          }
          if (audioState.guideLabel) return
          if (audioState.activeSoundscape) {
            dispatch({ type: 'SHOW_SOUNDSCAPE_PLAYER' })
          } else {
            // Don't default to soundscape if restore is still pending or session is active
            if (audioContext?.isSessionActive || isRestorePendingRef.current) return
            const item = SOUNDSCAPE_ITEMS.find(i => i.id === activeMode) || SOUNDSCAPE_ITEMS[0]
            dispatch({ type: 'PLAY_SOUNDSCAPE', soundscape: { soundId: item.id, label: item.label, subtitle: item.subtitle, youtubeId: item.youtubeId } })
            createSoundscapePlayer(item.youtubeId)
          }
        }}
        label={audioState.backgroundMusic?.label || audioState.guideLabel || audioState.activeSoundscape?.label || undefined}
        nextTrackTitle={
          audioState.currentPlaylist && audioState.currentPlaylist.index < audioState.currentPlaylist.videos.length - 1
            ? audioState.currentPlaylist.videos[audioState.currentPlaylist.index + 1]?.title
            : undefined
        }
        playlistPosition={
          audioState.currentPlaylist
            ? `${audioState.currentPlaylist.index + 1} of ${audioState.currentPlaylist.videos.length}`
            : undefined
        }
      />

      {/* Long-press Preview */}
      <LongPressPreview video={previewVideo} onClose={() => setPreviewVideo(null)} />

      {/* Shuffle Toast */}
      {shuffleToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-md toast-enter">
          <p className="text-sm text-white/90 font-medium whitespace-nowrap">{shuffleToast}</p>
        </div>
      )}
    </div>
    </div>
  )
}
