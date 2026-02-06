'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Settings, PenLine, Play, Pause, Home, Save, ChevronDown, ChevronRight, Sun, Wind, Sparkles, Heart, Moon, Anchor, Loader2, Bot, Music } from 'lucide-react'
import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'
import type { YTPlayer } from '@/lib/youtube-types'
import '@/lib/youtube-types'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'
import { StreakBadge } from '@/components/daily-guide/StreakDisplay'
import { JournalEntry } from '@/components/daily-guide/JournalEntry'
import { ModeSelector } from './ModeSelector'
import { BottomPlayerBar } from './BottomPlayerBar'
import { DailySpark } from './DailySpark'
import { useAudioOptional } from '@/contexts/AudioContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { FREEMIUM_LIMITS } from '@/lib/subscription-constants'
import { SoftLockBadge, PreviewPaywall, PreviewTimer, usePreview, AICoachNudge, useCoachNudge } from '@/components/premium/SoftLock'

const WordAnimationPlayer = dynamic(
  () => import('@/components/player/WordAnimationPlayer').then(mod => mod.WordAnimationPlayer),
  { ssr: false }
)

const SoundscapePlayerComponent = dynamic(
  () => import('@/components/player/SoundscapePlayer').then(mod => mod.SoundscapePlayer),
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
const BACKGROUND_IMAGES = [4,5,6,7,8,9,10,11,12,13,14,15,16,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map(i => `/backgrounds/bg${i}.jpg`)

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
  const audioContext = useAudioOptional()
  const hasRestoredRef = useRef(false)

  // Subscription context for freemium gating
  const { isPremium, isContentFree, dailyFreeUnlockUsed, useDailyFreeUnlock, openUpgradeModal } = useSubscription()

  // Preview paywall state
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallContentName, setPaywallContentName] = useState('')
  const [previewUnlockCallback, setPreviewUnlockCallback] = useState<(() => void) | null>(null)

  // Preview timer hook
  const handlePreviewEnd = useCallback(() => {
    // Pause any playing audio
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.pauseVideo() } catch {}
    }
    if (soundscapePlayerRef.current && soundscapeReady.current) {
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

  // AI Coach nudge for free users
  const { showNudge, dismissNudge } = useCoachNudge(
    isPremium ? Infinity : FREEMIUM_LIMITS.coachNudgeDelayMs
  )

  // Overlays
  const [showMorningFlow, setShowMorningFlow] = useState(false)
  const [showJournalSave, setShowJournalSave] = useState(false)
  const [activeSoundscape, setActiveSoundscape] = useState<{
    soundId: string
    label: string
    subtitle: string
    youtubeId: string
  } | null>(null)
  const [showSoundscapePlayer, setShowSoundscapePlayer] = useState(false)
  const [soundscapeIsPlaying, setSoundscapeIsPlaying] = useState(false)
  const soundscapePlayerRef = useRef<YTPlayer | null>(null)
  const soundscapeContainerRef = useRef<HTMLDivElement>(null)
  const soundscapeReady = useRef(false)
  const [playingSound, setPlayingSound] = useState<{
    word: string
    color: string
    youtubeId: string
    backgroundImage?: string
  } | null>(null)

  // Playlist state for skip functionality
  const [currentPlaylist, setCurrentPlaylist] = useState<{
    videos: VideoItem[]
    index: number
    type: 'motivation' | 'music'
    genreId?: string
    genreWord?: string
  } | null>(null)

  // Track which card is actively playing (by youtubeId)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [tappedCardId, setTappedCardId] = useState<string | null>(null)

  // Background music — persists after closing fullscreen player
  const [backgroundMusic, setBackgroundMusic] = useState<{
    youtubeId: string
    label: string
  } | null>(null)
  const [musicPlaying, setMusicPlaying] = useState(false)

  // Guided voice playback (plays through bottom bar)
  const [guideLabel, setGuideLabel] = useState<string | null>(null)
  const [guideIsPlaying, setGuideIsPlaying] = useState(false)
  const [loadingGuide, setLoadingGuide] = useState<string | null>(null)
  const guideAudioRef = useRef<HTMLAudioElement | null>(null)
  // Increments on each guide request so stale fetches are discarded
  const guideRequestId = useRef(0)
  // Background music YT API player
  const bgPlayerRef = useRef<YTPlayer | null>(null)
  const bgPlayerContainerRef = useRef<HTMLDivElement>(null)
  const bgProgressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [musicDuration, setMusicDuration] = useState(0)
  const [musicCurrentTime, setMusicCurrentTime] = useState(0)

  // Track if home audio is active (to avoid re-entrancy)
  const homeAudioActiveRef = useRef(false)
  const bgPlayerReadyRef = useRef(false)
  // Background persistence refs
  const keepaliveRef = useRef<HTMLAudioElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null)
  // Track current video IDs for reload-on-return
  const currentBgVideoId = useRef<string | null>(null)
  const currentScVideoId = useRef<string | null>(null)
  // Ref to store auto-skip callback (accessible from YT player event handler)
  const autoSkipNextRef = useRef<(() => void) | null>(null)

  // User pause tracking - prevents auto-resume when user manually paused
  const userPausedSoundscapeRef = useRef(false)
  const userPausedMusicRef = useRef(false)
  const toggleDebounceRef = useRef(false)
  const TOGGLE_DEBOUNCE_MS = 300

  // Debounced toggle helper - prevents rapid clicks from overwhelming player
  const debouncedToggle = useCallback((action: () => void) => {
    if (toggleDebounceRef.current) return
    toggleDebounceRef.current = true
    action()
    setTimeout(() => { toggleDebounceRef.current = false }, TOGGLE_DEBOUNCE_MS)
  }, [])

  // Stop all home audio sources (stop videos, don't destroy pre-created players)
  const stopAllHomeAudio = useCallback(() => {
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
      setGuideLabel(null)
      setGuideIsPlaying(false)
    }
    if (isPlaying) setIsPlaying(false)
    // Stop bg music (keep player alive for reuse)
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.stopVideo() } catch {}
    }
    if (bgProgressIntervalRef.current) {
      clearInterval(bgProgressIntervalRef.current)
      bgProgressIntervalRef.current = null
    }
    setBackgroundMusic(null)
    setMusicPlaying(false)
    setMusicDuration(0)
    setMusicCurrentTime(0)
    setPlayingSound(null)
    // Stop soundscape (keep player alive for reuse)
    if (soundscapePlayerRef.current && soundscapeReady.current) {
      try { soundscapePlayerRef.current.stopVideo() } catch {}
    }
    setActiveSoundscape(null)
    setShowSoundscapePlayer(false)
    setSoundscapeIsPlaying(false)
    setActiveCardId(null)
    homeAudioActiveRef.current = false
    currentBgVideoId.current = null
    currentScVideoId.current = null
    // Stop keepalive mechanisms
    if (keepaliveRef.current) {
      keepaliveRef.current.pause()
      keepaliveRef.current.src = ''
      keepaliveRef.current = null
    }
    if (wakeLockRef.current) {
      try { wakeLockRef.current.release() } catch {}
      wakeLockRef.current = null
    }
    // Clear media session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none'
      navigator.mediaSession.metadata = null
    }
  }, [isPlaying])

  // Load YouTube IFrame API early on mount so it's ready when user taps
  const [ytReady, setYtReady] = useState(false)
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtReady(true)
      return
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const first = document.getElementsByTagName('script')[0]
    first.parentNode?.insertBefore(tag, first)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      setYtReady(true)
    }
  }, [])

  // Pre-create both YT players on mount so they're ready before user taps
  useEffect(() => {
    if (!ytReady) return

    // MutationObserver: add allow="autoplay" to iframes created by YT API
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

    // Pre-create bg music player (no video)
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
              setMusicPlaying(true)
              if (bgProgressIntervalRef.current) clearInterval(bgProgressIntervalRef.current)
              bgProgressIntervalRef.current = setInterval(() => {
                if (bgPlayerRef.current) {
                  try {
                    setMusicCurrentTime(bgPlayerRef.current.getCurrentTime())
                    const d = bgPlayerRef.current.getDuration()
                    if (d > 0) setMusicDuration(d)
                  } catch {}
                }
              }, 1000)
            } else if (event.data === 2) {
              setMusicPlaying(false)
            } else if (event.data === 0) {
              // Video ended — auto-skip to next if available, otherwise loop
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

    // Pre-create soundscape player (no video)
    if (!soundscapePlayerRef.current && soundscapeContainerRef.current) {
      soundscapeContainerRef.current.innerHTML = ''
      const div = document.createElement('div')
      div.id = 'sc-yt-pre'
      soundscapeContainerRef.current.appendChild(div)
      soundscapePlayerRef.current = new window.YT.Player('sc-yt-pre', {
        height: '1', width: '1',
        playerVars: { controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0, showinfo: 0, playsinline: 1 },
        events: {
          onReady: () => { soundscapeReady.current = true },
          onStateChange: (event) => {
            if (event.data === 1) setSoundscapeIsPlaying(true)
            else if (event.data === 2) setSoundscapeIsPlaying(false)
            else if (event.data === 0) {
              // Video ended — loop
              try { event.target.seekTo(0, true); event.target.playVideo() } catch {}
            }
          },
        },
      })
    }

    return () => { obs1?.disconnect(); obs2?.disconnect() }
  }, [ytReady])

  // Stop soundscape (keep player alive)
  const destroySoundscapePlayer = useCallback(() => {
    if (soundscapePlayerRef.current && soundscapeReady.current) {
      try { soundscapePlayerRef.current.stopVideo() } catch {}
    }
  }, [])

  // Load a video on the soundscape player — called from click handlers (user gesture context)
  // autoPlay: if true (default), starts playing immediately; if false, just loads the video
  const createSoundscapePlayer = useCallback((youtubeId: string, autoPlay: boolean = true) => {
    if (soundscapePlayerRef.current && soundscapeReady.current) {
      currentScVideoId.current = youtubeId
      soundscapePlayerRef.current.loadVideoById(youtubeId)
      soundscapePlayerRef.current.setVolume(100)
      if (autoPlay) {
        setSoundscapeIsPlaying(true)
        userPausedSoundscapeRef.current = false // Reset pause state when auto-playing
      }
    }
  }, [])

  // Soundscape play/pause - send commands based on desired state
  useEffect(() => {
    if (!soundscapeReady.current || !soundscapePlayerRef.current) return
    try {
      if (soundscapeIsPlaying) {
        soundscapePlayerRef.current.playVideo()
      } else {
        soundscapePlayerRef.current.pauseVideo()
      }
    } catch (e) {
      console.error('[ImmersiveHome] Soundscape play/pause error:', e)
    }
  }, [soundscapeIsPlaying])

  // Load a video on the bg music player — called from click handlers (user gesture context)
  const createBgMusicPlayer = useCallback((youtubeId: string) => {
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      currentBgVideoId.current = youtubeId
      bgPlayerRef.current.loadVideoById(youtubeId)
      bgPlayerRef.current.setVolume(80)
    }
  }, [])

  // Cleanup background music progress when cleared
  useEffect(() => {
    if (!backgroundMusic) {
      if (bgPlayerRef.current && bgPlayerReadyRef.current) {
        try { bgPlayerRef.current.stopVideo() } catch {}
      }
      if (bgProgressIntervalRef.current) {
        clearInterval(bgProgressIntervalRef.current)
        bgProgressIntervalRef.current = null
      }
      setMusicDuration(0)
      setMusicCurrentTime(0)
    }
  }, [backgroundMusic])

  // Pause/play background music - send commands based on desired state
  useEffect(() => {
    if (!bgPlayerRef.current || !bgPlayerReadyRef.current || !backgroundMusic) return
    try {
      if (musicPlaying) {
        bgPlayerRef.current.playVideo()
      } else {
        bgPlayerRef.current.pauseVideo()
      }
    } catch (e) {
      console.error('[ImmersiveHome] Music play/pause error:', e)
    }
  }, [musicPlaying, backgroundMusic])

  // Media Session API — lock screen controls + prevents browser from killing audio
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const label = backgroundMusic?.label || guideLabel || activeSoundscape?.label
    const playing = musicPlaying || guideIsPlaying || soundscapeIsPlaying

    if (!label) {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
      return
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: label,
      artist: 'Voxu',
      album: backgroundMusic ? 'Music' : guideLabel ? 'Guided' : 'Soundscape',
    })
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'

    navigator.mediaSession.setActionHandler('play', () => {
      if (backgroundMusic) setMusicPlaying(true)
      else if (activeSoundscape) setSoundscapeIsPlaying(true)
      else if (guideAudioRef.current) {
        guideAudioRef.current.play().then(() => setGuideIsPlaying(true))
      }
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      if (backgroundMusic) setMusicPlaying(false)
      else if (activeSoundscape) setSoundscapeIsPlaying(false)
      else if (guideAudioRef.current) {
        guideAudioRef.current.pause()
        setGuideIsPlaying(false)
      }
    })
    navigator.mediaSession.setActionHandler('stop', () => {
      stopAllHomeAudio()
    })
  }, [backgroundMusic, guideLabel, activeSoundscape, musicPlaying, guideIsPlaying, soundscapeIsPlaying, stopAllHomeAudio])

  // Resume audio when user returns to the app (visibilitychange)
  // Respects user pause state - if user manually paused, don't auto-resume
  useEffect(() => {
    let reloadAttempted = false

    const tryResume = () => {
      // Resume background music - only if user didn't manually pause
      if (currentBgVideoId.current && bgPlayerRef.current && bgPlayerReadyRef.current && !userPausedMusicRef.current) {
        try {
          const state = bgPlayerRef.current.getPlayerState()
          if (state !== 1) {
            if (!reloadAttempted) {
              // First try: just playVideo
              bgPlayerRef.current.playVideo()
            } else {
              // Retry: reload the video entirely (more reliable after suspension)
              bgPlayerRef.current.loadVideoById(currentBgVideoId.current)
              bgPlayerRef.current.setVolume(80)
            }
          }
        } catch {}
      }

      // Resume soundscape - only if user didn't manually pause
      if (currentScVideoId.current && soundscapePlayerRef.current && soundscapeReady.current && !userPausedSoundscapeRef.current) {
        try {
          const state = soundscapePlayerRef.current.getPlayerState()
          if (state !== 1) {
            if (!reloadAttempted) {
              soundscapePlayerRef.current.playVideo()
            } else {
              soundscapePlayerRef.current.loadVideoById(currentScVideoId.current)
              soundscapePlayerRef.current.setVolume(100)
            }
          }
        } catch {}
      }

      // Resume guide audio
      if (guideLabel && guideAudioRef.current?.paused) {
        guideAudioRef.current.play().catch(() => {})
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (!homeAudioActiveRef.current) return

      // Re-acquire wake lock (released when screen locks)
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock
        }).catch(() => {})
      }

      // First attempt: playVideo
      reloadAttempted = false
      tryResume()

      // Second attempt after 800ms: reload video if still not playing
      setTimeout(() => {
        reloadAttempted = true
        tryResume()
      }, 800)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [guideLabel])

  // When daily guide starts a session, stop all home audio
  useEffect(() => {
    if (audioContext?.isSessionActive && !homeAudioActiveRef.current) {
      stopAllHomeAudio()
    }
  }, [audioContext?.isSessionActive, stopAllHomeAudio])

  // Notify audio context when home audio starts/stops + keepalive for background playback
  const setHomeAudioActive = useCallback((active: boolean) => {
    homeAudioActiveRef.current = active
    if (audioContext && active) {
      audioContext.setSessionActive(true)
    } else if (audioContext && !active) {
      audioContext.setSessionActive(false)
    }

    if (active) {
      // 1. Screen Wake Lock — prevents device auto-sleep while audio plays
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock
          lock.addEventListener('release', () => { wakeLockRef.current = null })
        }).catch(() => {})
      }

      // 2. Web Locks API — prevents browser from freezing the page
      if ('locks' in navigator) {
        (navigator as any).locks.request('voxu-audio-playback', () =>
          new Promise<void>((resolve) => {
            const check = setInterval(() => {
              if (!homeAudioActiveRef.current) {
                clearInterval(check)
                resolve()
              }
            }, 2000)
          })
        ).catch(() => {})
      }

      // 3. Silent <audio> keepalive (started in user gesture context)
      if (!keepaliveRef.current) {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==')
          audio.loop = true
          audio.volume = 0.01
          audio.play().catch(() => {})
          keepaliveRef.current = audio
        } catch {}
      }
    } else {
      // Stop keepalive mechanisms
      if (keepaliveRef.current) {
        keepaliveRef.current.pause()
        keepaliveRef.current.src = ''
        keepaliveRef.current = null
      }
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release() } catch {}
        wakeLockRef.current = null
      }
    }
  }, [audioContext])

  const handlePlayGuide = async (guideId: string, guideName: string) => {
    // Stop any current guide audio
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    // Increment request ID so any in-flight fetch is discarded
    const thisRequest = ++guideRequestId.current
    // Stop soundscape if playing
    if (isPlaying) setIsPlaying(false)
    destroySoundscapePlayer()
    setActiveSoundscape(null)
    setShowSoundscapePlayer(false)
    setSoundscapeIsPlaying(false)
    // Signal home audio active
    setHomeAudioActive(true)

    setLoadingGuide(guideId)
    setGuideLabel(guideName)
    setGuideIsPlaying(false)
    try {
      const typeMap: Record<string, string> = { anxiety: 'grounding' }
      const mappedType = typeMap[guideId] || guideId

      const response = await fetch('/api/daily-guide/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mappedType }),
      })
      const data = await response.json()

      // Discard if a newer request was made while this one was in flight
      if (guideRequestId.current !== thisRequest) return

      if (data.audioBase64) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioBase64}`
        const audio = new Audio(audioUrl)
        guideAudioRef.current = audio

        audio.oncanplaythrough = () => {
          // Double-check we're still the active request before playing
          if (guideRequestId.current !== thisRequest) {
            audio.pause()
            audio.src = ''
            return
          }
          audio.play()
            .then(() => setGuideIsPlaying(true))
            .catch(err => console.error('Guide play error:', err))
        }
        audio.onended = () => {
          setGuideIsPlaying(false)
          setHomeAudioActive(false)
        }
        audio.onerror = () => {
          setGuideIsPlaying(false)
          setGuideLabel(null)
          setHomeAudioActive(false)
        }
      }
    } catch (err) {
      console.error('Guide fetch error:', err)
      if (guideRequestId.current === thisRequest) {
        setGuideLabel(null)
      }
    } finally {
      if (guideRequestId.current === thisRequest) {
        setLoadingGuide(null)
      }
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
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 150))
    }
  }, [isPulling, showMorningFlow])

  const handleTouchEnd = useCallback(() => {
    if (showMorningFlow) return
    if (pullDistance >= PULL_THRESHOLD) {
      stopBackgroundMusic()
      setShowMorningFlow(true)
    }
    setPullDistance(0)
    setIsPulling(false)
  }, [pullDistance, showMorningFlow])

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

  // Restore last played content when returning to home page
  // Don't create players during restore - just set up state for bottom bar display
  // User must explicitly click to start playback (fixes auto-play on app open)
  useEffect(() => {
    if (hasRestoredRef.current) return
    if (!ytReady || !bgPlayerReadyRef.current) return
    if (!audioContext?.lastPlayed) return
    // Don't restore if Daily Guide session is active to prevent audio overlap
    if (audioContext?.isSessionActive) return

    const lastPlayed = audioContext.lastPlayed
    hasRestoredRef.current = true

    // Restore based on type
    if (lastPlayed.type === 'music' && lastPlayed.genreId && lastPlayed.videoId) {
      const genre = MUSIC_GENRES.find(g => g.id === lastPlayed.genreId)
      if (genre) {
        // Wait for genre videos to load, then restore
        const checkAndRestore = () => {
          const videos = genreVideos[lastPlayed.genreId!]
          if (videos && videos.length > 0) {
            const videoIndex = lastPlayed.playlistIndex ?? 0
            const video = videos[videoIndex]
            if (video) {
              // Don't auto-play, but set up the state so bottom bar shows last played
              setActiveCardId(video.id)
              setCurrentPlaylist({
                videos: videos.slice(0, 8),
                index: videoIndex,
                type: 'music',
                genreId: lastPlayed.genreId,
                genreWord: lastPlayed.genreWord || genre.word,
              })
              setBackgroundMusic({ youtubeId: video.youtubeId, label: lastPlayed.genreWord || genre.word })
              // Don't auto-play - user can tap bottom bar to resume
              // Mark as user paused so visibility change doesn't auto-resume
              setMusicPlaying(false)
              userPausedMusicRef.current = true
            }
          }
        }
        // Check immediately and also after a delay (in case videos are still loading)
        checkAndRestore()
        setTimeout(checkAndRestore, 1000)
      }
    } else if (lastPlayed.type === 'motivation' && lastPlayed.videoId) {
      // Wait for motivation videos to load
      const checkAndRestore = () => {
        if (motivationVideos.length > 0) {
          const videoIndex = lastPlayed.playlistIndex ?? 0
          const video = motivationVideos[videoIndex]
          if (video) {
            setActiveCardId(video.id)
            setCurrentPlaylist({
              videos: motivationVideos.slice(0, 8),
              index: videoIndex,
              type: 'motivation',
            })
            setBackgroundMusic({ youtubeId: video.youtubeId, label: topicName })
            // Don't auto-play - mark as user paused
            setMusicPlaying(false)
            userPausedMusicRef.current = true
          }
        }
      }
      checkAndRestore()
      setTimeout(checkAndRestore, 1000)
    } else if (lastPlayed.type === 'soundscape' && lastPlayed.soundscapeId) {
      const item = SOUNDSCAPE_ITEMS.find(i => i.id === lastPlayed.soundscapeId)
      if (item) {
        setActiveSoundscape({
          soundId: item.id,
          label: item.label,
          subtitle: item.subtitle,
          youtubeId: item.youtubeId,
        })
        // Don't auto-play or show player - just set state for bottom bar
        // Mark as user paused so visibility change doesn't auto-resume
        setSoundscapeIsPlaying(false)
        userPausedSoundscapeRef.current = true
      }
    }
  }, [ytReady, audioContext?.lastPlayed, genreVideos, motivationVideos, topicName])

  // Trigger tap ripple animation on a card
  const triggerTap = (videoId: string) => {
    setTappedCardId(videoId)
    setTimeout(() => setTappedCardId(null), 400)
  }

  const handlePlayMotivation = (video: VideoItem, index: number) => {
    triggerTap(video.id)
    setActiveCardId(video.id)
    // Stop any guide audio
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
      setGuideLabel(null)
      setGuideIsPlaying(false)
    }
    // Stop soundscape
    if (isPlaying) setIsPlaying(false)
    destroySoundscapePlayer()
    setActiveSoundscape(null)
    setShowSoundscapePlayer(false)
    setSoundscapeIsPlaying(false)
    // Signal home audio active
    setHomeAudioActive(true)

    // Set playlist for skip functionality
    setCurrentPlaylist({
      videos: motivationVideos.slice(0, 8),
      index,
      type: 'motivation',
    })

    // User explicitly clicked - reset pause state
    userPausedMusicRef.current = false
    // Create player synchronously in tap gesture context (mobile autoplay)
    setBackgroundMusic({ youtubeId: video.youtubeId, label: topicName })
    setMusicPlaying(true)
    createBgMusicPlayer(video.youtubeId)

    // Save last played to context for persistence
    audioContext?.setLastPlayed({
      type: 'motivation',
      videoId: video.youtubeId,
      label: topicName,
      playlistIndex: index,
    })

    const backgrounds = getTodaysBackgrounds()
    setPlayingSound({
      word: topicName,
      color: 'from-white/[0.06] to-white/[0.02]',
      youtubeId: video.youtubeId,
      backgroundImage: backgrounds[index % backgrounds.length],
    })
  }

  const handlePlayMusic = (video: VideoItem, index: number, genreId: string, genreWord: string) => {
    triggerTap(video.id)
    setActiveCardId(video.id)
    // Stop any guide audio
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
      setGuideLabel(null)
      setGuideIsPlaying(false)
    }
    // Stop soundscape
    if (isPlaying) setIsPlaying(false)
    destroySoundscapePlayer()
    setActiveSoundscape(null)
    setShowSoundscapePlayer(false)
    setSoundscapeIsPlaying(false)
    // Signal home audio active
    setHomeAudioActive(true)

    // Set playlist for skip functionality
    const genreVids = (genreVideos[genreId] || []).slice(0, 8)
    setCurrentPlaylist({
      videos: genreVids,
      index,
      type: 'music',
      genreId,
      genreWord,
    })

    // User explicitly clicked - reset pause state
    userPausedMusicRef.current = false
    // Create player synchronously in tap gesture context (mobile autoplay)
    setBackgroundMusic({ youtubeId: video.youtubeId, label: genreWord })
    setMusicPlaying(true)
    createBgMusicPlayer(video.youtubeId)

    // Save last played to context for persistence
    audioContext?.setLastPlayed({
      type: 'music',
      genreId,
      genreWord,
      videoId: video.youtubeId,
      label: genreWord,
      playlistIndex: index,
    })

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

  // Close fullscreen player — audio continues via backgroundMusic YT player
  const handleClosePlayer = () => {
    setPlayingSound(null)
    // Keep currentPlaylist so user can reopen the player from bottom bar
  }

  // Seek background music to a specific time
  const handleMusicSeek = useCallback((seconds: number) => {
    if (bgPlayerRef.current) {
      bgPlayerRef.current.seekTo(seconds, true)
      setMusicCurrentTime(seconds)
    }
  }, [])

  // Skip to next video in playlist
  const handleSkipNext = useCallback(() => {
    if (!currentPlaylist || currentPlaylist.index >= currentPlaylist.videos.length - 1) return

    const nextIndex = currentPlaylist.index + 1
    const nextVideo = currentPlaylist.videos[nextIndex]
    if (!nextVideo) return

    setActiveCardId(nextVideo.id)
    setCurrentPlaylist(prev => prev ? { ...prev, index: nextIndex } : null)

    // Reset time tracking
    setMusicCurrentTime(0)
    setMusicDuration(0)

    // Load next video
    setBackgroundMusic({
      youtubeId: nextVideo.youtubeId,
      label: currentPlaylist.type === 'motivation' ? topicName : (currentPlaylist.genreWord || ''),
    })
    createBgMusicPlayer(nextVideo.youtubeId)

    // Update last played info
    if (currentPlaylist.type === 'motivation') {
      audioContext?.setLastPlayed({
        type: 'motivation',
        videoId: nextVideo.youtubeId,
        label: topicName,
        playlistIndex: nextIndex,
      })
    } else {
      audioContext?.setLastPlayed({
        type: 'music',
        genreId: currentPlaylist.genreId,
        genreWord: currentPlaylist.genreWord,
        videoId: nextVideo.youtubeId,
        label: currentPlaylist.genreWord || '',
        playlistIndex: nextIndex,
      })
    }

    // Update background image
    if (currentPlaylist.type === 'motivation') {
      const bgs = getTodaysBackgrounds()
      setPlayingSound(prev => prev ? {
        ...prev,
        youtubeId: nextVideo.youtubeId,
        backgroundImage: bgs[nextIndex % bgs.length],
      } : null)
    } else {
      const gBgs = genreBackgrounds[currentPlaylist.genreId || ''] || []
      const bg = gBgs.length > 0
        ? gBgs[nextIndex % gBgs.length]
        : backgrounds[(nextIndex + 15) % backgrounds.length]
      setPlayingSound(prev => prev ? {
        ...prev,
        youtubeId: nextVideo.youtubeId,
        backgroundImage: bg,
      } : null)
    }
  }, [currentPlaylist, topicName, genreBackgrounds, backgrounds, createBgMusicPlayer, audioContext])

  // Skip to previous video in playlist
  const handleSkipPrevious = useCallback(() => {
    if (!currentPlaylist || currentPlaylist.index <= 0) return

    const prevIndex = currentPlaylist.index - 1
    const prevVideo = currentPlaylist.videos[prevIndex]
    if (!prevVideo) return

    setActiveCardId(prevVideo.id)
    setCurrentPlaylist(prev => prev ? { ...prev, index: prevIndex } : null)

    // Reset time tracking
    setMusicCurrentTime(0)
    setMusicDuration(0)

    // Load previous video
    setBackgroundMusic({
      youtubeId: prevVideo.youtubeId,
      label: currentPlaylist.type === 'motivation' ? topicName : (currentPlaylist.genreWord || ''),
    })
    createBgMusicPlayer(prevVideo.youtubeId)

    // Update last played info
    if (currentPlaylist.type === 'motivation') {
      audioContext?.setLastPlayed({
        type: 'motivation',
        videoId: prevVideo.youtubeId,
        label: topicName,
        playlistIndex: prevIndex,
      })
    } else {
      audioContext?.setLastPlayed({
        type: 'music',
        genreId: currentPlaylist.genreId,
        genreWord: currentPlaylist.genreWord,
        videoId: prevVideo.youtubeId,
        label: currentPlaylist.genreWord || '',
        playlistIndex: prevIndex,
      })
    }

    // Update background image
    if (currentPlaylist.type === 'motivation') {
      const bgs = getTodaysBackgrounds()
      setPlayingSound(prev => prev ? {
        ...prev,
        youtubeId: prevVideo.youtubeId,
        backgroundImage: bgs[prevIndex % bgs.length],
      } : null)
    } else {
      const gBgs = genreBackgrounds[currentPlaylist.genreId || ''] || []
      const bg = gBgs.length > 0
        ? gBgs[prevIndex % gBgs.length]
        : backgrounds[(prevIndex + 15) % backgrounds.length]
      setPlayingSound(prev => prev ? {
        ...prev,
        youtubeId: prevVideo.youtubeId,
        backgroundImage: bg,
      } : null)
    }
  }, [currentPlaylist, topicName, genreBackgrounds, backgrounds, createBgMusicPlayer, audioContext])

  // Keep autoSkipNextRef in sync with handleSkipNext for YT player event handler
  useEffect(() => {
    if (currentPlaylist && currentPlaylist.index < currentPlaylist.videos.length - 1) {
      autoSkipNextRef.current = handleSkipNext
    } else {
      autoSkipNextRef.current = null
    }
  }, [currentPlaylist, handleSkipNext])

  // Stop background music entirely (keep player alive for reuse)
  const stopBackgroundMusic = () => {
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.stopVideo() } catch {}
    }
    if (bgProgressIntervalRef.current) {
      clearInterval(bgProgressIntervalRef.current)
      bgProgressIntervalRef.current = null
    }
    currentBgVideoId.current = null
    setBackgroundMusic(null)
    setMusicPlaying(false)
    setMusicDuration(0)
    setMusicCurrentTime(0)
    setActiveCardId(null)
    setCurrentPlaylist(null)
    setHomeAudioActive(false)
  }

  return (
    <div className="isolate min-h-screen">
    <div
      ref={scrollRef}
      className={`relative min-h-screen text-white pb-28 ${showMorningFlow || playingSound || showSoundscapePlayer ? 'overflow-hidden max-h-screen' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* --- Fullscreen overlays --- */}

      {/* Video/Music Player (visual overlay — audio owned by background YT player) */}
      {playingSound && (
        <WordAnimationPlayer
          word={playingSound.word}
          script=""
          color={playingSound.color}
          youtubeId={playingSound.youtubeId}
          onSkipNext={currentPlaylist && currentPlaylist.index < currentPlaylist.videos.length - 1 ? handleSkipNext : undefined}
          onSkipPrevious={currentPlaylist && currentPlaylist.index > 0 ? handleSkipPrevious : undefined}
          hasNext={!!currentPlaylist && currentPlaylist.index < currentPlaylist.videos.length - 1}
          hasPrevious={!!currentPlaylist && currentPlaylist.index > 0}
          backgroundImage={playingSound.backgroundImage}
          showRain={false}
          onClose={handleClosePlayer}
          externalAudio
          externalPlaying={musicPlaying}
          onTogglePlay={() => debouncedToggle(() => {
            if (musicPlaying) {
              userPausedMusicRef.current = true // Track user pause
            } else {
              userPausedMusicRef.current = false // User is resuming
            }
            setMusicPlaying(!musicPlaying)
          })}
          externalDuration={musicDuration}
          externalCurrentTime={musicCurrentTime}
          onSeek={handleMusicSeek}
        />
      )}

      {/* Persistent soundscape YouTube player container (stays alive when fullscreen player is closed) */}
      <div ref={soundscapeContainerRef} className="absolute -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden" />

      {/* Soundscape Player (fullscreen orb) */}
      {activeSoundscape && showSoundscapePlayer && (
        <SoundscapePlayerComponent
          soundId={activeSoundscape.soundId}
          label={activeSoundscape.label}
          subtitle={activeSoundscape.subtitle}
          youtubeId={activeSoundscape.youtubeId}
          isPlaying={soundscapeIsPlaying}
          onTogglePlay={() => debouncedToggle(() => {
            if (soundscapeIsPlaying) {
              userPausedSoundscapeRef.current = true // Track user pause
            } else {
              userPausedSoundscapeRef.current = false // User is resuming
            }
            setSoundscapeIsPlaying(!soundscapeIsPlaying)
          })}
          onClose={() => setShowSoundscapePlayer(false)}
          onSwitchSound={(id, label, subtitle, youtubeId) => {
            setActiveSoundscape({ soundId: id, label, subtitle, youtubeId })
            userPausedSoundscapeRef.current = false // Reset pause state when switching
            createSoundscapePlayer(youtubeId)
          }}
        />
      )}

      {/* Morning Flow Overlay (drop-down) */}
      {showMorningFlow && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in-down">
          <div className="flex-1 overflow-y-auto pb-20">
            <DailyGuideHome embedded />
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-[60] flex justify-center pb-6 pt-3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
            <button
              onClick={() => {
                // Clear session active when closing Morning Flow to prevent audio overlap issues
                audioContext?.setSessionActive(false)
                setShowMorningFlow(false)
              }}
              className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 backdrop-blur-sm transition-colors"
            >
              <Home className="w-4 h-4 text-white/95" />
              <span className="text-sm text-white/95">Home</span>
            </button>
          </div>
        </div>
      )}

      {/* --- Hidden YouTube API player for background music --- */}
      <div
        ref={bgPlayerContainerRef}
        className="absolute -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden pointer-events-none"
      />

      {/* --- Pull-down indicator --- */}
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

      {/* --- Header --- */}
      <div className="flex items-center justify-between px-6 pt-12 pb-2 animate-fade-in-down header-fade-bg">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">Explore</h1>
          <StreakBadge streak={streak} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/journal"
            aria-label="Journal"
            className="p-2 rounded-full bg-[#111113] border border-white/15 hover:border-white/30 transition-colors"
          >
            <PenLine className="w-5 h-5 text-white/95" />
          </Link>
          <Link
            href="/saved"
            aria-label="Saved"
            className="p-2 rounded-full bg-[#111113] border border-white/15 hover:border-white/30 transition-colors"
          >
            <Save className="w-5 h-5 text-white/95" />
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className="p-2 rounded-full bg-[#111113] border border-white/15 hover:border-white/30 transition-colors"
          >
            <Settings className="w-5 h-5 text-white/95" />
          </Link>
        </div>
      </div>

      {/* --- Morning Flow Card --- */}
      <div className="px-6 mt-4 mb-8 animate-fade-in section-fade-bg">
        <button
          onClick={() => { stopBackgroundMusic(); setShowMorningFlow(true) }}
          className="w-full text-left group"
        >
          <div className="relative p-6 card-gradient-border-lg press-scale">
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

      {/* --- Soundscapes --- */}
      <div className="mb-8 animate-fade-in section-fade-bg" style={{ animationDelay: '0.05s' }}>
        <h2 className="text-lg font-semibold text-white px-6 mb-4">Soundscapes</h2>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
          {SOUNDSCAPE_ITEMS.map((item, index) => {
            const Icon = item.icon
            const isActive = activeSoundscape?.soundId === item.id && soundscapeIsPlaying
            const isLocked = !isContentFree('soundscape', item.id)

            return (
              <button
                key={item.id}
                aria-label={`${item.label} soundscape${isActive ? ' (playing)' : ''}${isLocked ? ' (premium)' : ''}`}
                onClick={() => {
                  // If this soundscape is already active, just reopen the player
                  if (activeSoundscape?.soundId === item.id) {
                    setShowSoundscapePlayer(true)
                    return
                  }

                  // Handle locked content - start preview
                  if (isLocked) {
                    stopPreview() // Stop any existing preview
                    setPaywallContentName(item.label)
                    setPreviewUnlockCallback(() => () => {
                      // Callback when daily unlock is used
                      userPausedSoundscapeRef.current = false // Reset pause state
                      createSoundscapePlayer(item.youtubeId)
                      setShowSoundscapePlayer(true)
                    })
                  }

                  // Stop guide audio if playing
                  if (guideAudioRef.current) {
                    guideAudioRef.current.pause()
                    guideAudioRef.current.src = ''
                    guideAudioRef.current = null
                    setGuideLabel(null)
                    setGuideIsPlaying(false)
                  }
                  if (isPlaying) setIsPlaying(false)
                  stopBackgroundMusic()
                  setHomeAudioActive(true)

                  setActiveSoundscape({
                    soundId: item.id,
                    label: item.label,
                    subtitle: item.subtitle,
                    youtubeId: item.youtubeId,
                  })
                  // User explicitly clicked - reset pause state and create player
                  userPausedSoundscapeRef.current = false
                  // Create player synchronously in tap gesture context (mobile autoplay)
                  createSoundscapePlayer(item.youtubeId)
                  setShowSoundscapePlayer(true)

                  // Save last played to context for persistence
                  audioContext?.setLastPlayed({
                    type: 'soundscape',
                    soundscapeId: item.id,
                    label: item.label,
                  })

                  // Start preview timer for locked content
                  if (isLocked) {
                    startPreview()
                  }
                }}
                className="flex flex-col items-center gap-2 shrink-0 press-scale"
              >
                <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 card-gradient-border-round ${isActive ? 'card-now-playing' : ''}`}>
                  {isActive ? (
                    <div className="eq-bars"><span /><span /><span /></div>
                  ) : (
                    <Icon className="w-5 h-5 text-white/95" strokeWidth={1.5} />
                  )}
                  {isLocked && !isActive && (
                    <SoftLockBadge isLocked={true} size="sm" className="top-0 right-0" />
                  )}
                </div>
                <span className={`text-[11px] ${isActive ? 'text-white' : 'text-white/95'}`}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* --- Guided (circular icons like Soundscapes) --- */}
      <div className="mb-8 animate-fade-in section-fade-bg" style={{ animationDelay: '0.08s' }}>
        <h2 className="text-lg font-semibold text-white px-6 mb-4">Guided</h2>
        <div className="flex justify-evenly px-2 pb-2">
          {VOICE_GUIDES.map((guide) => {
            const Icon = guide.icon
            const isLoading = loadingGuide === guide.id
            const isGuideActive = guideLabel === guide.name && guideIsPlaying
            const isLocked = !isContentFree('voiceGuide', guide.id)

            return (
              <button
                key={guide.id}
                aria-label={`${guide.name} guide${isGuideActive ? ' (playing)' : isLoading ? ' (loading)' : ''}${isLocked ? ' (premium)' : ''}`}
                onClick={() => {
                  if (isLocked) {
                    stopPreview()
                    setPaywallContentName(guide.name)
                    setPreviewUnlockCallback(() => () => {
                      handlePlayGuide(guide.id, guide.name)
                    })
                    // Start the guide with preview
                    handlePlayGuide(guide.id, guide.name)
                    startPreview()
                  } else {
                    handlePlayGuide(guide.id, guide.name)
                  }
                }}
                disabled={isLoading}
                className="flex flex-col items-center gap-2 press-scale"
              >
                <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 card-gradient-border-round ${isLoading ? 'bg-white/8' : ''} ${isGuideActive ? 'card-now-playing' : ''}`}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 text-white/95 animate-spin" />
                  ) : isGuideActive ? (
                    <div className="eq-bars"><span /><span /><span /></div>
                  ) : (
                    <Icon
                      className="w-5 h-5 text-white/95 transition-colors duration-200"
                      strokeWidth={1.5}
                    />
                  )}
                  {isLocked && !isGuideActive && !isLoading && (
                    <SoftLockBadge isLocked={true} size="sm" className="top-0 right-0" />
                  )}
                </div>
                <span className={`text-[11px] ${isGuideActive ? 'text-white' : 'text-white/95'}`}>{guide.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* --- Motivation --- */}
      <div className="mb-8 animate-fade-in section-fade-bg" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between px-6 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Motivation</h2>
            <p className="text-xs text-white/95 mt-0.5">{topicName} &middot; {TOPIC_TAGLINES[topicName]}</p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
          {loadingMotivation ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-40">
                <div className="w-40 h-40 rounded-2xl card-gradient-border skeleton-shimmer" />
                <div className="h-3 bg-[#111113] rounded mt-2 w-3/4" />
                <div className="h-2 bg-[#111113] rounded mt-1.5 w-1/2" />
              </div>
            ))
          ) : (
            motivationVideos.slice(0, 8).map((video, index) => {
              const isLocked = !isContentFree('motivation', index)
              const isCardActive = activeCardId === video.id

              return (
                <button
                  key={video.id}
                  aria-label={`Play ${video.title}${isLocked ? ' (premium)' : ''}`}
                  onClick={() => {
                    if (isLocked) {
                      stopPreview()
                      setPaywallContentName(video.title)
                      setPreviewUnlockCallback(() => () => {
                        handlePlayMotivation(video, index)
                      })
                      handlePlayMotivation(video, index)
                      startPreview()
                    } else {
                      handlePlayMotivation(video, index)
                    }
                  }}
                  className="shrink-0 w-40 text-left group press-scale"
                >
                  <div className={`relative w-40 h-40 rounded-2xl card-gradient-border flex items-center justify-center ${isCardActive ? 'card-now-playing' : ''}`}>
                    <img
                      src={backgrounds[index % backgrounds.length]}
                      alt={video.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/20" />
                    <div className={`relative z-10 rounded-full ${tappedCardId === video.id ? 'play-tap' : ''}`}>
                      {isCardActive ? (
                        musicPlaying ? (
                          <div className="eq-bars"><span /><span /><span /></div>
                        ) : (
                          <Pause className="w-8 h-8 text-white drop-shadow-lg" fill="white" />
                        )
                      ) : (
                        <Play className="w-8 h-8 text-white/95 group-hover:text-white transition-colors drop-shadow-lg" fill="rgba(255,255,255,0.45)" />
                      )}
                    </div>
                    {isLocked && !isCardActive && (
                      <SoftLockBadge isLocked={true} size="md" />
                    )}
                  </div>
                  <p className="text-sm text-white/95 mt-2 line-clamp-2 leading-tight">{video.title}</p>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* --- Music Genres --- */}
      {MUSIC_GENRES.map((g, gi) => {
        const videos = genreVideos[g.id] || []
        const gBgs = genreBackgrounds[g.id] || []
        const isLoading = loadingGenres[g.id]

        return (
          <div key={g.id} className="mb-8 animate-fade-in section-fade-bg" style={{ animationDelay: `${0.2 + gi * 0.05}s` }}>
            <div className="flex items-center justify-between px-6 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{g.word}</h2>
                <p className="text-xs text-white/95 mt-0.5">{g.tagline}</p>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="shrink-0 w-40">
                    <div className="w-40 h-40 rounded-2xl card-gradient-border skeleton-shimmer" />
                    <div className="h-3 bg-[#111113] rounded mt-2 w-3/4" />
                    <div className="h-2 bg-[#111113] rounded mt-1.5 w-1/2" />
                  </div>
                ))
              ) : videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full py-10 gap-2">
                  <Music className="w-6 h-6 text-white/30" />
                  <p className="text-sm text-white/40">No tracks yet</p>
                </div>
              ) : (
                videos.slice(0, 8).map((video, index) => {
                  const isLocked = !isContentFree('music', index)
                  const isCardActive = activeCardId === video.id

                  return (
                    <button
                      key={video.id}
                      aria-label={`Play ${video.title}${isLocked ? ' (premium)' : ''}`}
                      onClick={() => {
                        if (isLocked) {
                          stopPreview()
                          setPaywallContentName(video.title)
                          setPreviewUnlockCallback(() => () => {
                            handlePlayMusic(video, index, g.id, g.word)
                          })
                          handlePlayMusic(video, index, g.id, g.word)
                          startPreview()
                        } else {
                          handlePlayMusic(video, index, g.id, g.word)
                        }
                      }}
                      className="shrink-0 w-40 text-left group press-scale"
                    >
                      <div className={`relative w-40 h-40 rounded-2xl card-gradient-border flex items-center justify-center ${isCardActive ? 'card-now-playing' : ''}`}>
                        {(gBgs.length > 0 || backgrounds.length > 0) && (
                          <img
                            src={gBgs.length > 0
                              ? gBgs[index % gBgs.length]
                              : backgrounds[(index + 15 + gi * 5) % backgrounds.length]}
                            alt={video.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/20" />
                        <div className={`relative z-10 rounded-full ${tappedCardId === video.id ? 'play-tap' : ''}`}>
                          {isCardActive ? (
                            musicPlaying ? (
                              <div className="eq-bars"><span /><span /><span /></div>
                            ) : (
                              <Pause className="w-8 h-8 text-white drop-shadow-lg" fill="white" />
                            )
                          ) : (
                            <Play className="w-8 h-8 text-white/95 group-hover:text-white transition-colors drop-shadow-lg" fill="rgba(255,255,255,0.45)" />
                          )}
                        </div>
                        {isLocked && !isCardActive && (
                          <SoftLockBadge isLocked={true} size="md" />
                        )}
                      </div>
                      <p className="text-sm text-white/95 mt-2 line-clamp-2 leading-tight">{video.title}</p>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )
      })}

      {/* --- Daily Spark notification --- */}
      {!showMorningFlow && <DailySpark />}

      {/* --- Floating AI Coach Button --- */}
      <Link
        href="/coach"
        className="fixed right-5 bottom-28 z-30 p-3.5 rounded-full bg-gradient-to-br from-amber-500/25 to-orange-500/25 border border-amber-500/25 hover:border-amber-500/40 shadow-lg shadow-amber-500/10 transition-all press-scale backdrop-blur-sm"
      >
        <Bot className="w-6 h-6 text-amber-400" />
      </Link>

      {/* --- AI Coach Nudge (for free users after 5 min) --- */}
      {!isPremium && (
        <AICoachNudge isVisible={showNudge} onDismiss={dismissNudge} />
      )}

      {/* --- Preview Timer (shows during 30-sec preview of locked content) --- */}
      {isPreviewActive && (
        <PreviewTimer secondsLeft={secondsLeft} />
      )}

      {/* --- Preview Paywall Modal --- */}
      <PreviewPaywall
        isOpen={showPaywall}
        onClose={() => {
          setShowPaywall(false)
          stopPreview()
        }}
        contentName={paywallContentName}
        showDailyUnlock={!dailyFreeUnlockUsed}
        onUseDailyUnlock={() => {
          useDailyFreeUnlock()
          stopPreview()
          // Resume playback if callback was set
          if (previewUnlockCallback) {
            previewUnlockCallback()
            setPreviewUnlockCallback(null)
          }
        }}
      />

      {/* --- Bottom Player Bar --- */}
      <BottomPlayerBar
        mode={activeMode}
        isPlaying={
          backgroundMusic ? musicPlaying :
          guideLabel ? guideIsPlaying :
          activeSoundscape ? soundscapeIsPlaying :
          isPlaying
        }
        onTogglePlay={() => debouncedToggle(() => {
          // Allow controlling existing audio (backgroundMusic, guideLabel, activeSoundscape)
          // Only block if trying to start NEW audio while Daily Guide session is active
          if (backgroundMusic) {
            if (musicPlaying) {
              userPausedMusicRef.current = true // Track user pause
            } else {
              userPausedMusicRef.current = false // User is resuming
              // Create player if it wasn't created during restore
              if (!currentBgVideoId.current && backgroundMusic.youtubeId) {
                createBgMusicPlayer(backgroundMusic.youtubeId)
                setHomeAudioActive(true)
              }
            }
            setMusicPlaying(!musicPlaying)
          } else if (guideLabel) {
            toggleGuidePlay()
          } else if (activeSoundscape) {
            if (soundscapeIsPlaying) {
              userPausedSoundscapeRef.current = true // Track user pause
            } else {
              userPausedSoundscapeRef.current = false // User is resuming
              // Create player if it wasn't created during restore
              if (!currentScVideoId.current && activeSoundscape.youtubeId) {
                createSoundscapePlayer(activeSoundscape.youtubeId)
                setHomeAudioActive(true)
              }
            }
            setSoundscapeIsPlaying(!soundscapeIsPlaying)
          } else {
            // Don't start new soundscape if Daily Guide is active
            if (audioContext?.isSessionActive) return
            // Open SoundscapePlayer with active mode
            const item = SOUNDSCAPE_ITEMS.find(i => i.id === activeMode) || SOUNDSCAPE_ITEMS[0]
            setActiveSoundscape({ soundId: item.id, label: item.label, subtitle: item.subtitle, youtubeId: item.youtubeId })
            userPausedSoundscapeRef.current = false // Reset pause state
            createSoundscapePlayer(item.youtubeId)
            setShowSoundscapePlayer(true)
          }
        })}
        onOpenPlayer={() => {
          // Allow opening player for existing audio (backgroundMusic, guideLabel, activeSoundscape)
          if (backgroundMusic && currentPlaylist) {
            // Reopen fullscreen player for currently playing music/motivation video
            const currentVideo = currentPlaylist.videos[currentPlaylist.index]
            if (currentVideo) {
              let bg: string | undefined
              if (currentPlaylist.type === 'motivation') {
                const bgs = getTodaysBackgrounds()
                bg = bgs[currentPlaylist.index % bgs.length]
              } else {
                const gBgs = genreBackgrounds[currentPlaylist.genreId || ''] || []
                bg = gBgs.length > 0
                  ? gBgs[currentPlaylist.index % gBgs.length]
                  : backgrounds[(currentPlaylist.index + 15) % backgrounds.length]
              }
              setPlayingSound({
                word: backgroundMusic.label,
                color: 'from-white/[0.06] to-white/[0.02]',
                youtubeId: currentVideo.youtubeId,
                backgroundImage: bg,
              })
            }
            return
          }
          if (guideLabel) return
          if (activeSoundscape) {
            setShowSoundscapePlayer(true)
          } else {
            // Don't start new soundscape if Daily Guide is active
            if (audioContext?.isSessionActive) return
            const item = SOUNDSCAPE_ITEMS.find(i => i.id === activeMode) || SOUNDSCAPE_ITEMS[0]
            setActiveSoundscape({ soundId: item.id, label: item.label, subtitle: item.subtitle, youtubeId: item.youtubeId })
            createSoundscapePlayer(item.youtubeId)
            setShowSoundscapePlayer(true)
          }
        }}
        label={backgroundMusic?.label || guideLabel || activeSoundscape?.label || undefined}
      />
    </div>
    </div>
  )
}

