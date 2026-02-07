'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Settings, PenLine, Home, Save, ChevronDown, ChevronRight, Sun, Sparkles, Bot, Menu, X } from 'lucide-react'
import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'
import type { YTPlayer } from '@/lib/youtube-types'
import '@/lib/youtube-types'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'
import { StreakBadge } from '@/components/daily-guide/StreakDisplay'
import { BottomPlayerBar } from './BottomPlayerBar'
import { DailySpark } from './DailySpark'
import { SoundscapesSection } from './SoundscapesSection'
import { GuidedSection } from './GuidedSection'
import { BreathingSection } from './BreathingSection'
import { BreathingPlayer } from './BreathingPlayer'
import { FocusTimerSection } from './FocusTimerSection'
import { FocusTimerPlayer } from './FocusTimerPlayer'
import { XPBadge } from './XPBadge'
import { MotivationSection } from './MotivationSection'
import { MusicGenreSection } from './MusicGenreSection'
import type { BreathingTechnique } from '@/lib/breathing-exercises'
import type { PomodoroConfig } from '@/lib/pomodoro'
import {
  Mode, VideoItem, MUSIC_GENRES, TOPIC_TAGLINES,
  getTimeContext, getSuggestedMode, getTodaysTopicName, getTodaysBackgrounds, shuffleWithSeed,
} from './home-types'
import { useAudioOptional } from '@/contexts/AudioContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { FREEMIUM_LIMITS } from '@/lib/subscription-constants'
import { PreviewPaywall, PreviewTimer, usePreview, AICoachNudge, useCoachNudge } from '@/components/premium/SoftLock'
import { useScrollReveal, useParallax, useMagneticHover, useRippleBurst } from '@/hooks/useHomeAnimations'
import { useAudioStateMachine, type AudioState } from '@/hooks/useAudioStateMachine'
import { useAudioSideEffects } from '@/hooks/useAudioSideEffects'
import { useVisibilityResume } from '@/hooks/useVisibilityResume'
import { useMediaSession } from '@/hooks/useMediaSession'

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

  // Audio state machine
  const [audioState, dispatch] = useAudioStateMachine()

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

  // Breathing exercise state
  const [showBreathingPlayer, setShowBreathingPlayer] = useState(false)
  const [activeBreathingTechnique, setActiveBreathingTechnique] = useState<BreathingTechnique | null>(null)

  // Focus timer state
  const [showFocusTimer, setShowFocusTimer] = useState(false)
  const [focusPreset, setFocusPreset] = useState<PomodoroConfig | null>(null)

  // Hamburger menu
  const [showMenu, setShowMenu] = useState(false)

  // Overlays
  const [showMorningFlow, setShowMorningFlow] = useState(false)

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
  const [motivationVideos, setMotivationVideos] = useState<VideoItem[]>([])
  const [genreVideos, setGenreVideos] = useState<Record<string, VideoItem[]>>({})
  const [genreBackgrounds, setGenreBackgrounds] = useState<Record<string, string[]>>({})
  const [loadingMotivation, setLoadingMotivation] = useState(true)
  const [loadingGenres, setLoadingGenres] = useState<Record<string, boolean>>(
    () => Object.fromEntries(MUSIC_GENRES.map(g => [g.id, true]))
  )

  const topicName = getTodaysTopicName()
  const [backgrounds] = useState(getTodaysBackgrounds)

  useEffect(() => {
    fetch('/api/daily-guide/preferences')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.current_streak) setStreak(data.current_streak) })
      .catch(() => {})

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

    fetch(`/api/motivation-videos?topic=${topicName}`)
      .then(r => r.ok ? r.json() : { videos: [] })
      .then(data => setMotivationVideos(data.videos || []))
      .catch(() => {})
      .finally(() => setLoadingMotivation(false))

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
  }, [topicName, timeContext.suggested])

  // --- Restore last played ---
  const restoreLastPlayed = useCallback(() => {
    const lastPlayed = audioContext?.lastPlayed
    if (!lastPlayed) return

    if (lastPlayed.type === 'music' && lastPlayed.genreId && lastPlayed.videoId) {
      const genre = MUSIC_GENRES.find(g => g.id === lastPlayed.genreId)
      if (genre) {
        const partial: Partial<AudioState> = {
          backgroundMusic: { youtubeId: lastPlayed.videoId, label: lastPlayed.genreWord || genre.word },
          musicPlaying: false,
          userPausedMusic: true,
        }

        const checkAndRestore = () => {
          const videos = genreVideos[lastPlayed.genreId!]
          if (videos && videos.length > 0) {
            const videoIndex = lastPlayed.playlistIndex ?? 0
            const video = videos[videoIndex]
            if (video) {
              dispatch({
                type: 'RESTORE_LAST_PLAYED',
                partial: {
                  ...partial,
                  activeCardId: video.id,
                  currentPlaylist: {
                    videos: videos.slice(0, 8),
                    index: videoIndex,
                    type: 'music',
                    genreId: lastPlayed.genreId,
                    genreWord: lastPlayed.genreWord || genre.word,
                  },
                },
              })
              return
            }
          }
          dispatch({ type: 'RESTORE_LAST_PLAYED', partial })
        }
        checkAndRestore()
        setTimeout(checkAndRestore, 1000)
      }
    } else if (lastPlayed.type === 'motivation' && lastPlayed.videoId) {
      const partial: Partial<AudioState> = {
        backgroundMusic: { youtubeId: lastPlayed.videoId, label: lastPlayed.label || topicName },
        musicPlaying: false,
        userPausedMusic: true,
      }

      const checkAndRestore = () => {
        if (motivationVideos.length > 0) {
          const videoIndex = lastPlayed.playlistIndex ?? 0
          const video = motivationVideos[videoIndex]
          if (video) {
            dispatch({
              type: 'RESTORE_LAST_PLAYED',
              partial: {
                ...partial,
                activeCardId: video.id,
                currentPlaylist: {
                  videos: motivationVideos.slice(0, 8),
                  index: videoIndex,
                  type: 'motivation',
                },
              },
            })
            return
          }
        }
        dispatch({ type: 'RESTORE_LAST_PLAYED', partial })
      }
      checkAndRestore()
      setTimeout(checkAndRestore, 1000)
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
  }, [audioContext?.lastPlayed, genreVideos, motivationVideos, topicName, dispatch])

  useEffect(() => {
    if (hasRestoredRef.current) return
    if (!audioContext?.lastPlayed) return
    if (audioContext?.isSessionActive) return
    hasRestoredRef.current = true
    restoreLastPlayed()
  }, [audioContext?.lastPlayed, audioContext?.isSessionActive, restoreLastPlayed])

  // --- Card tap animation ---
  const triggerTap = (videoId: string) => {
    dispatch({ type: 'TAP_CARD', videoId })
    setTimeout(() => dispatch({ type: 'CLEAR_TAP' }), 400)
  }

  // --- Play handlers ---
  const handlePlayMotivation = (video: VideoItem, index: number) => {
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
      label: topicName,
      cardId: video.id,
      playlist: { videos: motivationVideos.slice(0, 8), index, type: 'motivation' },
      playingSound: { word: topicName, color: 'from-white/[0.06] to-white/[0.02]', youtubeId: video.youtubeId, backgroundImage: bg },
    })
    createBgMusicPlayer(video.youtubeId)

    audioContext?.setLastPlayed({
      type: 'motivation', videoId: video.youtubeId, label: topicName, playlistIndex: index,
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
  }

  const handleClosePlayer = () => dispatch({ type: 'CLOSE_PLAYER' })

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

  const handleMotivationPlay = useCallback((video: VideoItem, index: number, isLocked: boolean) => {
    if (isLocked) {
      stopPreview()
      setPaywallContentName(video.title)
      setPreviewUnlockCallback(() => () => handlePlayMotivation(video, index))
      handlePlayMotivation(video, index)
      startPreview()
    } else {
      handlePlayMotivation(video, index)
    }
  }, [stopPreview, startPreview, topicName, motivationVideos, backgrounds, createBgMusicPlayer, audioContext, dispatch])

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
      className={`relative min-h-screen text-white pb-28 ${showMorningFlow || audioState.playingSound || audioState.showSoundscapePlayer || showBreathingPlayer || showFocusTimer ? 'overflow-hidden max-h-screen' : ''}`}
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

      {/* Breathing Player Overlay */}
      {showBreathingPlayer && activeBreathingTechnique && (
        <BreathingPlayer
          technique={activeBreathingTechnique}
          onClose={() => {
            setShowBreathingPlayer(false)
            setActiveBreathingTechnique(null)
          }}
        />
      )}

      {/* Focus Timer Overlay */}
      {showFocusTimer && focusPreset && (
        <FocusTimerPlayer
          preset={focusPreset}
          onClose={() => {
            setShowFocusTimer(false)
            setFocusPreset(null)
          }}
          onFocusStart={() => {
            // Auto-play study music during focus
            const studyVideos = genreVideos['study'] || []
            if (studyVideos.length > 0) {
              const gBgs = genreBackgrounds['study'] || []
              const bg = gBgs.length > 0 ? gBgs[0] : backgrounds[0]
              dispatch({
                type: 'PLAY_MUSIC',
                youtubeId: studyVideos[0].youtubeId,
                label: 'Study',
                cardId: studyVideos[0].id,
                playlist: { videos: studyVideos.slice(0, 8), index: 0, type: 'music', genreId: 'study', genreWord: 'Study' },
                playingSound: null,
              })
              createBgMusicPlayer(studyVideos[0].youtubeId)
            }
          }}
          onBreakStart={() => {
            dispatch({ type: 'PAUSE_MUSIC' })
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
                restoreLastPlayed()
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
      {!showMorningFlow && !audioState.playingSound && !audioState.showSoundscapePlayer && !showBreathingPlayer && !showFocusTimer && (
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
            <Link href="/astrology" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <Sparkles className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90">Cosmic Guide</span>
            </Link>
            <Link href="/journal" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <PenLine className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90">Journal</span>
            </Link>
            <Link href="/saved" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <Save className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90">Saved</span>
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
      <div className="px-6 mt-4 mb-8 scroll-reveal section-fade-bg">
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
      />

      {/* Breathwork */}
      <BreathingSection
        onSelect={(technique) => {
          setActiveBreathingTechnique(technique)
          setShowBreathingPlayer(true)
        }}
      />

      {/* Focus Timer */}
      <FocusTimerSection
        onSelect={(preset) => {
          setFocusPreset(preset)
          setShowFocusTimer(true)
        }}
      />

      {/* Motivation */}
      <MotivationSection
        videos={motivationVideos}
        loading={loadingMotivation}
        topicName={topicName}
        backgrounds={backgrounds}
        activeCardId={audioState.activeCardId}
        tappedCardId={audioState.tappedCardId}
        musicPlaying={audioState.musicPlaying}
        isContentFree={(type, index) => isContentFree(type, index)}
        onPlay={handleMotivationPlay}
        onMagneticMove={magneticMove}
        onMagneticLeave={magneticLeave}
        onRipple={spawnRipple}
      />

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
        />
      ))}

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
            if (audioContext?.isSessionActive) return
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
            if (audioContext?.isSessionActive) return
            const item = SOUNDSCAPE_ITEMS.find(i => i.id === activeMode) || SOUNDSCAPE_ITEMS[0]
            dispatch({ type: 'PLAY_SOUNDSCAPE', soundscape: { soundId: item.id, label: item.label, subtitle: item.subtitle, youtubeId: item.youtubeId } })
            createSoundscapePlayer(item.youtubeId)
          }
        }}
        label={audioState.backgroundMusic?.label || audioState.guideLabel || audioState.activeSoundscape?.label || undefined}
      />
    </div>
    </div>
  )
}
