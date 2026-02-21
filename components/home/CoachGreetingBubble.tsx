'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { MindsetId } from '@/lib/mindset/types'

interface CoachGreetingBubbleProps {
  mindsetId?: MindsetId | null
}

// ── Per-mindset accent colors (matches CoachAvatar THEMES) ──
const ACCENT: Record<MindsetId, string> = {
  stoic: '#d4b070',
  existentialist: '#8a9aba',
  cynic: '#e86838',
  hedonist: '#80d090',
  samurai: '#d86058',
  scholar: '#b088e0',
  manifestor: '#e8b848',
  hustler: '#8a9aaa',
}

const COACH_NAME: Record<MindsetId, string> = {
  stoic: 'The Sage',
  existentialist: 'The Guide',
  cynic: 'The Challenger',
  hedonist: 'The Muse',
  samurai: 'The Sensei',
  scholar: 'The Oracle',
  manifestor: 'The Alchemist',
  hustler: 'The Commander',
}

// ── Local greeting pool (3 per mindset) ─────────────────────
const GREETINGS: Record<MindsetId, string[]> = {
  stoic: [
    'Focus on what you control today.',
    'Discipline is your superpower.',
    'A calm mind conquers all.',
  ],
  existentialist: [
    'Today is yours to define.',
    'Meaning is made, not found.',
    'Embrace the unknown ahead.',
  ],
  cynic: [
    'Cut through the noise.',
    'Less pretense, more presence.',
    'Strip away what doesn\u2019t matter.',
  ],
  hedonist: [
    'Find the joy in this moment.',
    'Life is meant to be savored.',
    'Let beauty guide your day.',
  ],
  samurai: [
    'Honor begins with showing up.',
    'Your discipline is your path.',
    'One breath. One step. Begin.',
  ],
  scholar: [
    'Seek wisdom in the quiet.',
    'The stars are watching over you.',
    'Knowledge lights the way forward.',
  ],
  manifestor: [
    'Your vision is already unfolding.',
    'Align your energy with intent.',
    'What you believe, you become.',
  ],
  hustler: [
    'Execute first, adjust later.',
    'Momentum beats motivation.',
    'Another day to level up.',
  ],
}

const NUDGE_INTERVAL_MS = 17 * 60 * 1000 // ~17 min
const AUTO_DISMISS_MS = 8000
const GREETING_SESSION_KEY = 'voxu_coach_greeting_shown'

export function CoachGreetingBubble({ mindsetId }: CoachGreetingBubbleProps) {
  const mid = mindsetId || 'stoic'
  const [message, setMessage] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nudgeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const accent = ACCENT[mid] || ACCENT.stoic
  const coachName = COACH_NAME[mid] || COACH_NAME.stoic
  const greetings = GREETINGS[mid] || GREETINGS.stoic

  const pickLocalGreeting = useCallback(() => {
    return greetings[Math.floor(Math.random() * greetings.length)]
  }, [greetings])

  const showBubble = useCallback((msg: string) => {
    // Check if DailySpark popup is active
    if (typeof window !== 'undefined' && (window as any).__popupActive) return

    setMessage(msg)
    setVisible(true)

    // Auto-dismiss after 8s
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    dismissTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setVisible(false)
    }, AUTO_DISMISS_MS)
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
  }, [])

  // ── Session-open greeting (3s delay, once per session) ────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(GREETING_SESSION_KEY)) return

    const timer = setTimeout(() => {
      if (!mountedRef.current) return
      sessionStorage.setItem(GREETING_SESSION_KEY, '1')
      showBubble(pickLocalGreeting())
    }, 3000)

    return () => clearTimeout(timer)
  }, [showBubble, pickLocalGreeting])

  // ── Periodic nudge (every ~17 min) ────────────────────────
  useEffect(() => {
    nudgeTimerRef.current = setInterval(async () => {
      if (!mountedRef.current) return
      // Skip if popup active or bubble already showing
      if ((window as any).__popupActive || visible) return

      let nudgeMsg: string | null = null
      try {
        const res = await fetch('/api/daily-guide/smart-nudge')
        if (res.ok) {
          const data = await res.json()
          if (data.type !== 'none' && data.message) {
            nudgeMsg = data.message
          }
        }
      } catch {
        // silent
      }

      if (mountedRef.current) {
        showBubble(nudgeMsg || pickLocalGreeting())
      }
    }, NUDGE_INTERVAL_MS)

    return () => {
      if (nudgeTimerRef.current) clearInterval(nudgeTimerRef.current)
    }
  }, [visible, showBubble, pickLocalGreeting])

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
      if (nudgeTimerRef.current) clearInterval(nudgeTimerRef.current)
    }
  }, [])

  if (!visible || !message) return null

  return (
    <div
      onClick={dismiss}
      className="max-w-[200px] bg-black/80 backdrop-blur-sm border border-white/15 rounded-xl px-3 py-2 cursor-pointer animate-in fade-in slide-in-from-right-2 duration-300 relative"
      style={{ zIndex: 30 }}
    >
      {/* Speech bubble tail pointing right */}
      <div
        className="absolute top-1/2 -right-[6px] -translate-y-1/2"
        style={{
          width: 0,
          height: 0,
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderLeft: '6px solid rgba(0,0,0,0.8)',
        }}
      />
      <p className="text-[10px] font-medium mb-0.5" style={{ color: accent }}>
        {coachName}
      </p>
      <p className="text-[11px] leading-tight text-white/80">
        {message}
      </p>
    </div>
  )
}
