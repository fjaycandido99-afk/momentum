'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Zap, Wind, PenLine, Target, X } from 'lucide-react'

interface SmartHomeNudgeProps {
  /** Is any audio currently playing? */
  isAudioActive: boolean
  /** Today's journal mood */
  journalMood?: string | null
  /** Whether journal was written today */
  hasJournaledToday: boolean
  /** Current streak */
  streak: number
  /** Modules completed today (count) */
  modulesCompletedToday: number
  /** Whether a daily intention was set */
  hasDailyIntention?: boolean
}

interface NudgeContent {
  icon: typeof Zap
  message: string
  action: string
  href: string
  color: string
}

function pickNudge(props: SmartHomeNudgeProps): NudgeContent | null {
  // No nudge if audio is playing — user is engaged
  if (props.isAudioActive) return null

  // Priority 1: No journal today and past morning (skip if intention already set — intention card links to journal)
  if (!props.hasJournaledToday && !props.hasDailyIntention && new Date().getHours() >= 10) {
    return {
      icon: PenLine,
      message: 'A quick journal entry can shift your whole day',
      action: 'Write now',
      href: '/journal',
      color: 'text-white',
    }
  }

  // Priority 2: No modules completed and it's afternoon
  if (props.modulesCompletedToday === 0 && new Date().getHours() >= 13) {
    return {
      icon: Target,
      message: "Your Daily Guide is waiting — just 3 minutes",
      action: 'Start guide',
      href: '/daily-guide',
      color: 'text-white',
    }
  }

  // Priority 3: Low mood — suggest breathing
  if (props.journalMood === 'awful' || props.journalMood === 'low') {
    return {
      icon: Wind,
      message: 'A short breathing session could help right now',
      action: 'Try it',
      href: '/daily-guide',
      color: 'text-white',
    }
  }

  // Priority 4: Streak at risk (low engagement today)
  if (props.streak > 0 && props.modulesCompletedToday === 0 && !props.hasJournaledToday) {
    return {
      icon: Zap,
      message: `Don't break your ${props.streak}-day streak — do something quick`,
      action: 'Keep going',
      href: '/daily-guide',
      color: 'text-white',
    }
  }

  return null
}

export function SmartHomeNudge(props: SmartHomeNudgeProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const nudge = pickNudge(props)

  // Show after 30s of idle (no audio playing)
  useEffect(() => {
    if (dismissed || !nudge || props.isAudioActive) {
      setVisible(false)
      return
    }

    timerRef.current = setTimeout(() => setVisible(true), 30000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [dismissed, nudge, props.isAudioActive])

  // Hide if audio starts
  useEffect(() => {
    if (props.isAudioActive) setVisible(false)
  }, [props.isAudioActive])

  if (!visible || !nudge) return null

  const Icon = nudge.icon

  return (
    <div className="px-6 mb-6 animate-fade-in-up">
      <div className="relative p-4 rounded-2xl border border-white/25 bg-black">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-white/60" />
        </button>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl bg-white/[0.06] shrink-0`}>
            <Icon className={`w-4 h-4 ${nudge.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 mb-2">{nudge.message}</p>
            <Link
              href={nudge.href}
              className={`text-xs font-medium ${nudge.color} hover:underline`}
            >
              {nudge.action} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
