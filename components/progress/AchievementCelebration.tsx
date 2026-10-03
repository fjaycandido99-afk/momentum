'use client'

import { useEffect, useState, useMemo } from 'react'
import { ChevronRight, Share2, Sparkle, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { chainFor } from '@/lib/relic-paths'
import { getAchievementById, achievementMark } from '@/lib/achievements'
import { AchievementBadge, METAL, METAL_RGB } from './AchievementBadge'
import { achievementLine } from '@/lib/achievement-lines'
import { RelicNote } from '@/components/relics/RelicNote'
import { ShareRelicSheet } from '@/components/relics/ShareRelicSheet'
import { createPortal } from 'react-dom'
import { ScrollLock } from '@/components/ui/ScrollLock'

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
  /** Opened by tapping an earned coin (not a fresh unlock): no "new". */
  viewOnly?: boolean
  /** Earned state of any id — shows the coin's chain when given. */
  statusOf?: (id: string) => { unlocked: boolean } | undefined
  /** viewOnly: their own line on this coin (lib/relic-notes), and where a change goes. */
  note?: string | null
  onNoteSaved?: (id: string, note: string | null) => void
}

/*
 * From Francis's "Year of Growth" mockup: warm black, an edge and embers in
 * the achievement's METAL (steel · silver · gold — AchievementBadge), a serif
 * title. Only epic and legendary are gold; rarity also sets how much it glows.
 */

const glowStyle = (GOLD: string): Record<string, string> => ({
  common: `0 0 40px rgb(${GOLD} / 0.10)`,
  rare: `0 0 50px rgb(${GOLD} / 0.18)`,
  epic: `0 0 60px rgb(${GOLD} / 0.26)`,
  legendary: `0 0 80px rgb(${GOLD} / 0.38)`,
})

// Rarity-based embers
const particleConfig = (GOLD: string): Record<string, { count: number; opacity: number; glow: string; sizeBoost: number }> => ({
  common: { count: 15, opacity: 0.55, glow: `0 0 4px rgb(${GOLD} / 0.5)`, sizeBoost: 0 },
  rare: { count: 20, opacity: 0.7, glow: `0 0 5px rgb(${GOLD} / 0.6)`, sizeBoost: 0 },
  epic: { count: 25, opacity: 0.85, glow: `0 0 6px rgb(${GOLD} / 0.7)`, sizeBoost: 0 },
  legendary: { count: 30, opacity: 0.95, glow: `0 0 8px rgb(${GOLD} / 0.85)`, sizeBoost: 1 },
})

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

