'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Volume2, VolumeX } from 'lucide-react'

interface AudioSoundPlayerProps {
  title: string
  audioUrl?: string
  youtubeId?: string
  color: string
  author?: string
  onClose: () => void
}

export function AudioSoundPlayer({
  title,
  audioUrl,
  youtubeId,
  color,
  author,
  onClose
}: AudioSoundPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bars, setBars] = useState<number[]>(Array(50).fill(8))
  const [isMuted, setIsMuted] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number>()
  const sourceCreatedRef = useRef(false)

  // Initialize audio with Web Audio API for real visualization
  useEffect(() => {
    if (!audioUrl) return

    const audio = new Audio(audioUrl)
    audio.crossOrigin = 'anonymous'
    audio.loop = true
    audioRef.current = audio

    const initAudio = async () => {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        audioContextRef.current = audioContext

        // Create analyser
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 128
        analyser.smoothingTimeConstant = 0.8
        analyserRef.current = analyser

        // Connect audio to analyser (only once)
        if (!sourceCreatedRef.current) {
          const source = audioContext.createMediaElementSource(audio)
          source.connect(analyser)
          analyser.connect(audioContext.destination)
          sourceCreatedRef.current = true
        }

        // Start playing
        await audio.play()
        setIsPlaying(true)

        // Start visualization
        visualize()
      } catch (error) {
        console.error('Audio init error:', error)
        // Fallback to fake visualization
        setIsPlaying(true)
        fakeVisualize()
      }
    }

    // Small delay to ensure component is mounted
    const timer = setTimeout(initAudio, 500)

    return () => {
      clearTimeout(timer)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [audioUrl])

  // Real visualization using analyser data
  const visualize = () => {
    if (!analyserRef.current) return

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      analyser.getByteFrequencyData(dataArray)

      // Map frequency data to bar heights
      const newBars = Array(50).fill(0).map((_, i) => {
        const index = Math.floor((i / 50) * bufferLength)
        const value = dataArray[index] || 0
        // Scale to reasonable height (8-120px)
        return 8 + (value / 255) * 112
      })

      setBars(newBars)
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()
  }

  // Fake visualization fallback
  const fakeVisualize = () => {
    let phase = 0
    const animate = () => {
      phase += 0.05
      const newBars = Array(50).fill(0).map((_, i) => {
        const wave = Math.sin(phase + i * 0.2) * 30
        const random = Math.random() * 20
        return 20 + wave + random
      })
      setBars(newBars)
      animationRef.current = requestAnimationFrame(animate)
    }
    animate()
  }

  // Handle mute toggle
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted
      setIsMuted(!isMuted)
    }
  }

  // If using YouTube fallback
  if (youtubeId && !audioUrl) {
    return (
      <div className={`fixed inset-0 z-50 bg-gradient-to-b ${color} overflow-hidden`}>
        {/* Hidden YouTube player for audio */}
        <div className="absolute -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=0&loop=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="w-[1px] h-[1px]"
          />
        </div>

        <PlayerUI
          title={title}
          author={author}
          bars={bars}
          isPlaying={true}
          onClose={onClose}
        />
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 z-50 bg-gradient-to-b ${color} overflow-hidden`}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={toggleMute}
          className="p-3 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-white" />
          ) : (
            <Volume2 className="w-6 h-6 text-white" />
          )}
        </button>
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      <PlayerUI
        title={title}
        author={author}
        bars={bars}
        isPlaying={isPlaying}
        onClose={onClose}
      />
    </div>
  )
}

function PlayerUI({
  title,
  author,
  bars,
  isPlaying,
}: {
  title: string
  author?: string
  bars: number[]
  isPlaying: boolean
  onClose: () => void
}) {
  return (
    <>
      {/* Main content */}
      <div className="h-full flex flex-col items-center justify-center px-8">
        {/* Title */}
        <div className="mb-16 text-center">
          <h1
            className="text-5xl md:text-7xl font-black text-white uppercase tracking-widest"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}
          >
            {title}
          </h1>
          {author && (
            <p className="mt-4 text-white/50 text-sm">by {author}</p>
          )}
        </div>

        {/* Soundwave visualizer */}
        <div className="flex items-center justify-center gap-[2px] h-48">
          {bars.map((height, i) => (
            <div
              key={i}
              className="w-1.5 md:w-2 rounded-full transition-all duration-75"
              style={{
                height: `${height}px`,
                opacity: 0.5 + (height / 200),
                backgroundColor: `rgba(255, 255, 255, ${0.6 + (height / 250)})`,
                boxShadow: height > 60 ? '0 0 10px rgba(255,255,255,0.3)' : 'none',
              }}
            />
          ))}
        </div>

        {/* Status */}
        <div className="mt-16 text-white/50 text-sm">
          {isPlaying ? 'Now playing...' : 'Loading...'}
        </div>
      </div>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-[100px]" />
      </div>
    </>
  )
}
