'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Pause, Play, RotateCcw, Volume2, VolumeX, Check, Music, Crown, Clock } from 'lucide-react'
import type { YTPlayer } from '@/lib/youtube-types'
import '@/lib/youtube-types' // Import for global Window.YT declaration
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { useThemeOptional } from '@/contexts/ThemeContext'
import { Capacitor } from '@capacitor/core'
import { NativeAudio } from '@capacitor-community/native-audio'
import { App } from '@capacitor/app'

// Check if running in native app
const isNativePlatform = Capacitor.isNativePlatform()

// Free tier time limit in seconds (10 minutes)
const FREE_TIER_TIME_LIMIT = 10 * 60

interface GuidancePlayerProps {
  segment: string
  script: string
  audioBase64: string | null
  duration: number
  withMusic?: boolean
  musicGenre?: string
  onClose: () => void
  onComplete: () => void
}

const segmentConfig: Record<string, {
  label: string
  gradient: string
}> = {
  // Legacy segments
  morning: {
    label: 'Morning Guidance',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  midday: {
    label: 'Midday Check-in',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  afternoon: {
    label: 'Afternoon Guidance',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  evening: {
    label: 'Evening Close',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  // New module types
  morning_prime: {
    label: 'Morning Greeting',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  movement: {
    label: 'Quote of the Day',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  workout: {
    label: 'Quote of the Day',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  breath: {
    label: 'Breath',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  micro_lesson: {
    label: 'Motivation Video',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  day_close: {
    label: 'Day Close',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  checkpoint_1: {
    label: 'Checkpoint',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  checkpoint_2: {
    label: 'Checkpoint',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  checkpoint_3: {
    label: 'Checkpoint',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  tomorrow_preview: {
    label: 'Tomorrow Preview',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  // Student-specific segments
  pre_study: {
    label: 'Pre-Study Focus',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  study_break: {
    label: 'Study Break',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
  exam_calm: {
    label: 'Exam Calm',
    gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
  },
}

// Default config for unknown segments
const defaultConfig = {
  label: 'Guidance',
  gradient: 'from-[#0c0c10] via-[#08080c] to-[#050508]',
}

// Genre labels for display
const genreLabels: Record<string, string> = {
  lofi: 'Lo-Fi',
  piano: 'Piano',
  jazz: 'Jazz',
  classical: 'Classical',
  ambient: 'Ambient',
  study: 'Study',
}

// Cache for fetched background images per genre
const backgroundsCache: Map<string, string[]> = new Map()

// Fetch and get a random background for a genre from Supabase Storage
async function fetchBackgroundsForGenre(genre: string): Promise<string[]> {
  // Check cache first
  if (backgroundsCache.has(genre)) {
    console.log(`[Backgrounds] Using cached ${genre}:`, backgroundsCache.get(genre)!.length, 'images')
    return backgroundsCache.get(genre)!
  }

  try {
    console.log(`[Backgrounds] Fetching ${genre} from API...`)
    const response = await fetch(`/api/backgrounds?genre=${genre}`)
    if (response.ok) {
      const data = await response.json()
      const urls = data.images?.map((img: { url: string }) => img.url) || []
      console.log(`[Backgrounds] Got ${urls.length} images for ${genre}`)
      if (urls.length > 0) {
        console.log(`[Backgrounds] Sample URL:`, urls[0])
      }
      backgroundsCache.set(genre, urls)
      return urls
    } else {
      console.error(`[Backgrounds] API error for ${genre}:`, response.status)
    }
  } catch (error) {
    console.error('[Backgrounds] Fetch error:', error)
  }
  return []
}

export function GuidancePlayer({
  segment,
  script,
  audioBase64,
  duration,
  withMusic = false,
  musicGenre,
  onClose,
  onComplete,
}: GuidancePlayerProps) {
  const subscription = useSubscriptionOptional()
  const isPremium = subscription?.isPremium ?? false
  const themeContext = useThemeOptional()

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isMusicMuted, setIsMusicMuted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [musicLoaded, setMusicLoaded] = useState(false)
  const [musicYoutubeId, setMusicYoutubeId] = useState<string | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [musicVolume, setMusicVolume] = useState(30) // Default music volume (0-100)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [showTimeLimitReached, setShowTimeLimitReached] = useState(false)

  // Volume levels for ducking
  const DUCKED_VOLUME = 15 // Volume when voice is playing (ducked)
  const NORMAL_VOLUME = musicVolume // User's preferred volume

  // Set background image based on music genre - use ThemeContext or fetch from API
  useEffect(() => {
    console.log('[GuidancePlayer] musicGenre:', musicGenre, 'themeContext:', !!themeContext)

    // Try to use ThemeContext first (if genre matches)
    if (themeContext && themeContext.genre === musicGenre && themeContext.backgroundImages.length > 0) {
      const bg = themeContext.getRandomBackground()
      console.log('[GuidancePlayer] Using ThemeContext background:', bg)
      if (bg && !bg.startsWith('linear-gradient')) {
        setBackgroundImage(bg)
        return
      }
    }

    // Otherwise fetch from API
    if (musicGenre) {
      fetchBackgroundsForGenre(musicGenre).then((backgrounds) => {
        console.log('[GuidancePlayer] fetched backgrounds:', backgrounds.length, 'images')
        if (backgrounds.length > 0) {
          const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)]
          console.log('[GuidancePlayer] setting background:', randomBg)
          setBackgroundImage(randomBg)
        } else {
          console.log('[GuidancePlayer] No backgrounds found for genre:', musicGenre)
        }
      })
    }
  }, [musicGenre, themeContext])

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const musicPlayerRef = useRef<YTPlayer | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const playerContainerRef = useRef<HTMLDivElement | null>(null)
  const nativeAudioId = useRef(`guidance-${segment}-${Date.now()}`)
  const nativeAudioLoadedRef = useRef(false)

  const config = segmentConfig[segment] || defaultConfig
  const totalDuration = duration || 45

  // Handle app state changes for native background playback
  useEffect(() => {
    if (!isNativePlatform) return

    const listener = App.addListener('appStateChange', ({ isActive }) => {
      console.log(`[GuidancePlayer] App state: ${isActive ? 'foreground' : 'background'}`)
      // Native audio continues in background automatically
    })

    return () => {
      listener.remove()
    }
  }, [])

  // Load YouTube IFrame API
  useEffect(() => {
    if (!withMusic) return

    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      return
    }

    // Load the IFrame Player API code asynchronously
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
  }, [withMusic])

  // Fetch music video for background
  useEffect(() => {
    if (withMusic && musicGenre) {
      const fetchMusic = async () => {
        try {
          const response = await fetch(`/api/music-videos?genre=${musicGenre}`)
          const data = await response.json()
          if (data.videos && data.videos.length > 0) {
            // Pick a random video from the results
            const randomVideo = data.videos[Math.floor(Math.random() * data.videos.length)]
            setMusicYoutubeId(randomVideo.youtubeId)
          }
        } catch (error) {
          console.error('Failed to fetch background music:', error)
        }
      }
      fetchMusic()
    }
  }, [withMusic, musicGenre])

  // Create YouTube player when video ID is ready
  useEffect(() => {
    if (!musicYoutubeId || !withMusic) return

    const createPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        // API not ready yet, wait
        setTimeout(createPlayer, 100)
        return
      }

      // Create container if needed
      const containerId = 'youtube-music-player'
      let container = document.getElementById(containerId)
      if (!container) {
        container = document.createElement('div')
        container.id = containerId
        container.style.position = 'absolute'
        container.style.width = '1px'
        container.style.height = '1px'
        container.style.opacity = '0'
        container.style.pointerEvents = 'none'
        document.body.appendChild(container)
      }

      // Destroy existing player
      if (musicPlayerRef.current) {
        try {
          musicPlayerRef.current.destroy()
        } catch (e) {
          // Ignore errors
        }
      }

      // Create new player
      musicPlayerRef.current = new window.YT.Player(containerId, {
        videoId: musicYoutubeId,
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: musicYoutubeId,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            // Set initial volume (ducked if voice is playing)
            const initialVolume = isPlaying ? DUCKED_VOLUME : musicVolume
            event.target.setVolume(initialVolume)
            if (isMusicMuted) {
              event.target.mute()
            }
            // Explicitly call playVideo to start playback (helps with autoplay restrictions)
            event.target.playVideo()
            setMusicLoaded(true)
          },
          onStateChange: (event) => {
            // If video is paused/ended unexpectedly, try to restart
            if (event.data === 0 || event.data === 2) { // 0 = ended, 2 = paused
              event.target.playVideo()
            }
          },
          onError: (event) => {
            console.error('YouTube player error:', event.data)
            // Try fallback video if current one fails
            if (event.data === 150 || event.data === 101) {
              // Video not embeddable - this is common for live streams
              console.log('Video not embeddable, music playback unavailable')
            }
          },
        },
      })
    }

    createPlayer()

    return () => {
      if (musicPlayerRef.current) {
        try {
          musicPlayerRef.current.destroy()
        } catch (e) {
          // Ignore errors
        }
        musicPlayerRef.current = null
      }
      // Remove the container div to ensure fresh state for next player
      const container = document.getElementById('youtube-music-player')
      if (container) {
        container.remove()
      }
    }
  }, [musicYoutubeId, withMusic])

  // Duck/unduck music volume based on voice playing state
  useEffect(() => {
    if (!musicPlayerRef.current || !musicLoaded || isMusicMuted) return

    try {
      if (isPlaying && !isCompleted) {
        // Voice is playing - duck the music
        musicPlayerRef.current.setVolume(DUCKED_VOLUME)
      } else {
        // Voice is not playing - restore volume
        musicPlayerRef.current.setVolume(musicVolume)
      }
    } catch (e) {
      // Player might not be ready
    }
  }, [isPlaying, isCompleted, musicLoaded, isMusicMuted, musicVolume])

  // Update music volume when user changes it
  useEffect(() => {
    if (!musicPlayerRef.current || !musicLoaded || isMusicMuted) return

    try {
      // Only set to user volume if voice is not playing
      if (!isPlaying || isCompleted) {
        musicPlayerRef.current.setVolume(musicVolume)
      }
    } catch (e) {
      // Player might not be ready
    }
  }, [musicVolume, musicLoaded, isMusicMuted])

  // Create audio element from base64 - use native audio on native platforms
  useEffect(() => {
    const audioId = nativeAudioId.current

    const initNativeAudio = async () => {
      if (!audioBase64) return false

      try {
        // Unload any existing audio with this ID
        await NativeAudio.unload({ assetId: audioId }).catch(() => {})

        // Preload the audio from base64 data URL
        await NativeAudio.preload({
          assetId: audioId,
          assetPath: `data:audio/mpeg;base64,${audioBase64}`,
          audioChannelNum: 1,
          isUrl: true,
        })

        nativeAudioLoadedRef.current = true
        console.log(`[GuidancePlayer] Native audio loaded: ${audioId}`)

        // Play the audio
        await NativeAudio.play({ assetId: audioId, time: 0 })
        setIsPlaying(true)

        // Track time with interval (native doesn't have timeupdate events)
        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            if (prev >= totalDuration) {
              handleAudioEnd()
              return prev
            }
            return prev + 0.1
          })
        }, 100)

        // Listen for completion
        NativeAudio.addListener('complete', (event) => {
          if (event.assetId === audioId) {
            handleAudioEnd()
          }
        })

        return true
      } catch (error) {
        console.error('[GuidancePlayer] Native audio error:', error)
        return false
      }
    }

    const initWebAudio = () => {
      if (audioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`)
        audioRef.current = audio

        audio.addEventListener('ended', handleAudioEnd)
        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime)
        })

        // Auto-play when loaded
        audio.play().then(() => {
          setIsPlaying(true)
        }).catch(console.error)
      } else {
        // No audio - simulate with timer
        setIsPlaying(true)
        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            if (prev >= totalDuration) {
              handleAudioEnd()
              return prev
            }
            return prev + 0.1
          })
        }, 100)
      }
    }

    const init = async () => {
      if (isNativePlatform && audioBase64) {
        // Try native audio first
        const success = await initNativeAudio()
        if (!success) {
          // Fall back to web audio
          console.log('[GuidancePlayer] Falling back to web audio')
          initWebAudio()
        }
      } else {
        // Use web audio
        initWebAudio()
      }
    }

    init()

    return () => {
      // Cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleAudioEnd)
        audioRef.current.pause()
        audioRef.current = null
      }
      if (isNativePlatform && nativeAudioLoadedRef.current) {
        NativeAudio.stop({ assetId: audioId }).catch(() => {})
        NativeAudio.unload({ assetId: audioId }).catch(() => {})
        nativeAudioLoadedRef.current = false
      }
    }
  }, [audioBase64, totalDuration])

  const handleAudioEnd = useCallback(() => {
    setIsPlaying(false)
    setIsCompleted(true)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    onComplete()
  }, [onComplete])

  // Check for free tier time limit
  useEffect(() => {
    if (isPremium || showTimeLimitReached) return

    if (currentTime >= FREE_TIER_TIME_LIMIT) {
      // Pause playback
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      setIsPlaying(false)
      setShowTimeLimitReached(true)
    }
  }, [currentTime, isPremium, showTimeLimitReached])

  // Handle close - mark as complete if listened to > 50% of the session
  const handleClose = useCallback(() => {
    const progress = currentTime / totalDuration
    if (progress >= 0.5) {
      // User listened to most of it, mark as complete
      onComplete()
    }
    onClose()
  }, [currentTime, totalDuration, onComplete, onClose])

  const togglePlayPause = async () => {
    const audioId = nativeAudioId.current

    if (isNativePlatform && nativeAudioLoadedRef.current) {
      // Native audio control
      if (isPlaying) {
        await NativeAudio.pause({ assetId: audioId }).catch(console.error)
        if (intervalRef.current) clearInterval(intervalRef.current)
      } else {
        await NativeAudio.resume({ assetId: audioId }).catch(console.error)
        // Resume time tracking
        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            if (prev >= totalDuration) {
              handleAudioEnd()
              return prev
            }
            return prev + 0.1
          })
        }, 100)
      }
      setIsPlaying(!isPlaying)
    } else if (audioBase64 && audioRef.current) {
      // Web audio control
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    } else {
      // Timer-based
      if (isPlaying) {
        if (intervalRef.current) clearInterval(intervalRef.current)
      } else {
        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            if (prev >= totalDuration) {
              handleAudioEnd()
              return prev
            }
            return prev + 0.1
          })
        }, 100)
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = async () => {
    const audioId = nativeAudioId.current

    if (isNativePlatform && nativeAudioLoadedRef.current) {
      // Native audio - toggle volume between 0 and 1
      if (isMuted) {
        await NativeAudio.setVolume({ assetId: audioId, volume: 1 }).catch(console.error)
      } else {
        await NativeAudio.setVolume({ assetId: audioId, volume: 0 }).catch(console.error)
      }
      setIsMuted(!isMuted)
    } else if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted
      setIsMuted(!isMuted)
    }
  }

  const toggleMusicMute = () => {
    const newMuted = !isMusicMuted
    setIsMusicMuted(newMuted)

    if (musicPlayerRef.current) {
      try {
        if (newMuted) {
          musicPlayerRef.current.mute()
        } else {
          musicPlayerRef.current.unMute()
          // Restore appropriate volume
          const volume = isPlaying && !isCompleted ? DUCKED_VOLUME : musicVolume
          musicPlayerRef.current.setVolume(volume)
        }
      } catch (e) {
        // Player might not be ready
      }
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    setMusicVolume(newVolume)
    if (musicPlayerRef.current && !isMusicMuted) {
      try {
        // If voice is playing, don't update immediately (ducking in effect)
        if (!isPlaying || isCompleted) {
          musicPlayerRef.current.setVolume(newVolume)
        }
      } catch (e) {
        // Player might not be ready
      }
    }
  }

  const restart = async () => {
    const audioId = nativeAudioId.current
    setCurrentTime(0)
    setIsCompleted(false)

    if (isNativePlatform && nativeAudioLoadedRef.current) {
      // Native audio - stop and replay from beginning
      await NativeAudio.stop({ assetId: audioId }).catch(() => {})
      await NativeAudio.play({ assetId: audioId, time: 0 }).catch(console.error)

      // Restart time tracking
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalDuration) {
            handleAudioEnd()
            return prev
          }
          return prev + 0.1
        })
      }, 100)
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
    }

    setIsPlaying(true)
  }

  const progress = (currentTime / totalDuration) * 100

  return (
    <div className={`fixed inset-0 z-50 bg-gradient-to-b ${config.gradient}`}>
      {/* Background image based on music genre */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundImage}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide on error
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/60" />
          {/* Gradient overlay for better text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
        </div>
      )}

      {/* YouTube player container is created dynamically in useEffect */}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
        <div>
          <span className="text-white/80 text-sm font-medium">
            {config.label}
          </span>
          {withMusic && musicGenre && (
            <div className="flex items-center gap-1.5 mt-1 text-white/50 text-xs">
              <Music className="w-3 h-3" />
              <span>{genreLabels[musicGenre] || musicGenre}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {withMusic && musicLoaded && (
            <div className="relative">
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  toggleMusicMute()
                }}
                className={`p-2 rounded-full transition-colors ${
                  isMusicMuted ? 'bg-white/5 text-white/40' : 'bg-white/10 hover:bg-white/20'
                }`}
                title="Tap to adjust volume, long press to mute"
              >
                <Music className={`w-4 h-4 ${isMusicMuted ? 'text-white/40' : 'text-white'}`} />
              </button>

              {/* Volume slider popup */}
              {showVolumeSlider && (
                <div className="absolute top-full right-0 mt-2 p-3 rounded-xl bg-black/90 border border-white/20 backdrop-blur-sm z-30 min-w-[160px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/70">Music Volume</span>
                    <button
                      onClick={toggleMusicMute}
                      className="p-1 rounded hover:bg-white/10"
                    >
                      {isMusicMuted ? (
                        <VolumeX className="w-3.5 h-3.5 text-white/50" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVolume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-3.5
                      [&::-webkit-slider-thumb]:h-3.5
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-white
                      [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.5)]
                      [&::-moz-range-thumb]:w-3.5
                      [&::-moz-range-thumb]:h-3.5
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-white
                      [&::-moz-range-thumb]:border-0"
                  />
                  <div className="flex justify-between text-[10px] text-white/40 mt-1">
                    <span>0</span>
                    <span>{musicVolume}%</span>
                    <span>100</span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-2 text-center">
                    Auto-ducks when voice plays
                  </p>
                </div>
              )}
            </div>
          )}
          {audioBase64 && (
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Toggle voice audio"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
          )}
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main content - centered label */}
      <div className="h-full flex flex-col items-center justify-center px-8 pt-16 pb-32 relative z-10">
        <div className="text-center">
          <p className="text-sm text-white/50 uppercase tracking-widest mb-4">
            {config.label}
          </p>
          {isPlaying && !isCompleted && (
            <div className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
              <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          )}
          {isCompleted && (
            <p className="text-white/70 text-lg">Session complete</p>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
        {/* Progress bar */}
        <div className="w-full h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-white/40 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={restart}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={isCompleted ? restart : togglePlayPause}
            className="p-5 rounded-full bg-white/20 hover:bg-white/30 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-float"
          >
            {isCompleted ? (
              <Check className="w-8 h-8 text-white/90" />
            ) : isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>

          <button
            onClick={handleClose}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Time */}
        <div className="text-center mt-4 text-white/60 text-sm">
          {Math.floor(currentTime)}s / {totalDuration}s
        </div>
      </div>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px]" />
      </div>

      {/* Time limit reached overlay for free users */}
      {showTimeLimitReached && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="max-w-sm mx-4 p-6 rounded-2xl bg-gradient-to-b from-[#1a1a24] to-[#0f0f15] border border-white/10">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 mb-4">
                <Clock className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Session Limit Reached
              </h3>
              <p className="text-white/60 text-sm mb-6">
                Free sessions are limited to 10 minutes. Upgrade to Premium for unlimited session duration.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    subscription?.openUpgradeModal()
                    handleClose()
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2"
                >
                  <Crown className="w-5 h-5" />
                  Upgrade to Premium
                </button>
                <button
                  onClick={handleClose}
                  className="w-full py-3 px-4 rounded-xl bg-white/10 text-white/80 font-medium hover:bg-white/15 transition-colors"
                >
                  Close Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
