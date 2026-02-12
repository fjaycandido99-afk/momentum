'use client'

import { useState, useEffect } from 'react'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import type { MindsetId } from '@/lib/mindset/types'

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

interface SplashScreenProps {
  onComplete: () => void
  minDuration?: number
}

export function SplashScreen({ onComplete, minDuration = 2500 }: SplashScreenProps) {
  const mindsetCtx = useMindsetOptional()
  const pool = mindsetCtx ? MINDSET_WORDS[mindsetCtx.mindset] : GENERIC_WORDS
  const [words] = useState(() => pickRandom(pool, 4))
  const [wordIndex, setWordIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  // Start first word
  useEffect(() => {
    const initialDelay = setTimeout(() => setVisible(true), 400)
    return () => clearTimeout(initialDelay)
  }, [])

  // Word cycling
  useEffect(() => {
    if (!visible) return
    const holdTimer = setTimeout(() => setVisible(false), 2000)
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

  // Fade out and complete
  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), minDuration - 500)
    const completeTimer = setTimeout(onComplete, minDuration)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(completeTimer)
    }
  }, [minDuration, onComplete])

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
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
