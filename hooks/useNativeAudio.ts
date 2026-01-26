'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { NativeAudio } from '@capacitor-community/native-audio'
import { App } from '@capacitor/app'

// Check if running in native app
export const isNative = Capacitor.isNativePlatform()

interface UseNativeAudioOptions {
  assetId: string
  audioBase64?: string | null
  audioUrl?: string | null
  onEnded?: () => void
  onTimeUpdate?: (currentTime: number) => void
  autoPlay?: boolean
}

interface UseNativeAudioReturn {
  isPlaying: boolean
  currentTime: number
  duration: number
  play: () => Promise<void>
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  isNative: boolean
}

export function useNativeAudio({
  assetId,
  audioBase64,
  audioUrl,
  onEnded,
  onTimeUpdate,
  autoPlay = false,
}: UseNativeAudioOptions): UseNativeAudioReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Web audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Native audio loaded flag
  const nativeLoadedRef = useRef(false)

  // Clean up function
  const cleanup = useCallback(() => {
    // Stop time tracking
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Clean up web audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }

    // Clean up native audio
    if (isNative && nativeLoadedRef.current) {
      NativeAudio.stop({ assetId }).catch(() => {})
      NativeAudio.unload({ assetId }).catch(() => {})
      nativeLoadedRef.current = false
    }
  }, [assetId])

  // Initialize audio
  useEffect(() => {
    const initAudio = async () => {
      const audioSource = audioBase64
        ? `data:audio/mpeg;base64,${audioBase64}`
        : audioUrl

      if (!audioSource) return

      if (isNative) {
        // Native audio initialization
        try {
          // Unload any existing audio with this ID
          await NativeAudio.unload({ assetId }).catch(() => {})

          // Preload the audio
          await NativeAudio.preload({
            assetId,
            assetPath: audioSource,
            audioChannelNum: 1,
            isUrl: true,
          })

          nativeLoadedRef.current = true
          console.log(`[NativeAudio] Loaded: ${assetId}`)

          // Get duration (native audio doesn't provide this directly, estimate from base64 size)
          // For now, we'll track it as the audio plays
          setDuration(0)

          if (autoPlay) {
            await playNative()
          }
        } catch (error) {
          console.error('[NativeAudio] Load error:', error)
          // Fall back to web audio
          initWebAudio(audioSource)
        }
      } else {
        // Web audio initialization
        initWebAudio(audioSource)
      }
    }

    const initWebAudio = (source: string) => {
      const audio = new Audio(source)
      audioRef.current = audio

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration)
      })

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime)
        onTimeUpdate?.(audio.currentTime)
      })

      audio.addEventListener('ended', () => {
        setIsPlaying(false)
        onEnded?.()
      })

      audio.addEventListener('play', () => {
        setIsPlaying(true)
      })

      audio.addEventListener('pause', () => {
        setIsPlaying(false)
      })

      if (autoPlay) {
        audio.play().catch(console.error)
      }
    }

    initAudio()

    return cleanup
  }, [assetId, audioBase64, audioUrl, autoPlay, cleanup, onEnded, onTimeUpdate])

  // Handle app state changes (background/foreground) for native
  useEffect(() => {
    if (!isNative) return

    let listenerHandle: { remove: () => void } | null = null

    App.addListener('appStateChange', ({ isActive }) => {
      console.log(`[NativeAudio] App state: ${isActive ? 'active' : 'background'}`)
      // Native audio continues playing in background - no action needed
      // The native plugin handles this automatically with proper config
    }).then(handle => {
      listenerHandle = handle
    })

    return () => {
      listenerHandle?.remove()
    }
  }, [])

  // Track time for native audio
  useEffect(() => {
    if (!isNative || !isPlaying) return

    // Poll for current time (native audio doesn't have timeupdate events)
    intervalRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        const newTime = prev + 0.1
        onTimeUpdate?.(newTime)
        return newTime
      })
    }, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isNative, isPlaying, onTimeUpdate])

  // Native play function
  const playNative = async () => {
    if (!nativeLoadedRef.current) return

    try {
      await NativeAudio.play({ assetId, time: currentTime })
      setIsPlaying(true)
      console.log(`[NativeAudio] Playing: ${assetId}`)
    } catch (error) {
      console.error('[NativeAudio] Play error:', error)
    }
  }

  // Play
  const play = useCallback(async () => {
    if (isNative && nativeLoadedRef.current) {
      await playNative()
    } else if (audioRef.current) {
      await audioRef.current.play()
    }
  }, [assetId, currentTime])

  // Pause
  const pause = useCallback(() => {
    if (isNative && nativeLoadedRef.current) {
      NativeAudio.pause({ assetId }).catch(console.error)
      setIsPlaying(false)
    } else if (audioRef.current) {
      audioRef.current.pause()
    }
  }, [assetId])

  // Stop
  const stop = useCallback(() => {
    if (isNative && nativeLoadedRef.current) {
      NativeAudio.stop({ assetId }).catch(console.error)
      setIsPlaying(false)
      setCurrentTime(0)
    } else if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [assetId])

  // Seek
  const seek = useCallback((time: number) => {
    setCurrentTime(time)
    if (isNative && nativeLoadedRef.current) {
      // Native audio seek - stop and replay from position
      NativeAudio.stop({ assetId }).catch(() => {})
      if (isPlaying) {
        NativeAudio.play({ assetId, time }).catch(console.error)
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }, [assetId, isPlaying])

  // Set volume (0-1)
  const setVolume = useCallback((volume: number) => {
    if (isNative && nativeLoadedRef.current) {
      NativeAudio.setVolume({ assetId, volume }).catch(console.error)
    } else if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [assetId])

  return {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    stop,
    seek,
    setVolume,
    isNative,
  }
}

// Hook for background music (loops continuously)
interface UseBackgroundMusicOptions {
  genre: string
  youtubeId?: string | null
  enabled: boolean
  volume?: number
}

export function useBackgroundMusic({
  genre,
  youtubeId,
  enabled,
  volume = 0.3,
}: UseBackgroundMusicOptions) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const assetId = `bg-music-${genre}`

  // For native, we'd need to download the YouTube audio or use a different source
  // For now, we'll continue using YouTube IFrame for music
  // Native audio for music would require audio file URLs

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const setMusicVolume = useCallback((newVolume: number) => {
    // This will be handled by the YouTube player in GuidancePlayer
    // Native implementation would use NativeAudio.setVolume
  }, [])

  return {
    isLoaded,
    isMuted,
    toggleMute,
    setVolume: setMusicVolume,
  }
}
