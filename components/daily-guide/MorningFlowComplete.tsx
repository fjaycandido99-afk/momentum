'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Sparkles, Star, X } from 'lucide-react'

interface MorningFlowCompleteProps {
  isOpen: boolean
  onClose: () => void
  modulesCompleted: number
}

export function MorningFlowComplete({ isOpen, onClose, modulesCompleted }: MorningFlowCompleteProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiPieces, setConfettiPieces] = useState<Array<{
    id: number
    left: number
    delay: number
    color: string
    size: number
    rotation: number
  }>>([])

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true)

      // Generate confetti pieces
      const colors = [
        'rgb(34, 197, 94)', // green
        'rgb(250, 204, 21)', // yellow
        'rgb(96, 165, 250)', // blue
        'rgb(251, 146, 60)', // orange
        'rgb(192, 132, 252)', // purple
        'rgb(251, 113, 133)', // pink
      ]

      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
      }))

      setConfettiPieces(pieces)

      // Auto close after animation
      const timer = setTimeout(() => {
        onClose()
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              className="absolute animate-confetti-fall"
              style={{
                left: `${piece.left}%`,
                animationDelay: `${piece.delay}s`,
                top: '-20px',
              }}
            >
              <div
                className="rounded-sm"
                style={{
                  width: piece.size,
                  height: piece.size,
                  backgroundColor: piece.color,
                  transform: `rotate(${piece.rotation}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm mx-4 animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-4 h-4 text-white/95" />
        </button>

        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/20 via-white/[0.08] to-white/[0.03] border border-emerald-500/30 overflow-hidden p-8 text-center">
          {/* Animated Icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div
              className="absolute inset-2 rounded-full bg-emerald-500/30 animate-ping"
              style={{ animationDelay: '0.2s' }}
            />
            <div
              className="absolute inset-4 rounded-full bg-emerald-500/40 animate-ping"
              style={{ animationDelay: '0.4s' }}
            />

            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Floating sparkles */}
            <Sparkles
              className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse"
            />
            <Star
              className="absolute -bottom-1 -left-3 w-5 h-5 text-amber-400 animate-bounce"
              style={{ animationDelay: '0.3s' }}
            />
            <Sparkles
              className="absolute top-1/2 -right-4 w-4 h-4 text-emerald-300 animate-pulse"
              style={{ animationDelay: '0.5s' }}
            />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2">
            Morning Complete!
          </h2>

          {/* Subtitle */}
          <p className="text-white/95 mb-4">
            You crushed your morning routine
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-400">{modulesCompleted}</p>
              <p className="text-xs text-white/95 uppercase tracking-wide">Modules</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">100%</p>
              <p className="text-xs text-white/95 uppercase tracking-wide">Complete</p>
            </div>
          </div>

          {/* Encouragement message */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm text-white/95">
              You're building momentum! Keep this energy going throughout your day.
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={onClose}
            className="mt-6 px-6 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-medium transition-all"
          >
            Continue Your Day
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall 3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
