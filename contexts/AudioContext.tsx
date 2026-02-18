'use client'

import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, ReactNode } from 'react'
import type { YTPlayer } from '@/lib/youtube-types'

// Last played content info for persistence
interface LastPlayedInfo {
  type: 'music' | 'motivation' | 'soundscape' | 'guide' | null
  genreId?: string
  genreWord?: string
  videoId?: string
  soundscapeId?: string
  label?: string
  playlistIndex?: number
  timestamp?: number
}

interface AudioContextType {
  // Background music
  musicEnabled: boolean
  setMusicEnabled: (enabled: boolean) => void
  musicGenre: string | null
  setMusicGenre: (genre: string | null) => void
  isMusicPlaying: boolean
  isMusicLoaded: boolean

  // Session audio (guidance player)
  isSessionActive: boolean
  setSessionActive: (active: boolean) => void

  // Control methods
  pauseMusic: () => void
  resumeMusic: () => void
  stopMusic: () => void
  skipTrack: () => void
  toggleMute: () => void
  isMuted: boolean

  // Last played persistence
  lastPlayed: LastPlayedInfo | null
  setLastPlayed: (info: LastPlayedInfo | null) => void
  clearLastPlayed: () => void
}

const AudioContext = createContext<AudioContextType | null>(null)

export function useAudio() {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider')
  }
  return context
}

export function useAudioOptional() {
  return useContext(AudioContext)
}

interface AudioProviderProps {
  children: ReactNode
}

const LAST_PLAYED_KEY = 'voxu_last_played'

