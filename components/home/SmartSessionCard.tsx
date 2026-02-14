'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Play, Clock, ChevronRight, X, Loader2, Wind, Music, CloudRain, Mic, SlidersHorizontal } from 'lucide-react'

interface SessionStep {
  type: 'soundscape' | 'breathing' | 'music' | 'motivation'
  id: string
  title: string
  durationMinutes: number
  reason: string
  transitionNote?: string
}

interface SmartSessionCardProps {
  isPremium: boolean
  onPlaySoundscape: (soundscapeId: string) => void
  onPlayGuide: (guideId: string) => void
  onPlayGenre: (genreId: string) => void
  onOpenUpgrade: () => void
}

const TYPE_ICONS = {
  soundscape: CloudRain,
  breathing: Wind,
  music: Music,
  motivation: Mic,
}

const TYPE_COLORS = {
  soundscape: 'text-blue-400',
  breathing: 'text-cyan-400',
  music: 'text-purple-400',
  motivation: 'text-amber-400',
}

const MOOD_OPTIONS = ['calm', 'anxious', 'energetic', 'sad', 'happy', 'tired', 'stressed', 'focused']
const ENERGY_OPTIONS = ['low', 'medium', 'high']
const TIME_OPTIONS = [10, 15, 20, 30, 45]

type ViewMode = 'collapsed' | 'form' | 'session'

export function SmartSessionCard({ isPremium, onPlaySoundscape, onPlayGuide, onPlayGenre, onOpenUpgrade }: SmartSessionCardProps) {
  const [steps, setSteps] = useState<SessionStep[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ViewMode>('collapsed')
  const [currentStep, setCurrentStep] = useState(0)

  // Custom form state
  const [mood, setMood] = useState('')
  const [energy, setEnergy] = useState('')
  const [minutes, setMinutes] = useState(20)
  const [intention, setIntention] = useState('')

  const generateSession = useCallback(async (custom: boolean) => {
    if (!isPremium) {
      onOpenUpgrade()
      return
    }

    setLoading(true)
    try {
      const hour = new Date().getHours()
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

      const body: Record<string, unknown> = custom
        ? { mood, energy, availableMinutes: minutes, intention: intention.trim() || undefined }
        : { availableMinutes: 15, timeOfDay }

      const res = await fetch('/api/ai/smart-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSteps(data.steps)
      setView('session')
      setCurrentStep(0)
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [isPremium, onOpenUpgrade, mood, energy, minutes, intention])

  const playStep = useCallback((step: SessionStep) => {
    switch (step.type) {
      case 'soundscape':
        onPlaySoundscape(step.id)
        break
      case 'breathing':
        onPlayGuide(step.id)
        break
      case 'music':
      case 'motivation':
        onPlayGenre(step.id)
        break
    }
  }, [onPlaySoundscape, onPlayGuide, onPlayGenre])

  const resetSession = () => {
    setView('collapsed')
    setSteps(null)
    setMood('')
    setEnergy('')
    setMinutes(20)
    setIntention('')
  }

  // Collapsed card
  if (view === 'collapsed') {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => generateSession(false)}
          disabled={loading}
          className="flex-1 glass-refined rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center shrink-0">
            {loading ? (
              <Loader2 className="w-5 h-5 text-purple-300 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 text-purple-300" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-white">AI Session</p>
            <p className="text-[10px] text-white/40">Personalized wellness plan</p>
          </div>
          {!isPremium && (
            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full">PRO</span>
          )}
          <ChevronRight className="w-4 h-4 text-white/30" />
        </button>
        <button
          onClick={() => isPremium ? setView('form') : onOpenUpgrade()}
          className="glass-refined rounded-2xl p-3 flex items-center justify-center active:scale-[0.98] transition-transform"
          title="Customize session"
        >
          <SlidersHorizontal className="w-4.5 h-4.5 text-purple-300" />
        </button>
      </div>
    )
  }

  // Custom form
  if (view === 'form') {
    return (
      <div className="glass-refined rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-medium text-white">Custom AI Session</h3>
          </div>
          <button onClick={resetSession} className="p-1 rounded-full hover:bg-white/10">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {/* Mood */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">How are you feeling?</label>
          <div className="flex flex-wrap gap-1.5">
            {MOOD_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all capitalize ${
                  mood === m
                    ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                    : 'bg-white/5 text-white/50 hover:text-white/70'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Energy */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Energy level</label>
          <div className="flex gap-2">
            {ENERGY_OPTIONS.map(e => (
              <button
                key={e}
                onClick={() => setEnergy(e)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all capitalize ${
                  energy === e
                    ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                    : 'bg-white/5 text-white/50 hover:text-white/70'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Available time</label>
          <div className="flex gap-1.5">
            {TIME_OPTIONS.map(t => (
              <button
                key={t}
                onClick={() => setMinutes(t)}
                className={`px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                  minutes === t
                    ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                    : 'bg-white/5 text-white/50 hover:text-white/70'
                }`}
              >
                {t}m
              </button>
            ))}
          </div>
        </div>

        {/* Optional intention */}
        <input
          type="text"
          value={intention}
          onChange={e => setIntention(e.target.value)}
          placeholder="Optional: What do you want to feel after?"
          className="w-full px-3 py-2 rounded-xl bg-white/5 text-white text-xs placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/10"
        />

        {/* Generate */}
        <button
          onClick={() => generateSession(true)}
          disabled={!mood || !energy || loading}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 text-purple-300 text-sm font-medium transition-all disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Creating your session...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate Session</>
          )}
        </button>
      </div>
    )
  }

  // Session display
  return (
    <div className="glass-refined rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-white">Your AI Session</h3>
        </div>
        <button onClick={resetSession} className="p-1 rounded-full hover:bg-white/10">
          <X className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Steps */}
      {steps && steps.map((step, i) => {
        const Icon = TYPE_ICONS[step.type as keyof typeof TYPE_ICONS] || CloudRain
        const color = TYPE_COLORS[step.type as keyof typeof TYPE_COLORS] || 'text-white/60'
        const isActive = i === currentStep

        return (
          <div key={i}>
            {i > 0 && step.transitionNote && (
              <p className="text-[10px] text-white/30 italic px-2 py-1">{step.transitionNote}</p>
            )}
            <button
              onClick={() => { setCurrentStep(i); playStep(step) }}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                isActive ? 'bg-white/10 ring-1 ring-purple-500/30' : 'bg-white/5 hover:bg-white/8'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isActive ? 'bg-purple-500/20' : 'bg-white/5'
              }`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-medium text-white">{step.title}</p>
                <p className="text-[10px] text-white/40">{step.reason}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-white/30" />
                <span className="text-[10px] text-white/40">{step.durationMinutes}m</span>
              </div>
              {isActive && (
                <Play className="w-4 h-4 text-purple-400 fill-purple-400" />
              )}
            </button>
          </div>
        )
      })}

      {/* Total + actions */}
      {steps && (
        <>
          <p className="text-[10px] text-white/30 text-center">
            Total: {steps.reduce((sum, s) => sum + s.durationMinutes, 0)} minutes
          </p>
          <button
            onClick={() => { setSteps(null); setView('form') }}
            className="w-full py-1.5 text-[10px] text-white/30 hover:text-white/50 transition-colors"
          >
            Customize & regenerate
          </button>
        </>
      )}
    </div>
  )
}
