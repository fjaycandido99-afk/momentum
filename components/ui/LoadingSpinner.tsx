'use client'

import { useState, useEffect } from 'react'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import type { MindsetId } from '@/lib/mindset/types'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
  }

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  }

  return (
    <div className={`${sizeClasses[size]} relative flex items-center justify-center ${className}`}>
      {/* Outer ring - dashed, rotates clockwise slow */}
      <div
        className="absolute inset-0 rounded-full border-2 border-dashed border-white/40"
        style={{ animation: 'spin 8s linear infinite' }}
      />
      {/* Middle ring - dotted, rotates counter-clockwise */}
      <div
        className="absolute inset-[15%] rounded-full border-2 border-dotted border-white/60"
        style={{ animation: 'spin 6.15s linear infinite reverse' }}
      />
      {/* Inner ring - dashed, rotates clockwise faster */}
      <div
        className="absolute inset-[30%] rounded-full border-2 border-dashed border-white/50"
        style={{ animation: 'spin 4s linear infinite' }}
      />
      {/* Center dot with glow */}
      <div className={`${dotSizes[size]} rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]`} />
    </div>
  )
}

const MINDSET_WORDS: Record<MindsetId, string[]> = {
  stoic: ['stillness', 'virtue', 'endure', 'clarity', 'patience', 'resolve', 'equanimity', 'reason'],
  existentialist: ['freedom', 'create', 'meaning', 'become', 'choose', 'authentic', 'exist', 'transcend'],
  cynic: ['truth', 'simplify', 'question', 'liberate', 'strip', 'expose', 'reject', 'distill'],
  hedonist: ['savor', 'bloom', 'gratitude', 'warmth', 'delight', 'radiance', 'cherish', 'indulge'],
  samurai: ['discipline', 'honor', 'focus', 'master', 'sharpen', 'forge', 'strike', 'resolve'],
  scholar: ['wonder', 'discover', 'awaken', 'seek', 'unravel', 'illuminate', 'ponder', 'fathom'],
  manifestor: ['attract', 'believe', 'intend', 'align', 'receive', 'radiate', 'manifest', 'envision'],
  hustler: ['grind', 'execute', 'dominate', 'outwork', 'conquer', 'relentless', 'unleash', 'attack'],
}

const GENERIC_WORDS = ['breathe', 'focus', 'flow', 'calm', 'center', 'ground', 'drift', 'settle']

function pickRandom(pool: string[], count: number): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function LoadingScreen() {
  const mindsetCtx = useMindsetOptional()
  const pool = mindsetCtx ? MINDSET_WORDS[mindsetCtx.mindset] : GENERIC_WORDS
  const [word, setWord] = useState(pool[0])
  const [visible, setVisible] = useState(false)

  // Pick a random word on mount
  useEffect(() => {
    setWord(pool[Math.floor(Math.random() * pool.length)])
    const fadeIn = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(fadeIn)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-40">
      <span
        className="text-[44px] font-medium tracking-[0.35em] lowercase text-white select-none"
        style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(4px)',
          transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {word}
      </span>
    </div>
  )
}
