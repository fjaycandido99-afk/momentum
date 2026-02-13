'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'

const DURATIONS = [
  { label: '1m', seconds: 60 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
]

const RITUAL_NAMES: Record<Exclude<MindsetId, 'scholar'>, string> = {
  stoic: 'Premeditatio',
  existentialist: 'Contemplation',
  cynic: 'Vigil',
  hedonist: 'Savor',
  samurai: 'Zazen',
}

const RITUAL_PROMPTS: Record<Exclude<MindsetId, 'scholar'>, string> = {
  stoic: 'Close your eyes. Imagine the day ahead — what could go wrong, and how will you respond with virtue?',
  existentialist: 'Sit with the silence. No distractions, no purpose — just existence. Notice what surfaces.',
  cynic: 'Watch the flame of your attention. Let everything unnecessary burn away. What remains?',
  hedonist: 'Breathe deeply. Notice one sensation — warmth, air, sound. Savor this present moment.',
  samurai: 'Still your mind. Each breath is a sword stroke — precise, deliberate, complete.',
}

// ── Unique visual per mindset ──

function StoicTimerVisual({ progress }: { progress: number }) {
  // Stone hourglass — sand fills bottom circle
  const topHeight = Math.max(0, 1 - progress) * 100
  const bottomHeight = progress * 100
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Top chamber */}
      <div className="w-16 h-16 rounded-full border border-white/15 relative overflow-hidden">
        <div
          className="absolute bottom-0 w-full bg-gradient-to-t from-stone-400/30 to-stone-300/10 transition-all duration-1000"
          style={{ height: `${topHeight}%` }}
        />
      </div>
      {/* Neck */}
      <div className="w-1 h-2 bg-white/10" />
      {/* Bottom chamber */}
      <div className="w-16 h-16 rounded-full border border-white/15 relative overflow-hidden">
        <div
          className="absolute bottom-0 w-full bg-gradient-to-t from-stone-300/30 to-stone-400/15 transition-all duration-1000"
          style={{ height: `${bottomHeight}%` }}
        />
      </div>
    </div>
  )
}

function ExistentialistTimerVisual({ progress }: { progress: number }) {
  // Dissolving circle — ring fades as time passes
  const opacity = Math.max(0.1, 1 - progress * 0.8)
  const dashOffset = 283 * progress // circumference ≈ 283 for r=45
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg width="112" height="112" viewBox="0 0 112 112" className="absolute">
        {/* Background ring */}
        <circle cx="56" cy="56" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
        {/* Progress ring dissolving */}
        <circle
          cx="56" cy="56" r="45" fill="none"
          stroke={`rgba(167,139,250,${opacity})`}
          strokeWidth="2"
          strokeDasharray="283"
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 56 56)"
          className="transition-all duration-1000"
        />
      </svg>
      <span className="text-lg opacity-20 animate-[breathe_5s_ease-in-out_infinite]">🌀</span>
    </div>
  )
}

function CynicTimerVisual({ progress }: { progress: number }) {
  // Candle burning down
  const candleHeight = Math.max(8, (1 - progress) * 100)
  return (
    <div className="flex flex-col items-center">
      {/* Flame */}
      <div className="animate-[flicker_1.5s_ease-in-out_infinite] mb-0.5">
        <div className="w-3 h-5 rounded-full bg-gradient-to-t from-orange-400/50 to-yellow-300/30" />
      </div>
      {/* Wick */}
      <div className="w-px h-2 bg-white/30" />
      {/* Candle body */}
      <div className="relative w-8 overflow-hidden rounded-sm" style={{ height: '80px' }}>
        <div
          className="absolute bottom-0 w-full bg-gradient-to-t from-amber-100/20 to-amber-50/10 transition-all duration-1000 rounded-b-sm"
          style={{ height: `${candleHeight}%` }}
        />
        <div className="absolute inset-0 border border-white/10 rounded-sm" />
      </div>
      {/* Holder */}
      <div className="w-12 h-1.5 bg-white/10 rounded-full mt-0.5" />
    </div>
  )
}

