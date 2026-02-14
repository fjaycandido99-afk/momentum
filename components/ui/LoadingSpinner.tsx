'use client'

import { useState, useEffect } from 'react'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import type { MindsetId } from '@/lib/mindset/types'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    let frame: number
    let start = performance.now()

    const animate = (time: number) => {
      const elapsed = (time - start) / 1000
      setRotation(elapsed * 45)
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

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
        style={{ transform: `rotate(${rotation}deg)` }}
      />
      {/* Middle ring - dotted, rotates counter-clockwise */}
      <div
        className="absolute inset-[15%] rounded-full border-2 border-dotted border-white/60"
        style={{ transform: `rotate(${-rotation * 1.3}deg)` }}
      />
      {/* Inner ring - dashed, rotates clockwise faster */}
      <div
        className="absolute inset-[30%] rounded-full border-2 border-dashed border-white/50"
        style={{ transform: `rotate(${rotation * 2}deg)` }}
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
}

const GENERIC_WORDS = ['breathe', 'focus', 'flow', 'calm', 'center', 'ground', 'drift', 'settle']

function pickRandom(pool: string[], count: number): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function LoadingScreen() {
  const mindsetCtx = useMindsetOptional()
  const pool = mindsetCtx ? MINDSET_WORDS[mindsetCtx.mindset] : GENERIC_WORDS
  const [words, setWords] = useState(pool.slice(0, 4))
  const [wordIndex, setWordIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [rotation, setRotation] = useState(0)

  // On first session load (right after splash), show rings instead of words
  const [showRings] = useState(() => {
    if (typeof window === 'undefined') return false
    return !sessionStorage.getItem('voxu_home_loaded')
  })

  useEffect(() => {
    sessionStorage.setItem('voxu_home_loaded', 'true')
  }, [])

  // Ring rotation (only when showing rings)
  useEffect(() => {
    if (!showRings) return
    let frame: number
    const start = performance.now()
    const animate = (time: number) => {
      setRotation((time - start) / 1000 * 60)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [showRings])

  // Shuffle words on client mount to avoid hydration mismatch
  useEffect(() => {
    setWords(pickRandom(pool, 4))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const initialDelay = setTimeout(() => setVisible(true), 400)
    return () => clearTimeout(initialDelay)
  }, [])

  useEffect(() => {
    if (!visible) return

    const holdTimer = setTimeout(() => {
      setVisible(false)
    }, 2000)

    return () => clearTimeout(holdTimer)
  }, [visible, wordIndex])

  useEffect(() => {
    if (visible) return

    const nextTimer = setTimeout(() => {
      setWordIndex((prev) => (prev + 1) % words.length)
      setVisible(true)
    }, 1000)

    return () => clearTimeout(nextTimer)
  }, [visible, words.length])

  if (showRings) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-40">
        <div className="w-28 h-28 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-white/10 blur-xl" />
          <div
            className="absolute inset-0 rounded-full border-2 border-dashed border-white/35"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
          <div
            className="absolute inset-3 rounded-full border-2 border-dotted border-white/50"
            style={{ transform: `rotate(${-rotation * 1.2}deg)` }}
          />
          <div
            className="absolute inset-6 rounded-full border-2 border-dashed border-white/60"
            style={{ transform: `rotate(${rotation * 1.5}deg)` }}
          />
          <div
            className="absolute inset-9 rounded-full border-2 border-dotted border-white/70"
            style={{ transform: `rotate(${-rotation * 2}deg)` }}
          />
          <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_25px_rgba(255,255,255,0.9)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-40">
      <span
        className="text-[44px] font-medium tracking-[0.35em] lowercase text-white select-none"
        style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(4px)',
          filter: visible ? 'blur(0px)' : 'blur(6px)',
          transition: visible
            ? 'opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'opacity 0.8s cubic-bezier(0.4, 0, 1, 1), transform 0.8s cubic-bezier(0.4, 0, 1, 1), filter 0.6s cubic-bezier(0.4, 0, 1, 1)',
        }}
      >
        {words[wordIndex]}
      </span>
    </div>
  )
}
