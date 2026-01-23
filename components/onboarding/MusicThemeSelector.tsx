'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Check, ChevronRight, Loader2, Volume2 } from 'lucide-react'
import { MUSIC_SAMPLES, MUSIC_GENRE_INFO } from '@/lib/music-samples'
import { GENRE_THEMES } from '@/lib/theme/music-theme'

interface MusicThemeSelectorProps {
  onSelect: (genre: string) => void
  onSkip?: () => void
  isLoading?: boolean
  initialGenre?: string | null
}

export function MusicThemeSelector({
  onSelect,
  onSkip,
  isLoading = false,
  initialGenre = null,
}: MusicThemeSelectorProps) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(initialGenre)
  const [playingGenre, setPlayingGenre] = useState<string | null>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const playerRef = useRef<YT.Player | null>(null)
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load YouTube IFrame API
  useEffect(() => {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      setIsPlayerReady(true)
      return
    }

    // Load the API
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

    // Set up callback
    window.onYouTubeIframeAPIReady = () => {
      setIsPlayerReady(true)
    }

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
    }
  }, [])

  // Create or update player when genre changes
  useEffect(() => {
    if (!isPlayerReady || !playingGenre) return

    const sample = MUSIC_SAMPLES[playingGenre]
    if (!sample) return

    // Destroy existing player
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }

    // Create new player
    playerRef.current = new window.YT.Player('youtube-player', {
      height: '0',
      width: '0',
      videoId: sample.youtubeId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: (event: YT.PlayerEvent) => {
          event.target.playVideo()
        },
        onStateChange: (event: YT.OnStateChangeEvent) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            // Stop after preview duration
            if (previewTimeoutRef.current) {
              clearTimeout(previewTimeoutRef.current)
            }
            previewTimeoutRef.current = setTimeout(() => {
              stopPreview()
            }, sample.previewDuration * 1000)
          }
        },
      },
    })

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
    }
  }, [playingGenre, isPlayerReady])

  const stopPreview = () => {
    if (playerRef.current) {
      playerRef.current.stopVideo()
      playerRef.current.destroy()
      playerRef.current = null
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }
    setPlayingGenre(null)
  }

  const togglePreview = (genre: string) => {
    if (playingGenre === genre) {
      stopPreview()
    } else {
      stopPreview()
      setPlayingGenre(genre)
    }
  }

  const handleSelect = (genre: string) => {
    setSelectedGenre(genre)
  }

  const handleContinue = () => {
    if (selectedGenre) {
      stopPreview()
      onSelect(selectedGenre)
    }
  }

  const genres = Object.keys(MUSIC_SAMPLES)

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col" ref={containerRef}>
      {/* Hidden YouTube Player */}
      <div id="youtube-player" className="hidden" />

      {/* Header */}
      <div className="px-6 pt-12 pb-6 text-center">
        <h1 className="text-2xl font-semibold text-white mb-2">Choose Your Vibe</h1>
        <p className="text-white/60 text-sm">Your app will match your style</p>
      </div>

      {/* Genre Grid */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {genres.map((genre) => {
            const info = MUSIC_GENRE_INFO[genre]
            const theme = GENRE_THEMES[genre]
            const sample = MUSIC_SAMPLES[genre]
            const isSelected = selectedGenre === genre
            const isPlaying = playingGenre === genre
            const previewBg = theme?.backgrounds?.[0] || `/backgrounds/${genre}/${genre}1.jpg`

            return (
              <div
                key={genre}
                onClick={() => handleSelect(genre)}
                className={`
                  relative overflow-hidden rounded-2xl cursor-pointer transition-all
                  ${isSelected
                    ? 'ring-2 ring-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                    : 'ring-1 ring-white/10 hover:ring-white/20'
                  }
                `}
              >
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${previewBg})` }}
                />
                <div className="absolute inset-0 bg-black/50" />

                {/* Content */}
                <div className="relative p-4 h-36 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-lg">{info?.name || genre}</h3>
                    <p className="text-white/70 text-xs mt-0.5">{info?.tagline}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Preview Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePreview(genre)
                      }}
                      disabled={!isPlayerReady}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                        transition-all
                        ${isPlaying
                          ? 'bg-white text-black'
                          : 'bg-white/20 text-white hover:bg-white/30'
                        }
                        disabled:opacity-50
                      `}
                    >
                      {isPlaying ? (
                        <>
                          <Volume2 className="w-3 h-3 animate-pulse" />
                          Playing...
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          Preview
                        </>
                      )}
                    </button>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                        <Check className="w-4 h-4 text-black" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f] to-transparent">
        <button
          onClick={handleContinue}
          disabled={!selectedGenre || isLoading}
          className={`
            w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-medium
            transition-all
            ${selectedGenre
              ? 'bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.3)]'
              : 'bg-white/10 text-white/50 cursor-not-allowed'
            }
            disabled:opacity-50
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              Continue with {selectedGenre ? MUSIC_GENRE_INFO[selectedGenre]?.name : '...'}
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            disabled={isLoading}
            className="w-full mt-3 py-3 text-white/50 text-sm hover:text-white/70 transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}

// Add YouTube IFrame API types
declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: () => void
  }

  namespace YT {
    class Player {
      constructor(elementId: string, options: PlayerOptions)
      playVideo(): void
      pauseVideo(): void
      stopVideo(): void
      destroy(): void
    }

    interface PlayerOptions {
      height?: string | number
      width?: string | number
      videoId?: string
      playerVars?: PlayerVars
      events?: {
        onReady?: (event: PlayerEvent) => void
        onStateChange?: (event: OnStateChangeEvent) => void
        onError?: (event: OnErrorEvent) => void
      }
    }

    interface PlayerVars {
      autoplay?: 0 | 1
      controls?: 0 | 1
      disablekb?: 0 | 1
      fs?: 0 | 1
      modestbranding?: 0 | 1
      rel?: 0 | 1
      showinfo?: 0 | 1
      start?: number
      end?: number
    }

    interface PlayerEvent {
      target: Player
    }

    interface OnStateChangeEvent {
      target: Player
      data: PlayerState
    }

    interface OnErrorEvent {
      target: Player
      data: number
    }

    enum PlayerState {
      UNSTARTED = -1,
      ENDED = 0,
      PLAYING = 1,
      PAUSED = 2,
      BUFFERING = 3,
      CUED = 5,
    }
  }
}
