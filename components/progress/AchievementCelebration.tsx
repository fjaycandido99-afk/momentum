'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { RARITY_TEXT, RARITY_BG, RARITY_COLORS } from '@/lib/achievements'

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

export function AchievementCelebration({ achievement, onClose }: AchievementCelebrationProps) {
  const [visible, setVisible] = useState(false)
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number; color: string }[]>([])

  useEffect(() => {
    setVisible(true)

    // Generate confetti particles
    const colors = ['#fbbf24', '#f97316', '#a855f7', '#3b82f6', '#10b981', '#ef4444']
    const newParticles = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: colors[i % colors.length],
    }))
    setParticles(newParticles)

    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Confetti */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      <div
        className={`relative z-10 max-w-xs w-full mx-6 rounded-3xl border p-6 text-center ${RARITY_COLORS[achievement.rarity]} ${RARITY_BG[achievement.rarity]}`}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/40 hover:text-white/60"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Achievement Unlocked!</p>

        <div className="text-5xl mb-3 animate-bounce-gentle">{achievement.icon}</div>

        <h3 className="text-lg font-bold text-white mb-1">{achievement.title}</h3>
        <p className="text-xs text-white/60 mb-3">{achievement.description}</p>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize ${RARITY_BG[achievement.rarity]} ${RARITY_TEXT[achievement.rarity]} border ${RARITY_COLORS[achievement.rarity]}`}>
          {achievement.rarity}
        </div>

        <div className="mt-3 text-amber-400 font-bold text-sm">
          +{achievement.xpReward} XP
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confetti-fall 2.5s ease-in forwards;
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 0.8s ease-in-out 2;
        }
      `}</style>
    </div>
  )
}
