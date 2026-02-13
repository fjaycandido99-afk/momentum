'use client'

import { useEffect, useState } from 'react'
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
  rare: '0 0 40px rgba(96,165,250,0.15)',
  epic: '0 0 50px rgba(192,132,252,0.2)',
  legendary: '0 0 60px rgba(251,191,36,0.25)',
}

export function AchievementCelebration({ achievement, onClose }: AchievementCelebrationProps) {
  const [visible, setVisible] = useState(false)
  const [particles, setParticles] = useState<{ id: number; x: number; size: number; delay: number; color: string; drift: number }[]>([])

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))

    const colors =
      achievement.rarity === 'legendary' ? ['#fbbf24', '#f59e0b', '#fcd34d', '#f97316', '#fbbf24', '#fde68a'] :
      achievement.rarity === 'epic' ? ['#a855f7', '#c084fc', '#7c3aed', '#818cf8', '#a78bfa', '#c4b5fd'] :
      achievement.rarity === 'rare' ? ['#3b82f6', '#60a5fa', '#2563eb', '#93c5fd', '#6366f1', '#818cf8'] :
      ['#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#6b7280', '#f9fafb']

    const newParticles = Array.from({ length: 32 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      size: 3 + Math.random() * 5,
      delay: Math.random() * 0.8,
      color: colors[i % colors.length],
      drift: (Math.random() - 0.5) * 60,
    }))
    setParticles(newParticles)

    const timer = setTimeout(onClose, 4500)
    return () => clearTimeout(timer)
  }, [onClose, achievement.rarity])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Confetti */}
      {particles.map(p => (
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
          className="absolute top-3 right-3 p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-medium mb-4">Achievement Unlocked</p>

        <div className="text-5xl mb-3 animate-achievement-icon">{achievement.icon}</div>

        <h3 className="text-lg font-bold text-white mb-1">{achievement.title}</h3>
        <p className="text-[12px] text-white/50 leading-relaxed mb-4">{achievement.description}</p>

        <div className="flex items-center justify-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${RARITY_COLORS[achievement.rarity]} ${RARITY_TEXT[achievement.rarity]}`}>
            {achievement.rarity}
          </span>
          <span className="flex items-center gap-1 text-amber-400 font-bold text-sm">
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
        @keyframes achievement-icon {
          0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          40% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          60% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .animate-achievement-icon {
          animation: achievement-icon 0.7s ease-out 0.2s both;
        }
      `}</style>
    </div>
  )
}
