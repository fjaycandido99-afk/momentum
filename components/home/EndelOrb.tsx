'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause } from 'lucide-react'

// Import shared mode config from EndelPlayer
import { ENDEL_MODES } from '@/components/player/EndelPlayer'

interface EndelOrbProps {
  mode: 'focus' | 'relax' | 'sleep' | 'energy'
  isPlaying: boolean
  onTogglePlay: () => void
}

export function EndelOrb({ mode, isPlaying, onTogglePlay }: EndelOrbProps) {
  const [pulseScale, setPulseScale] = useState(1)
  const [breathPhase, setBreathPhase] = useState(0)
  const animationRef = useRef<number>()

  const config = ENDEL_MODES[mode]

  // Organic breathing animation for the orb
  useEffect(() => {
    if (!isPlaying) {
      setPulseScale(1)
      setBreathPhase(0)
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

  return (
    <div className="relative animate-scale-in">
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
        onClick={onTogglePlay}
        className="relative w-56 h-56 rounded-full flex items-center justify-center transition-transform duration-500 press-scale"
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
