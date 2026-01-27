'use client'

import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, ReactNode } from 'react'
import type { YTPlayer } from '@/lib/youtube-types'

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

export function AudioProvider({ children }: AudioProviderProps) {
  const [musicEnabled, setMusicEnabledState] = useState(false)
  const [musicGenre, setMusicGenre] = useState<string | null>(null)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [isMusicLoaded, setIsMusicLoaded] = useState(false)
  const [isSessionActive, setSessionActive] = useState(false)
  const [bgMusicVideoId, setBgMusicVideoId] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)

  const bgMusicPlayerRef = useRef<YTPlayer | null>(null)
  const isMountedRef = useRef(true)
  const userPausedRef = useRef(false)
  const musicEnabledRef = useRef(false)

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

  // Resume music when session ends
  useEffect(() => {
    if (!isSessionActive && musicEnabled && bgMusicPlayerRef.current && isMusicLoaded) {
      try {
        bgMusicPlayerRef.current.playVideo()
        setIsMusicPlaying(true)
      } catch (e) {}
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
        } catch (e) {}
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
        userPausedRef.current = true
        setSessionActive(true)
        bgMusicPlayerRef.current.pauseVideo()
        setIsMusicPlaying(false)
      } catch (e) {
        console.error('[AudioContext] Pause error:', e)
      }
    }
  }, [])

  const resumeMusic = useCallback(() => {
    userPausedRef.current = false
    setSessionActive(false)

    if (bgMusicPlayerRef.current && musicEnabled) {
      try {
        bgMusicPlayerRef.current.playVideo()
        setIsMusicPlaying(true)
      } catch (e) {
        console.error('[AudioContext] Resume error:', e)
      }
    }
  }, [musicEnabled])

  const stopMusic = useCallback(() => {
    if (bgMusicPlayerRef.current) {
      try {
        bgMusicPlayerRef.current.stopVideo()
        setIsMusicPlaying(false)
      } catch (e) {}
    }
  }, [])

  const skipTrack = useCallback(async () => {
    if (!musicGenre) return
    userPausedRef.current = false
    setSessionActive(false)
    try {
      // Destroy current player
      if (bgMusicPlayerRef.current) {
        try {
          bgMusicPlayerRef.current.stopVideo()
          bgMusicPlayerRef.current.destroy()
        } catch (e) {}
        bgMusicPlayerRef.current = null
      }
      const container = document.getElementById('bg-music-player-global')
      if (container) container.remove()

      // Fetch a new random video
      const response = await fetch(`/api/music-videos?genre=${musicGenre}`)
      const data = await response.json()
      if (data.videos && data.videos.length > 0 && isMountedRef.current) {
        const randomVideo = data.videos[Math.floor(Math.random() * data.videos.length)]
        setBgMusicVideoId(randomVideo.youtubeId)
      }
    } catch (error) {
      console.error('[AudioContext] Skip error:', error)
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
  ])

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  )
}
