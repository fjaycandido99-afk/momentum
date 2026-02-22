'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { MINDSET_IDS, type MindsetId } from '@/lib/mindset/types'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'
import { CoachAvatar } from '@/components/coach/CoachAvatar'

interface MindsetSelectionScreenProps {
  /** If true, show as a "Reset My Path" picker instead of onboarding */
  isReset?: boolean
}

// Each mindset gets a unique accent color and gradient personality
const MINDSET_THEME: Record<MindsetId, { accent: string; glow: string; gradient: string; tagline: string }> = {
  stoic: {
    accent: 'text-stone-300',
    glow: 'rgba(168,162,158,0.3)',
    gradient: 'from-stone-500/10 via-transparent to-transparent',
    tagline: 'Unshakable calm',
  },
  existentialist: {
    accent: 'text-violet-300',
    glow: 'rgba(196,181,253,0.3)',
    gradient: 'from-violet-500/10 via-transparent to-transparent',
    tagline: 'Radical freedom',
  },
  cynic: {
    accent: 'text-orange-300',
    glow: 'rgba(253,186,116,0.3)',
    gradient: 'from-orange-500/10 via-transparent to-transparent',
    tagline: 'Raw truth',
  },
  hedonist: {
    accent: 'text-emerald-300',
    glow: 'rgba(110,231,183,0.3)',
    gradient: 'from-emerald-500/10 via-transparent to-transparent',
    tagline: 'Savor life',
  },
  samurai: {
    accent: 'text-red-300',
    glow: 'rgba(252,165,165,0.3)',
    gradient: 'from-red-500/10 via-transparent to-transparent',
    tagline: 'Honor & discipline',
  },
  scholar: {
    accent: 'text-blue-300',
    glow: 'rgba(147,197,253,0.3)',
    gradient: 'from-blue-500/10 via-transparent to-transparent',
    tagline: 'Cosmic wisdom',
  },
  manifestor: {
    accent: 'text-amber-300',
    glow: 'rgba(252,211,77,0.3)',
    gradient: 'from-amber-500/10 via-transparent to-transparent',
    tagline: 'Create your reality',
  },
  hustler: {
    accent: 'text-cyan-300',
    glow: 'rgba(103,232,249,0.3)',
    gradient: 'from-cyan-500/10 via-transparent to-transparent',
    tagline: 'Outwork everyone',
  },
}

function MindsetCard({ id, index, onTap }: { id: MindsetId; index: number; onTap: (id: MindsetId) => void }) {
  const [visible, setVisible] = useState(false)
  const config = MINDSET_CONFIGS[id]
  const theme = MINDSET_THEME[id]

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100 + index * 80)
    return () => clearTimeout(timer)
  }, [index])

  return (
    <button
      onClick={() => onTap(id)}
      className={`relative overflow-hidden p-4 rounded-2xl text-left transition-all duration-500 min-h-[140px] border border-white/15 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none group ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ background: 'rgba(255,255,255,0.05)' }}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300`} />

      {/* Glow behind icon */}
      <div
        className="absolute top-3 left-3 w-12 h-12 rounded-full blur-xl opacity-0 group-hover:opacity-60 group-active:opacity-60 transition-opacity duration-500"
        style={{ background: theme.glow }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <MindsetIcon mindsetId={id} className="w-10 h-10 text-white/80" />
            <CoachAvatar mindsetId={id} size="sm" />
          </div>
          <span className={`text-[10px] ${theme.accent} font-medium tracking-wider uppercase mt-1`}>
            {theme.tagline}
          </span>
        </div>

        <p className="font-semibold text-[15px] text-white mb-1">
          {config.name}
        </p>
        <p className="text-[11px] text-white/85 leading-relaxed mb-2">
          {config.subtitle}
        </p>
        <p className="text-[10px] text-white/60 leading-snug italic">
          {config.promptReferences.slice(0, 2).join(' · ')}
        </p>
      </div>

      {/* Bottom edge glow on hover */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${theme.glow}, transparent)` }}
      />
    </button>
  )
}

export function MindsetSelectionScreen({ isReset }: MindsetSelectionScreenProps) {
  const router = useRouter()
  const [headerVisible, setHeaderVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setHeaderVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleCardTap = (id: MindsetId) => {
    router.push(`/mindset-selection/${id}`)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden">
      {/* Header */}
      <div className={`text-center mb-10 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <p className="text-white/70 text-[10px] font-medium tracking-[0.2em] uppercase mb-3">
          {isReset ? 'Change philosophy' : 'Select your philosophy'}
        </p>
        <h1 className="text-3xl font-light text-white tracking-wide mb-3">
          {isReset ? 'Reset Your Path' : 'Choose Your Path'}
        </h1>
        <p className="text-white/85 text-sm max-w-[280px] mx-auto leading-relaxed">
          {isReset
            ? 'Your mentor, quotes, and journal will adapt to your new mindset.'
            : 'Your philosophy shapes everything — coaching, quotes, journal prompts, and visuals.'}
        </p>
      </div>

      {/* 2x3 Grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {MINDSET_IDS.map((id, i) => (
          <MindsetCard key={id} id={id} index={i} onTap={handleCardTap} />
        ))}
      </div>

      {/* Bottom hint */}
      <p className={`text-white/60 text-[11px] mt-8 transition-all duration-700 delay-700 ${headerVisible ? 'opacity-100' : 'opacity-0'}`}>
        Tap a path to learn more
      </p>
    </div>
  )
}