function HedonistTimerVisual({ progress }: { progress: number }) {
  // Tea cup filling with liquid
  const fillHeight = progress * 100
  return (
    <div className="flex flex-col items-center">
      {/* Steam */}
      {progress < 1 && (
        <div className="flex gap-2 mb-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-0.5 h-4 rounded-full bg-white/15"
              style={{
                animation: `steam-rise 2s ease-out infinite`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}
      {/* Cup */}
      <div className="relative w-20 h-16 rounded-b-2xl border border-white/15 border-t-0 overflow-hidden">
        {/* Rim */}
        <div className="absolute -top-px left-0 right-0 h-px bg-white/20" />
        {/* Liquid */}
        <div
          className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-400/20 to-emerald-300/10 transition-all duration-1000"
          style={{ height: `${fillHeight}%` }}
        />
      </div>
      {/* Handle */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 border border-white/10 rounded-r-full border-l-0" style={{ display: 'none' }} />
      {/* Saucer */}
      <div className="w-24 h-1 bg-white/10 rounded-full mt-0.5" />
    </div>
  )
}

function SamuraiTimerVisual({ progress }: { progress: number }) {
  // Incense stick burning down with smoke trail
  const stickHeight = Math.max(5, (1 - progress) * 100)
  return (
    <div className="flex flex-col items-center">
      {/* Smoke */}
      <div className="flex gap-1 mb-1">
        {[0, 1].map(i => (
          <div
            key={i}
            className="w-0.5 rounded-full bg-white/10"
            style={{
              height: '20px',
              animation: `smoke-drift 3s ease-out infinite`,
              animationDelay: `${i * 1}s`,
            }}
          />
        ))}
      </div>
      {/* Ember tip */}
      <div className="w-1.5 h-1.5 rounded-full bg-red-400/50 animate-[flicker_2s_ease-in-out_infinite]" />
      {/* Incense stick */}
      <div className="relative w-1 overflow-hidden" style={{ height: '70px' }}>
        <div
          className="absolute top-0 w-full bg-gradient-to-b from-red-400/20 to-amber-800/15 transition-all duration-1000"
          style={{ height: `${stickHeight}%` }}
        />
      </div>
      {/* Holder */}
      <div className="w-10 h-2 bg-white/10 rounded-full mt-0.5" />
    </div>
  )
}

const TIMER_VISUALS: Record<Exclude<MindsetId, 'scholar'>, React.FC<{ progress: number }>> = {
  stoic: StoicTimerVisual,
  existentialist: ExistentialistTimerVisual,
  cynic: CynicTimerVisual,
  hedonist: HedonistTimerVisual,
  samurai: SamuraiTimerVisual,
}

const ACCENT: Record<Exclude<MindsetId, 'scholar'>, string> = {
  stoic: 'bg-white/10 border-white/20 text-white',
  existentialist: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
  cynic: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
  hedonist: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  samurai: 'bg-red-500/10 border-red-500/20 text-red-300',
}

// ── Main ──

interface DailyRitualTimerProps {
  mindsetId: Exclude<MindsetId, 'scholar'>
}

export function DailyRitualTimer({ mindsetId }: DailyRitualTimerProps) {
  const [selectedDuration, setSelectedDuration] = useState(1) // index
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [running, setRunning] = useState(false)
  const [complete, setComplete] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalRef = useRef(0)

  const TimerVisual = TIMER_VISUALS[mindsetId]
  const accent = ACCENT[mindsetId]
  const progress = totalRef.current > 0 ? 1 - secondsLeft / totalRef.current : 0

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const startTimer = useCallback(() => {
    const dur = DURATIONS[selectedDuration].seconds
    totalRef.current = dur
    setSecondsLeft(dur)
    setRunning(true)
    setComplete(false)
  }, [selectedDuration])

  const togglePause = () => setRunning(r => !r)

  const reset = () => {
    setRunning(false)
    setComplete(false)
    setSecondsLeft(0)
    totalRef.current = 0
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            setRunning(false)
            setComplete(true)
            // Vibrate on complete if supported
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([200, 100, 200])
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, secondsLeft])

  const isActive = secondsLeft > 0 || complete

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-base">🕯️</span>
        <div>
          <h3 className="text-sm font-medium text-white">{RITUAL_NAMES[mindsetId]}</h3>
          <span className="text-[10px] text-white/60">Ritual Timer</span>
        </div>
      </div>

      {!isActive ? (
        <>
          <p className="text-xs text-white/80 mb-4 leading-relaxed">{RITUAL_PROMPTS[mindsetId]}</p>

          {/* Duration selector */}
          <div className="flex gap-2 mb-4">
            {DURATIONS.map((d, i) => (
              <button
                key={d.label}
                onClick={() => setSelectedDuration(i)}
                className={`flex-1 py-2 text-[11px] rounded-lg border transition-all press-scale ${
                  i === selectedDuration ? accent : 'bg-white/[0.02] border-white/[0.08] text-white/70'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            onClick={startTimer}
            className={`w-full py-2.5 text-xs rounded-lg border transition-all press-scale ${accent}`}
          >
            Begin Ritual
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center">
          {/* Visual */}
          <div className="my-4">
            <TimerVisual progress={progress} />
          </div>

          {/* Time display */}
          <p className={`text-2xl font-light tabular-nums mb-1 ${complete ? 'text-white/60' : 'text-white'}`}>
            {complete ? 'Complete' : formatTime(secondsLeft)}
          </p>

          {complete ? (
            <div className="text-center animate-fade-in mt-2">
              <p className="text-xs text-white/70 mb-3">Return to the world, changed.</p>
              <button
                onClick={reset}
                className="px-4 py-2 text-[11px] rounded-lg bg-white/[0.06] border border-white/[0.1] text-white/80 transition-all press-scale"
              >
                New session
              </button>
            </div>
          ) : (
            <div className="flex gap-3 mt-3">
              <button
                onClick={togglePause}
                className="p-2.5 rounded-full bg-white/[0.06] border border-white/[0.1] transition-all press-scale"
              >
                {running ? <Pause className="w-4 h-4 text-white/60" /> : <Play className="w-4 h-4 text-white/60" />}
              </button>
              <button
                onClick={reset}
                className="p-2.5 rounded-full bg-white/[0.06] border border-white/[0.1] transition-all press-scale"
              >
                <RotateCcw className="w-4 h-4 text-white/40" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
