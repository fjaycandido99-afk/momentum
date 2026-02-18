'use client'

import { useEffect, useState, useMemo } from 'react'
import { X, Zap } from 'lucide-react'
import { RARITY_TEXT, RARITY_COLORS } from '@/lib/achievements'

interface AchievementCelebrationProps {
  achievement: {
    id: string
    title: string
    description: string
    icon: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    xpReward: number
  }
  onClose: () => void
}

const RARITY_GLOW_STYLE: Record<string, string> = {
  common: '0 0 40px rgba(255,255,255,0.06)',
  rare: '0 0 40px rgba(255,255,255,0.12)',
  epic: '0 0 50px rgba(255,255,255,0.18)',
  legendary: '0 0 60px rgba(255,255,255,0.25)',
}

// Rarity-based particle config (black & white only)
const PARTICLE_CONFIG: Record<string, { count: number; opacity: number; glow: string; sizeBoost: number }> = {
  common: { count: 15, opacity: 0.5, glow: 'none', sizeBoost: 0 },
  rare: { count: 20, opacity: 0.7, glow: 'none', sizeBoost: 0 },
  epic: { count: 25, opacity: 0.85, glow: '0 0 4px rgba(255,255,255,0.4)', sizeBoost: 0 },
  legendary: { count: 30, opacity: 0.95, glow: '0 0 6px rgba(255,255,255,0.6)', sizeBoost: 1 },
}

export function AchievementCelebration({ achievement, onClose }: AchievementCelebrationProps) {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  // Generate confetti particles (falling from top — existing style)
  const confettiParticles = useMemo(() => {
    return Array.from({ length: 32 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      size: 3 + Math.random() * 5,
      delay: Math.random() * 0.8,
      color: `rgba(255,255,255,${0.3 + Math.random() * 0.5})`,
      drift: (Math.random() - 0.5) * 60,
    }))
  }, [])

  // Generate burst particles (radial from center)
  const burstParticles = useMemo(() => {
    const config = PARTICLE_CONFIG[achievement.rarity] || PARTICLE_CONFIG.common
    return Array.from({ length: config.count }, (_, i) => ({
      id: i,
      px: (Math.random() - 0.5) * 120, // -60 to 60
      py: (Math.random() - 0.5) * 120,
      size: 2 + Math.random() * 2 + config.sizeBoost,
      opacity: config.opacity,
      glow: config.glow,
    }))
  }, [achievement.rarity])

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))

    // Start fade-out at 3000ms
    const fadeTimer = setTimeout(() => setFadeOut(true), 3000)
    // Close at 3500ms (after 500ms fade-out)
    const closeTimer = setTimeout(onClose, 3500)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(closeTimer)
    }
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={fadeOut ? { animation: 'achievement-fade-out 500ms ease-out forwards' } : undefined}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* White flash overlay */}
      {visible && (
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{ animation: 'achievement-flash 150ms ease-out forwards' }}
        />
      )}

      {/* Confetti (falling from top) */}
      {confettiParticles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: '-8px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animation: `achievement-confetti 2.8s ease-out ${p.delay}s forwards`,
            ['--drift' as string]: `${p.drift}px`,
            opacity: 0,
          }}
        />
      ))}

      {/* Card */}
      <div
        className={`relative z-10 max-w-[280px] w-full mx-6 rounded-2xl border p-6 text-center bg-black
          ${RARITY_COLORS[achievement.rarity]}
          ${visible ? 'animate-achievement-enter' : 'opacity-0 scale-90'}
        `}
        style={{ boxShadow: RARITY_GLOW_STYLE[achievement.rarity] }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg text-white/50 hover:text-white/75 hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="text-[10px] text-white/60 uppercase tracking-[0.2em] font-medium mb-4">Achievement Unlocked</p>

        {/* Icon with staged reveal */}
        <div
          className="text-5xl mb-3"
          style={{ animation: 'achievement-icon-reveal 400ms ease-out 200ms both' }}
        >
          {achievement.icon}
        </div>

        {/* Burst particles positioned around the icon */}
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {burstParticles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full bg-white"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: 0,
                left: '0px',
                top: '0px',
                ['--px' as string]: `${p.px}px`,
                ['--py' as string]: `${p.py}px`,
                boxShadow: p.glow,
                animation: 'achievement-particle 800ms ease-out 700ms forwards',
              }}
            />
          ))}
        </div>

        {/* Title with staged entry */}
        <h3
          className="text-lg font-bold text-white mb-1"
          style={{ animation: 'achievement-title-in 300ms ease-out 500ms both' }}
        >
          {achievement.title}
        </h3>
        <p
          className="text-[12px] text-white/70 leading-relaxed mb-4"
          style={{ animation: 'achievement-title-in 300ms ease-out 600ms both' }}
        >
          {achievement.description}
        </p>

        {/* XP and rarity with staged entry */}
        <div
          className="flex items-center justify-center gap-3"
          style={{ animation: 'achievement-xp-count 300ms ease-out 1200ms both' }}
        >
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${RARITY_COLORS[achievement.rarity]} ${RARITY_TEXT[achievement.rarity]}`}>
            {achievement.rarity}
          </span>
          <span className="flex items-center gap-1 text-white font-bold text-sm">
            <Zap className="w-3.5 h-3.5" />
            +{achievement.xpReward} XP
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes achievement-confetti {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(calc(100vh + 20px)) translateX(var(--drift)) rotate(720deg); opacity: 0; }
        }
        @keyframes achievement-enter {
          0% { opacity: 0; transform: scale(0.85) translateY(20px); }
          50% { opacity: 1; transform: scale(1.03) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-achievement-enter {
          animation: achievement-enter 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
