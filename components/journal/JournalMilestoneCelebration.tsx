'use client'

import { useEffect, useState } from 'react'

const MILESTONES: Record<number, { emoji: string; message: string }> = {
  3:   { emoji: '\u{1F525}', message: '3-day streak! You\'re building a habit.' },
  7:   { emoji: '\u{1F31F}', message: '1 week strong! Consistency is your superpower.' },
  14:  { emoji: '\u{1F4AA}', message: '2 weeks! Your commitment is inspiring.' },
  30:  { emoji: '\u{1F3C6}', message: '30-day streak! A full month of reflection.' },
  60:  { emoji: '\u{1F48E}', message: '60 days! You\'ve made journaling part of who you are.' },
  100: { emoji: '\u{1F451}', message: '100 days! Legendary dedication.' },
}

interface JournalMilestoneCelebrationProps {
  streak: number | null
  onDismiss: () => void
}

export function JournalMilestoneCelebration({ streak, onDismiss }: JournalMilestoneCelebrationProps) {
  const [visible, setVisible] = useState(false)

  const milestone = streak ? MILESTONES[streak] : null

  useEffect(() => {
    if (!milestone) return
    // Animate in
    requestAnimationFrame(() => setVisible(true))
    // Auto-dismiss after 4s
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, 4000)
    return () => clearTimeout(timer)
  }, [milestone, onDismiss])

  if (!milestone) return null

  return (
    <div
      className={`fixed left-4 right-4 bottom-24 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-500/20 backdrop-blur-sm transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <span className="text-2xl shrink-0">{milestone.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{milestone.message}</p>
        <p className="text-xs text-amber-400/80 mt-0.5">{streak}-day streak</p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300) }}
        className="text-white/40 hover:text-white/60 text-xs shrink-0"
      >
        dismiss
      </button>
    </div>
  )
}