export function AudioProvider({ children }: AudioProviderProps) {
  const [musicEnabled, setMusicEnabledState] = useState(false)
  const [musicGenre, setMusicGenre] = useState<string | null>(null)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [isMusicLoaded, setIsMusicLoaded] = useState(false)
  const [isSessionActive, setSessionActive] = useState(false)
  const [bgMusicVideoId, setBgMusicVideoId] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)

  // Last played state - persisted to localStorage
  const [lastPlayed, setLastPlayedState] = useState<LastPlayedInfo | null>(null)

  const bgMusicPlayerRef = useRef<YTPlayer | null>(null)
  const isMountedRef = useRef(true)
  const userPausedRef = useRef(false)
  const musicEnabledRef = useRef(false)
  const wasPlayingBeforeSessionRef = useRef(false)
  const skipAbortRef = useRef<AbortController | null>(null)

  // Load last played from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(LAST_PLAYED_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as LastPlayedInfo
        // Only restore if it was saved within the last 24 hours
        if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setLastPlayedState(parsed)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Persist last played to localStorage
  const setLastPlayed = useCallback((info: LastPlayedInfo | null) => {
    if (info) {
      const infoWithTimestamp = { ...info, timestamp: Date.now() }
      setLastPlayedState(infoWithTimestamp)
      try {
        localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(infoWithTimestamp))
      } catch {
        // Storage quota exceeded or unavailable
      }
    } else {
      setLastPlayedState(null)
    }
  }, [])

  const clearLastPlayed = useCallback(() => {
    setLastPlayedState(null)
    try {
      localStorage.removeItem(LAST_PLAYED_KEY)
    } catch {
      // Ignore
    }
  }, [])

  // Keep musicEnabledRef in sync with state
  useEffect(() => {
    musicEnabledRef.current = musicEnabled
  }, [musicEnabled])

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.YT && window.YT.Player) return

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
  }, [])

  // Fetch background music video when genre changes
  useEffect(() => {
    if (!musicEnabled || !musicGenre) return

    const fetchMusic = async () => {
      try {
        const response = await fetch(`/api/music-videos?genre=${musicGenre}`)
        if (!response.ok) { console.warn('[AudioContext] music fetch failed:', response.status); return }
        const data = await response.json()
        if (data.videos && data.videos.length > 0 && isMountedRef.current) {
          const randomVideo = data.videos[Math.floor(Math.random() * data.videos.length)]
          setBgMusicVideoId(randomVideo.youtubeId)
        }
      } catch (error) {
        console.error('Failed to fetch background music:', error)
      }
    }

    fetchMusic()
  }, [musicEnabled, musicGenre])

  // Create/control background music player
  useEffect(() => {
    // If music is disabled or a session is active, pause the background music
    if (!musicEnabled || isSessionActive) {
      if (bgMusicPlayerRef.current) {
        try {
          bgMusicPlayerRef.current.pauseVideo()
          setIsMusicPlaying(false)
        } catch (e) {
          // Player might not be ready
        }
      }
      return
    }

    // If music is enabled and we have a video ID, create/play the player
    if (musicEnabled && bgMusicVideoId && !isSessionActive) {
      const createPlayer = () => {
        if (typeof window === 'undefined') return
        if (!window.YT || !window.YT.Player) {
          setTimeout(createPlayer, 100)
          return
        }

        // Create container if needed
        const containerId = 'bg-music-player-global'
        let container = document.getElementById(containerId)
        if (!container) {
          container = document.createElement('div')
          container.id = containerId
          container.style.position = 'fixed'
          container.style.width = '1px'
          container.style.height = '1px'
          container.style.opacity = '0'
          container.style.pointerEvents = 'none'
          container.style.zIndex = '-1'
          document.body.appendChild(container)
        }

        // If player already exists with same video, just play it
        if (bgMusicPlayerRef.current) {
          try {
            bgMusicPlayerRef.current.playVideo()
            setIsMusicPlaying(true)
            return
          } catch (e) {
            // Player might be destroyed, create new one
          }
        }

        // Create new player
        bgMusicPlayerRef.current = new window.YT.Player(containerId, {
          videoId: bgMusicVideoId,
          playerVars: {
            autoplay: 1,
            loop: 1,
            playlist: bgMusicVideoId,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
          },
          events: {
            onReady: (event) => {
              event.target.setVolume(30)
              event.target.playVideo()
              if (isMountedRef.current) {
                setIsMusicLoaded(true)
                setIsMusicPlaying(true)
                // Override browser media session to show Voxu branding
                if ('mediaSession' in navigator) {
                  navigator.mediaSession.metadata = new MediaMetadata({
                    title: 'Background Music',
                    artist: 'Voxu',
                    album: musicGenre ? musicGenre.charAt(0).toUpperCase() + musicGenre.slice(1) : 'Soundscape',
                  })
                }
              }
            },
            onStateChange: (event) => {
              // Update playing state
              if (isMountedRef.current) {
                setIsMusicPlaying(event.data === 1) // 1 = playing
              }
              // Only auto-restart when video ends (loop fallback), never on pause
              if (event.data === 0) {
                if (musicEnabledRef.current && !userPausedRef.current && isMountedRef.current) {
                  event.target.playVideo()
                }
              }
            },
            onError: (event) => {
              console.error('Background music error:', event.data)
            },
          },
        })
      }

      createPlayer()
    }

    // No cleanup here - we want the player to persist
  }, [musicEnabled, bgMusicVideoId, isSessionActive])

  // Resume music when session ends (only if it was playing before)
  useEffect(() => {
    if (!isSessionActive && musicEnabled && bgMusicPlayerRef.current && isMusicLoaded && wasPlayingBeforeSessionRef.current) {
      try {
        bgMusicPlayerRef.current.playVideo()
        setIsMusicPlaying(true)
        wasPlayingBeforeSessionRef.current = false
      } catch (e) { console.warn('[AudioContext]', e) }
    }
  }, [isSessionActive, musicEnabled, isMusicLoaded])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const setMusicEnabled = useCallback((enabled: boolean) => {
    setMusicEnabledState(enabled)
    if (!enabled) {
      // Stop and cleanup when disabling
      if (bgMusicPlayerRef.current) {
        try {
          bgMusicPlayerRef.current.stopVideo()
          bgMusicPlayerRef.current.destroy()
        } catch (e) { console.warn('[AudioContext]', e) }
        bgMusicPlayerRef.current = null
      }
      setIsMusicLoaded(false)
      setIsMusicPlaying(false)
      setBgMusicVideoId(null)
      const container = document.getElementById('bg-music-player-global')
      if (container) container.remove()
    }
  }, [])

  const pauseMusic = useCallback(() => {
    if (bgMusicPlayerRef.current) {
      try {
        // Track if music was playing before this pause (for session resume logic)
        wasPlayingBeforeSessionRef.current = isMusicPlaying
        userPausedRef.current = true
        setSessionActive(true)
        bgMusicPlayerRef.current.pauseVideo()
        setIsMusicPlaying(false)
      } catch (e) {
        console.error('[AudioContext] Pause error:', e)
      }
    }
  }, [isMusicPlaying])

  const resumeMusic = useCallback(() => {
    userPausedRef.current = false
    setSessionActive(false)

    // Only resume if music was actually playing before the session paused it
    if (bgMusicPlayerRef.current && musicEnabled && wasPlayingBeforeSessionRef.current) {
      try {
        bgMusicPlayerRef.current.playVideo()
        setIsMusicPlaying(true)
      } catch (e) {
        console.error('[AudioContext] Resume error:', e)
      }
    }
    // Reset the ref after checking
    wasPlayingBeforeSessionRef.current = false
  }, [musicEnabled])

  const stopMusic = useCallback(() => {
    if (bgMusicPlayerRef.current) {
      try {
        bgMusicPlayerRef.current.stopVideo()
        setIsMusicPlaying(false)
      } catch (e) { console.warn('[AudioContext]', e) }
    }
  }, [])

  const skipTrack = useCallback(async () => {
    if (!musicGenre) return
    userPausedRef.current = false
    setSessionActive(false)

    // Destroy current player
    if (bgMusicPlayerRef.current) {
      try {
        bgMusicPlayerRef.current.stopVideo()
        bgMusicPlayerRef.current.destroy()
      } catch (e) { console.warn('[AudioContext]', e) }
      bgMusicPlayerRef.current = null
    }
    const container = document.getElementById('bg-music-player-global')
    if (container) container.remove()

    // Cancel any in-flight skip request
    if (skipAbortRef.current) skipAbortRef.current.abort()
    skipAbortRef.current = new AbortController()

    try {
      // Fetch a new random video
      const response = await fetch(`/api/music-videos?genre=${musicGenre}`, { signal: skipAbortRef.current.signal })
      if (!response.ok) { console.warn('[AudioContext] skipTrack fetch failed:', response.status); return }
      const data = await response.json()
      if (data.videos && data.videos.length > 0 && isMountedRef.current) {
        const randomVideo = data.videos[Math.floor(Math.random() * data.videos.length)]
        setBgMusicVideoId(randomVideo.youtubeId)
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      console.warn('[AudioContext] skipTrack fetch error:', e)
    }
  }, [musicGenre])

  const toggleMute = useCallback(() => {
    if (!bgMusicPlayerRef.current) return
    try {
      if (bgMusicPlayerRef.current.isMuted()) {
        bgMusicPlayerRef.current.unMute()
        bgMusicPlayerRef.current.setVolume(30)
        setIsMuted(false)
      } else {
        bgMusicPlayerRef.current.mute()
        setIsMuted(true)
      }
    } catch (e) {
      console.error('[AudioContext] Mute toggle error:', e)
    }
  }, [])

  const value = useMemo<AudioContextType>(() => ({
    musicEnabled,
    setMusicEnabled,
    musicGenre,
    setMusicGenre,
    isMusicPlaying,
    isMusicLoaded,
    isSessionActive,
    setSessionActive,
    pauseMusic,
    resumeMusic,
    stopMusic,
    skipTrack,
    toggleMute,
    isMuted,
    lastPlayed,
    setLastPlayed,
    clearLastPlayed,
  }), [
    musicEnabled,
    setMusicEnabled,
    musicGenre,
    isMusicPlaying,
    isMusicLoaded,
    isSessionActive,
    isMuted,
    pauseMusic,
    resumeMusic,
    stopMusic,
    skipTrack,
    toggleMute,
    lastPlayed,
    setLastPlayed,
    clearLastPlayed,
  ])

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  )
}