export function AchievementCelebration({ achievement, onClose, viewOnly = false, statusOf, note = null, onNoteSaved }: AchievementCelebrationProps) {
  const metal = METAL[achievement.rarity]
  const GOLD = METAL_RGB[metal]
  const warm = metal === 'gold'
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  /** The share card (components/relics/ShareRelicSheet) — never carries their memory note. */
  const [sharing, setSharing] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  // Already on Progress (the grid opened this)? Then "view" just closes it.
  // Wearing a relic lives in the header's relic sheet, not here (Francis).
  const viewProgress = () => {
    onClose()
    if (!pathname?.startsWith('/progress')) router.push('/progress')
  }
  const chain = statusOf ? chainFor(achievement.id) : []

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
  }, [GOLD])

  // Generate burst particles (radial from center)
  const burstParticles = useMemo(() => {
    const all = particleConfig(GOLD)
    const config = all[achievement.rarity] || all.common
    return Array.from({ length: config.count }, (_, i) => ({
      id: i,
      px: (Math.random() - 0.5) * 120, // -60 to 60
      py: (Math.random() - 0.5) * 120,
      size: 2 + Math.random() * 2 + config.sizeBoost,
      opacity: config.opacity,
      glow: config.glow,
    }))
  }, [achievement.rarity, GOLD])

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    // A coin they opened to look at stays until they close it — it holds
    // their memory note, and nobody can type into a popup that leaves.
    if (viewOnly) return

    // Long enough to read it and reach "View progress" — 3.5s was not.
    const fadeTimer = setTimeout(() => setFadeOut(true), 5500)
    const closeTimer = setTimeout(onClose, 6000)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(closeTimer)
    }
  }, [onClose, viewOnly])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={fadeOut ? { animation: 'achievement-fade-out 500ms ease-out forwards' } : undefined}
      onClick={onClose}
    >
      <ScrollLock />
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* White flash overlay */}
      {visible && (
        <div
          className={`absolute inset-0 pointer-events-none ${warm ? 'bg-[#f3dcb8]' : 'bg-white'}`}
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
        className={`relative z-10 max-w-[340px] md:max-w-[400px] w-full mx-5 max-h-[90dvh] overflow-y-auto overflow-x-hidden overscroll-contain rounded-[26px] border px-6 pt-6 pb-6 text-center
          ${warm
            ? 'bg-[radial-gradient(90%_60%_at_50%_30%,rgb(70_48_26/0.55),rgb(12_9_6/0.97)_70%)]'
            : 'bg-[radial-gradient(90%_60%_at_50%_30%,rgb(44_48_56/0.55),rgb(8_9_11/0.97)_70%)]'}
          ${visible ? 'animate-achievement-enter' : 'opacity-0 scale-90'}
        `}
        style={{ boxShadow: glowStyle(GOLD)[achievement.rarity], borderColor: `rgb(${GOLD} / 0.55)` }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="tap-44 absolute top-3.5 right-3.5 w-8 h-8 rounded-full border border-white/25 flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="text-px-10 uppercase tracking-[0.34em] mb-5 mt-1.5" style={{ color: `rgb(${GOLD})` }}>{viewOnly ? 'Your relic' : 'New relic earned'}</p>

        {/* Icon with staged reveal */}
        {/* Plain <style>, not styled-jsx: it scopes keyframe names, and this one is
            referenced from an inline style. */}
        <style>{'@keyframes relic-into-light{0%{opacity:0;transform:rotateY(-110deg) scale(0.72);filter:brightness(0.15)}55%{opacity:1;transform:rotateY(12deg) scale(1.05);filter:brightness(1.7)}100%{opacity:1;transform:rotateY(0deg) scale(1);filter:brightness(1)}}'}</style>
        {/* The coin turns out of the dark into the light, flares, settles —
            an in-place turn, so it plays under Reduce Motion too
            (keep-motion; globals.css stops only movement). */}
        <div
          className="keep-motion mb-4 flex justify-center [perspective:700px]"
          style={{ animation: 'relic-into-light 1100ms cubic-bezier(0.16, 1, 0.3, 1) 150ms both' }}
        >
          <AchievementBadge
            id={achievement.id}
            category={getAchievementById(achievement.id)?.category ?? 'secret'}
            icon={achievement.icon}
            rarity={achievement.rarity}
            unlocked
            mark={(() => { const full = getAchievementById(achievement.id); return full ? achievementMark(full) : null })()}
            size={160}
          />
        </div>

        {/* Burst particles positioned around the icon */}
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {burstParticles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: 0,
                left: '0px',
                top: '0px',
                ['--px' as string]: `${p.px}px`,
                ['--py' as string]: `${p.py}px`,
                boxShadow: p.glow,
                backgroundColor: `rgb(${GOLD})`,
                animation: 'achievement-particle 800ms ease-out 700ms forwards',
              }}
            />
          ))}
        </div>

        {/* Title with staged entry */}
        <h3
          className="text-px-32 leading-tight text-white mt-2 mb-1.5"
          style={{ ...SERIF, fontWeight: 600, animation: 'achievement-title-in 300ms ease-out 500ms both' }}
        >
          {achievement.title}
        </h3>
        {/* What the coin MEANS (lib/achievement-lines), then what it took. */}
        {achievementLine(achievement.id) && (
          <p
            className="text-px-19 text-white/90 leading-snug mb-2 px-2"
            style={{ ...SERIF, animation: 'achievement-title-in 300ms ease-out 600ms both' }}
          >
            {achievementLine(achievement.id)}
          </p>
        )}
        <p
          className="text-px-12 text-white/60 leading-relaxed mb-5"
          style={{ animation: 'achievement-title-in 300ms ease-out 700ms both' }}
        >
          {achievement.description}
        </p>

        {/* The coin's chain — the same goal at every threshold, this one ringed. */}
        {chain.length > 1 && (
          <ol className="flex justify-center flex-wrap gap-2 mb-5 -mt-1" aria-label="This relic's chain">
            {chain.map(step => {
              const earned = !!statusOf?.(step.id)?.unlocked
              const here = step.id === achievement.id
              return (
                <li key={step.id} aria-current={here ? 'step' : undefined} className={`rounded-full ${here ? 'ring-2 ring-offset-2 ring-offset-black' : ''}`} style={here ? { ['--tw-ring-color' as string]: `rgb(${GOLD})` } : undefined}>
                  <AchievementBadge id={step.id} category={step.category} icon={step.icon} rarity={step.rarity} unlocked={earned} plain size={30} />
                  <span className="sr-only">{step.title}{earned ? ', earned' : ', not earned'}</span>
                </li>
              )
            })}
          </ol>
        )}

        {viewOnly && (
          <RelicNote id={achievement.id} initial={note} onSaved={n => onNoteSaved?.(achievement.id, n)} />
        )}
        {viewOnly && (
          <button
            onClick={() => setSharing(true)}
            className="tap-44 -mt-2 mb-5 inline-flex items-center gap-1.5 text-px-13 text-white/80"
          >
            <Share2 className="w-4 h-4" /> Share this relic
          </button>
        )}
        {/* Portalled: this card animates with a transform, which would pin a
            fixed sheet to the card instead of the screen. Rendered inside the
            card in the React tree, so its taps stop at the card's
            stopPropagation and don't close the popup underneath. */}
        {sharing && typeof document !== 'undefined' && createPortal(
          <ShareRelicSheet id={achievement.id} onClose={() => setSharing(false)} />,
          document.body,
        )}

        {/* XP and rarity with staged entry */}
        <div
          className="grid grid-cols-2 gap-2.5"
          style={{ animation: 'achievement-xp-count 300ms ease-out 1200ms both' }}
        >
          <button
            onClick={viewProgress}
            className="h-12 rounded-full border flex items-center justify-center gap-1.5 text-px-11 tracking-[0.2em] uppercase text-white active:scale-[0.97] transition-transform"
            style={{ borderColor: `rgb(${GOLD} / 0.8)` }}
          >
            View progress <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="h-12 rounded-full border border-white/15 bg-black/40 flex items-center justify-center gap-1.5 text-white font-semibold text-px-15">
            <Sparkle className="w-4 h-4" style={{ color: `rgb(${GOLD})` }} fill="currentColor" />
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
