'use client'

import { useEffect, useState, useMemo } from 'react'
import { ChevronRight, Sparkle, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { getAchievementById, achievementMark } from '@/lib/achievements'
import { AchievementBadge } from './AchievementBadge'

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

/*
 * Gold, from Francis's "Year of Growth" mockup: warm black, an antique-gold
 * edge and embers, a serif title. Rarity shows in how much it glows.
 */
const GOLD = '214 170 118'
const RARITY_GLOW_STYLE: Record<string, string> = {
  common: `0 0 40px rgb(${GOLD} / 0.10)`,
  rare: `0 0 50px rgb(${GOLD} / 0.18)`,
  epic: `0 0 60px rgb(${GOLD} / 0.26)`,
  legendary: `0 0 80px rgb(${GOLD} / 0.38)`,
}

// Rarity-based embers
const PARTICLE_CONFIG: Record<string, { count: number; opacity: number; glow: string; sizeBoost: number }> = {
  common: { count: 15, opacity: 0.55, glow: `0 0 4px rgb(${GOLD} / 0.5)`, sizeBoost: 0 },
  rare: { count: 20, opacity: 0.7, glow: `0 0 5px rgb(${GOLD} / 0.6)`, sizeBoost: 0 },
  epic: { count: 25, opacity: 0.85, glow: `0 0 6px rgb(${GOLD} / 0.7)`, sizeBoost: 0 },
  legendary: { count: 30, opacity: 0.95, glow: `0 0 8px rgb(${GOLD} / 0.85)`, sizeBoost: 1 },
}

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

export function AchievementCelebration({ achievement, onClose }: AchievementCelebrationProps) {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  // Already on Progress (the grid opened this)? Then "view" just closes it.
  const viewProgress = () => {
    onClose()
    if (!pathname?.startsWith('/progress')) router.push('/progress')
  }

  // Generate confetti particles (falling from top — existing style)
  const confettiParticles = useMemo(() => {
    return Array.from({ length: 32 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      size: 3 + Math.random() * 5,
      delay: Math.random() * 0.8,
      color: `rgb(${GOLD} / ${0.35 + Math.random() * 0.5})`,
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

    // Long enough to read it and reach "View progress" — 3.5s was not.
    const fadeTimer = setTimeout(() => setFadeOut(true), 5500)
    const closeTimer = setTimeout(onClose, 6000)
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
          className="absolute inset-0 bg-[#f3dcb8] pointer-events-none"
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
        className={`relative z-10 max-w-[340px] md:max-w-[400px] w-full mx-5 rounded-[26px] border px-6 pt-6 pb-6 text-center
          bg-[radial-gradient(90%_60%_at_50%_30%,rgb(70_48_26/0.55),rgb(12_9_6/0.96)_70%)]
          ${visible ? 'animate-achievement-enter' : 'opacity-0 scale-90'}
        `}
        style={{ boxShadow: RARITY_GLOW_STYLE[achievement.rarity], borderColor: `rgb(${GOLD} / 0.55)` }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full border border-white/25 flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="gold-eyebrow !tracking-[0.34em] mb-5 mt-1.5">Achievement unlocked</p>

        {/* Icon with staged reveal */}
        <div
          className="mb-4 flex justify-center"
          style={{ animation: 'achievement-icon-reveal 400ms ease-out 200ms both' }}
        >
          <AchievementBadge
            category={getAchievementById(achievement.id)?.category ?? 'secret'}
            icon={achievement.icon}
            rarity={achievement.rarity}
            unlocked
            mark={(() => { const full = getAchievementById(achievement.id); return full ? achievementMark(full) : null })()}
            size={136}
          />
        </div>

        {/* Burst particles positioned around the icon */}
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {burstParticles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full bg-[#e8c79a]"
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
          className="text-[32px] leading-tight text-white mt-2 mb-1.5"
          style={{ ...SERIF, fontWeight: 600, animation: 'achievement-title-in 300ms ease-out 500ms both' }}
        >
          {achievement.title}
        </h3>
        <p
          className="text-[14px] text-white/70 leading-relaxed mb-5"
          style={{ animation: 'achievement-title-in 300ms ease-out 600ms both' }}
        >
          {achievement.description}
        </p>

        {/* XP and rarity with staged entry */}
        <div
          className="grid grid-cols-2 gap-2.5"
          style={{ animation: 'achievement-xp-count 300ms ease-out 1200ms both' }}
        >
          <button
            onClick={viewProgress}
            className="h-12 rounded-full border flex items-center justify-center gap-1.5 text-[11px] tracking-[0.2em] uppercase text-white active:scale-[0.97] transition-transform"
            style={{ borderColor: `rgb(${GOLD} / 0.8)` }}
          >
            View progress <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="h-12 rounded-full border border-white/15 bg-black/40 flex items-center justify-center gap-1.5 text-white font-semibold text-[15px]">
            <Sparkle className="w-4 h-4 text-[#e8c79a]" fill="currentColor" />
            +{achievement.xpReward} XP
          </span>
        </div>
        <p className="gold-eyebrow !text-[9px] mt-3 opacity-80">{achievement.rarity}</p>
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
