'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, X, ChevronDown } from 'lucide-react'

interface EndelPlayerProps {
  mode: 'focus' | 'relax' | 'sleep' | 'energy'
  onClose: () => void
}

// Mode configurations - clean atmospheric theme (exported for EndelOrb and ImmersiveHome)
export const ENDEL_MODES = {
  focus: {
    title: 'Focus',
    subtitle: 'Deep concentration',
    colors: ['#08080c', '#0c0c10', '#08080c'],
    orbColor: 'rgba(245, 245, 250, 0.5)',
    orbGlow: 'rgba(245, 245, 250, 0.15)',
    sounds: [
      { id: 'rain', youtubeId: 'mPZkdNFkNps', label: 'Rain' },
      { id: 'lofi', youtubeId: 'jfKfPfyJRdk', label: 'Lo-Fi' },
    ],
  },
  relax: {
    title: 'Relax',
    subtitle: 'Calm your mind',
    colors: ['#08080c', '#0c0c10', '#08080c'],
    orbColor: 'rgba(245, 245, 250, 0.45)',
    orbGlow: 'rgba(245, 245, 250, 0.12)',
    sounds: [
      { id: 'ocean', youtubeId: 'WHPEKLQID4U', label: 'Ocean' },
      { id: 'forest', youtubeId: 'xNN7iTA57jM', label: 'Forest' },
    ],
  },
  sleep: {
    title: 'Sleep',
    subtitle: 'Drift away',
    colors: ['#06060a', '#08080c', '#06060a'],
    orbColor: 'rgba(245, 245, 250, 0.35)',
    orbGlow: 'rgba(245, 245, 250, 0.08)',
    sounds: [
      { id: 'night', youtubeId: 'asSd6BOCmEY', label: 'Night' },
      { id: 'rain', youtubeId: 'mPZkdNFkNps', label: 'Rain' },
    ],
  },
  energy: {
    title: 'Energy',
    subtitle: 'Power up',
    colors: ['#08080c', '#0c0c10', '#08080c'],
    orbColor: 'rgba(255, 255, 255, 0.55)',
    orbGlow: 'rgba(255, 255, 255, 0.18)',
    sounds: [
      { id: 'upbeat', youtubeId: 'jfKfPfyJRdk', label: 'Beats' },
    ],
  },
}

export function EndelPlayer({ mode, onClose }: EndelPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [pulseScale, setPulseScale] = useState(1)
  const [breathPhase, setBreathPhase] = useState(0)
  const animationRef = useRef<number>()

  const config = ENDEL_MODES[mode]

  // Start playing automatically
  useEffect(() => {
    const timer = setTimeout(() => setIsPlaying(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Organic breathing animation for the orb
  useEffect(() => {
    if (!isPlaying) {
      setPulseScale(1)
      return
    }

    let startTime = performance.now()

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000

      // Slow, organic breathing rhythm (4 second cycle)
      const breathCycle = Math.sin(elapsed * Math.PI / 2) * 0.5 + 0.5

      // Add subtle random variation
      const variation = Math.sin(elapsed * 1.7) * 0.02 + Math.sin(elapsed * 2.3) * 0.015

      setPulseScale(1 + breathCycle * 0.15 + variation)
      setBreathPhase(breathCycle)

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying])

  const togglePlay = () => setIsPlaying(!isPlaying)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        backgroundColor: '#000000',
        backgroundImage: `linear-gradient(180deg, ${config.colors[0]} 0%, ${config.colors[1]} 50%, ${config.colors[2]} 100%)`,
      }}
    >
      {/* Hidden YouTube player for audio */}
      {isPlaying && config.sounds[0] && (
        <div className="absolute -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${config.sounds[0].youtubeId}?autoplay=1&loop=1&playlist=${config.sounds[0].youtubeId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="w-[1px] h-[1px]"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-6 pt-12 animate-fade-in-down">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ChevronDown className="w-6 h-6 text-white/80" />
        </button>

        <div className="text-center">
          <h1 className="text-white text-lg font-medium">{config.title}</h1>
          <p className="text-white/80 text-sm">{config.subtitle}</p>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6 text-white/80" />
        </button>
      </div>

      {/* Main orb area */}
      <div className="flex-1 flex items-center justify-center animate-scale-in">
        <div className="relative">
          {/* Outer glow layers */}
          <div
            className="absolute inset-0 rounded-full blur-[100px] transition-transform duration-1000"
            style={{
              background: config.orbGlow,
              transform: `scale(${pulseScale * 2})`,
              opacity: 0.3 + breathPhase * 0.2,
            }}
          />
          <div
            className="absolute inset-0 rounded-full blur-[60px] transition-transform duration-700"
            style={{
              background: config.orbGlow,
              transform: `scale(${pulseScale * 1.5})`,
              opacity: 0.4 + breathPhase * 0.2,
            }}
          />

          {/* Main orb */}
          <button
            onClick={togglePlay}
            className="relative w-56 h-56 rounded-full flex items-center justify-center transition-transform duration-500"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${config.orbColor}, transparent 70%)`,
              boxShadow: `
                0 0 60px ${config.orbGlow},
                0 0 120px ${config.orbGlow},
                inset 0 0 60px rgba(255,255,255,0.1)
              `,
              transform: `scale(${pulseScale})`,
            }}
          >
            {/* Inner highlight */}
            <div
              className="absolute w-32 h-32 rounded-full opacity-30"
              style={{
                background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.4), transparent 60%)',
              }}
            />

            {/* Play/Pause icon */}
            <div className="relative z-10 text-white/80">
              {isPlaying ? (
                <Pause className="w-12 h-12" strokeWidth={1.5} />
              ) : (
                <Play className="w-12 h-12 ml-1" strokeWidth={1.5} />
              )}
            </div>
          </button>

          {/* Orbiting particles */}
          {isPlaying && (
            <>
              <div
                className="absolute w-2 h-2 rounded-full bg-white/30"
                style={{
                  animation: 'orbit 8s linear infinite',
                  top: '50%',
                  left: '50%',
                  transformOrigin: '0 0',
                }}
              />
              <div
                className="absolute w-1.5 h-1.5 rounded-full bg-white/20"
                style={{
                  animation: 'orbit 12s linear infinite reverse',
                  top: '50%',
                  left: '50%',
                  transformOrigin: '0 0',
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Bottom info */}
      <div className="p-8 text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <p className="text-white/50 text-sm">
          {isPlaying ? 'Tap orb to pause' : 'Tap orb to play'}
        </p>
      </div>

      {/* CSS for orbiting animation */}
      <style jsx>{`
        @keyframes orbit {
          from {
            transform: rotate(0deg) translateX(140px) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateX(140px) rotate(-360deg);
          }
        }
      `}</style>
    </div>
  )
}
