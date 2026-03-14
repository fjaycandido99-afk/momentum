'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Sunrise,
  Sun,
  Sunset,
  BookOpen,
  Play,
  Check,
  Loader2,
} from 'lucide-react'
import type { SessionType } from '@/lib/daily-guide/decision-tree'
import { SessionPlayer } from './SessionPlayer'


// Session visual config
const SESSION_CONFIG: Record<SessionType, {
  icon: typeof Sunrise
  label: string
  tagline: string
  theme: string
  iconColor: string
  iconBg: string
  defaultPreview: string
}> = {
  morning_prime: {
    icon: Sunrise,
    label: 'Morning Prime',
    tagline: 'Wake up, set intention, energy',
    theme: 'MORNING',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/15',
    defaultPreview: '"A new day, a fresh start. You don\'t need to feel ready... you just need to begin."',
  },
  midday_reset: {
    icon: Sun,
    label: 'Midday Reset',
    tagline: 'Recharge, affirm, refocus',
    theme: 'MIDDAY',
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/15',
    defaultPreview: '"Pause. Breathe. You\'re halfway through. Reset and keep going."',
  },
  wind_down: {
    icon: Sunset,
    label: 'Wind Down',
    tagline: 'Reflect, release, ground',
    theme: 'EVENING',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/15',
    defaultPreview: '"The day is done. Let go of what you couldn\'t control. You showed up."',
  },
  bedtime_story: {
    icon: BookOpen,
    label: 'Bedtime Story',
    tagline: 'Motivational sleep story',
    theme: 'NIGHT',
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/15',
    defaultPreview: '"Once upon a time... in a land where the earth was perfectly flat..."',
  },
}

function extractPreview(script: string | null, defaultPreview: string): string {
  if (!script) return defaultPreview
  const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 20 && s.trim().length < 100)
  if (sentences.length > 0) {
    const hookSentence = sentences[Math.min(1, sentences.length - 1)]?.trim()
    if (hookSentence) return `"${hookSentence}..."`
  }
  return defaultPreview
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  if (minutes === 0) return `${seconds}s`
  return `${minutes} min`
}

interface SessionCardProps {
  session: SessionType
  script: string | null
  duration: number
  isCompleted: boolean
  isLoading: boolean
  isCurrent: boolean
  onPlay: () => void
  onComplete?: () => void
  audioBase64?: string | null
  textOnly?: boolean
}

export function SessionCard({
  session,
  script,
  duration,
  isCompleted,
  isLoading,
  isCurrent,
  onPlay,
  onComplete,
  audioBase64,
  textOnly,
}: SessionCardProps) {
  const config = SESSION_CONFIG[session]
  const Icon = config.icon
  const [showPlayer, setShowPlayer] = useState(false)
  const waitingForAudioRef = useRef(false)

  const handlePlay = () => {
    if (isLoading) return

    if (audioBase64) {
      // Audio ready — open immersive player
      setShowPlayer(true)
    } else {
      // No audio yet — trigger generation/fetch, flag that we're waiting
      waitingForAudioRef.current = true
      onPlay()
    }
  }

  // Auto-open player when audio arrives after user clicked play
  useEffect(() => {
    if (waitingForAudioRef.current && audioBase64 && !isLoading && !isCompleted) {
      waitingForAudioRef.current = false
      setShowPlayer(true)
    }
  }, [audioBase64, isLoading, isCompleted])

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isCurrent && !isCompleted
          ? 'border-white/20 bg-black'
          : isCompleted
            ? 'border-emerald-500/20 bg-black'
            : 'border-white/10 bg-black opacity-60'
      }`}>
        {/* Content */}
        <div className="relative z-10 p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                isCompleted
                  ? 'bg-emerald-500/15'
                  : config.iconBg
              }`}>
                {isCompleted ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Icon className={`w-5 h-5 ${config.iconColor}`} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-base">{config.label}</h3>
                  {isCurrent && !isCompleted && (
                    <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-white/10 text-white/70 rounded-full">
                      Now
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/50 mt-0.5">{config.tagline}</p>
              </div>
            </div>

            <span className="text-xs text-white/40 mt-1">{formatDuration(duration)}</span>
          </div>

          {/* Preview text */}
          <p className="text-sm text-white/60 leading-relaxed mb-4 line-clamp-2">
            {extractPreview(script, config.defaultPreview)}
          </p>

          {/* Action */}
          {!isCompleted && (
            <button
              onClick={handlePlay}
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                isCurrent
                  ? 'bg-white/10 hover:bg-white/15 text-white backdrop-blur-sm'
                  : 'bg-white/5 hover:bg-white/10 text-white/70'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Play {config.label}</span>
                </>
              )}
            </button>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <Check className="w-4 h-4" />
              <span>Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen immersive player — portal to body so fixed positioning works */}
      {showPlayer && createPortal(
        <SessionPlayer
          session={session}
          script={script || config.defaultPreview}
          audioBase64={audioBase64 || null}
          duration={duration}
          onClose={() => setShowPlayer(false)}
          onComplete={() => {
            setShowPlayer(false)
            onComplete?.()
          }}
        />,
        document.body
      )}
    </>
  )
}

// Timeline component showing all 4 sessions
interface SessionTimelineProps {
  sessions: {
    id: SessionType
    status: 'completed' | 'current' | 'upcoming' | 'missed'
  }[]
  onSelect: (session: SessionType) => void
  activeSession: SessionType
}

export function SessionTimeline({ sessions, onSelect, activeSession }: SessionTimelineProps) {
  return (
    <div className="flex items-center justify-between px-2 py-3">
      {sessions.map((s, i) => {
        const config = SESSION_CONFIG[s.id]
        const Icon = config.icon
        const isActive = s.id === activeSession
        const isLast = i === sessions.length - 1

        return (
          <div key={s.id} className="flex items-center flex-1">
            <button
              onClick={() => onSelect(s.id)}
              className={`flex flex-col items-center gap-1.5 transition-all ${
                isActive ? 'scale-110' : 'opacity-60 hover:opacity-80'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                s.status === 'completed'
                  ? 'bg-emerald-500/20 ring-2 ring-emerald-500/40'
                  : s.status === 'current'
                    ? 'bg-white/15 ring-2 ring-white/30'
                    : s.status === 'missed'
                      ? 'bg-white/5 ring-1 ring-white/10'
                      : 'bg-white/5 ring-1 ring-white/10'
              }`}>
                {s.status === 'completed' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Icon className={`w-4 h-4 ${s.status === 'current' ? 'text-white' : 'text-white/50'}`} />
                )}
              </div>
              <span className={`text-[10px] font-medium ${
                isActive ? 'text-white' : 'text-white/40'
              }`}>
                {config.label.split(' ')[0]}
              </span>
            </button>

            {/* Connector line */}
            {!isLast && (
              <div className={`flex-1 h-px mx-1 ${
                s.status === 'completed' ? 'bg-emerald-500/30' : 'bg-white/10'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
