'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Sparkles, Play, Clock, ChevronRight, X, Loader2, Wind, Music, CloudRain, Mic, SlidersHorizontal, Check, AlertCircle, ThumbsUp, ThumbsDown, Moon, Sun, Target, Zap } from 'lucide-react'

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

const QUICK_PRESETS = [
  { id: 'wind-down', label: 'Wind Down', icon: Moon },
  { id: 'morning-energy', label: 'Morning', icon: Sun },
  { id: 'focus-mode', label: 'Focus', icon: Target },
  { id: 'stress-relief', label: 'De-stress', icon: Wind },
  { id: 'quick-reset', label: 'Quick Reset', icon: Zap },
] as const

type ViewMode = 'collapsed' | 'form' | 'session'

export function SmartSessionCard({ isPremium, onPlaySoundscape, onPlayGuide, onPlayGenre, onOpenUpgrade }: SmartSessionCardProps) {
  const [steps, setSteps] = useState<SessionStep[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ViewMode>('collapsed')
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [rated, setRated] = useState(false)
  const [showAdvanceNudge, setShowAdvanceNudge] = useState(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Custom form state
  const [mood, setMood] = useState('')
  const [energy, setEnergy] = useState('')
  const [minutes, setMinutes] = useState(20)
  const [intention, setIntention] = useState('')

  // Auto-advance nudge timer
  useEffect(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
    setShowAdvanceNudge(false)

    if (steps && currentStep < steps.length) {
      const ms = steps[currentStep].durationMinutes * 60 * 1000
      advanceTimerRef.current = setTimeout(() => {
        setShowAdvanceNudge(true)
      }, ms)
    }

    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [currentStep, steps])

  const generateSession = useCallback(async (mode: 'quick' | 'custom' | string) => {
    if (!isPremium) {
      onOpenUpgrade()
      return
    }

    setLoading(true)
    setError(false)
    setCompletedSteps(new Set())
    setRated(false)
    try {
      const hour = new Date().getHours()
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

      let body: Record<string, unknown>
      if (mode === 'custom') {
        body = { mood, energy, availableMinutes: minutes, intention: intention.trim() || undefined }
      } else if (mode === 'quick') {
        body = { availableMinutes: 15, timeOfDay }
      } else {
        // Preset mode
        body = { preset: mode, timeOfDay }
      }

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
      setError(true)
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

  const toggleStepComplete = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCompletedSteps(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const rateSession = useCallback(async (rating: 'good' | 'bad') => {
    setRated(true)
    try {
      await fetch('/api/ai/smart-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })
    } catch {
      // Non-critical
    }
  }, [])

  const advanceToNextStep = useCallback(() => {
    if (steps && currentStep < steps.length - 1) {
      const next = currentStep + 1
      setCurrentStep(next)
      playStep(steps[next])
      setShowAdvanceNudge(false)
    }
  }, [steps, currentStep, playStep])

  const resetSession = () => {
    setView('collapsed')
    setSteps(null)
    setMood('')
    setEnergy('')
    setMinutes(20)
    setIntention('')
    setError(false)
    setCompletedSteps(new Set())
    setRated(false)
    setShowAdvanceNudge(false)
  }

  // Error state
  if (error && view !== 'form') {
    return (
      <div className="glass-refined rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-sm text-white/85">Couldn&apos;t generate your session</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setError(false); generateSession('quick') }}
            className="flex-1 py-2 rounded-xl bg-purple-500/15 text-purple-300 text-xs font-medium active:scale-[0.98] transition-transform"
          >
            Try again
          </button>
          <button
            onClick={resetSession}
            className="px-3 py-2 rounded-xl bg-white/5 text-white/60 text-xs active:scale-[0.98] transition-transform"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  // Collapsed card with presets
  if (view === 'collapsed') {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => generateSession('quick')}
            disabled={loading}
            className={`flex-1 glass-refined rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform ${loading ? 'shimmer-skeleton' : ''}`}
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
              <p className="text-[10px] text-white/60">Personalized wellness plan</p>
            </div>
            {!isPremium && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full">PRO</span>
            )}
            <ChevronRight className="w-4 h-4 text-white/50" />
          </button>
          <button
            onClick={() => isPremium ? setView('form') : onOpenUpgrade()}
            className="glass-refined rounded-2xl p-3 flex items-center justify-center active:scale-[0.98] transition-transform"
            title="Customize session"
          >
            <SlidersHorizontal className="w-4.5 h-4.5 text-white" />
          </button>
        </div>

        {/* Quick presets */}
        {isPremium && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 pr-1">
            {QUICK_PRESETS.map(preset => {
              const Icon = preset.icon
              return (
                <button
                  key={preset.id}
                  onClick={() => generateSession(preset.id)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.96] transition-all shrink-0 disabled:opacity-30"
                >
                  <Icon className="w-3 h-3 text-white/70" />
                  <span className="text-[10px] text-white/70 whitespace-nowrap">{preset.label}</span>
                </button>
              )
            })}
            <div className="shrink-0 w-1" />
          </div>
        )}
      </div>
    )
  }

  // Custom form
  if (view === 'form') {
    return (
      <div className={`glass-refined rounded-2xl p-4 space-y-3 ${loading ? 'shimmer-skeleton' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-medium text-white">Custom AI Session</h3>
          </div>
          <button onClick={resetSession} className="p-1 rounded-full hover:bg-white/10">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Error in form mode */}
        {error && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-500/10">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-[10px] text-red-300">Failed to generate. Check your connection and try again.</p>
          </div>
        )}

        {/* Mood */}
        <div>
          <label className="text-[10px] text-white/60 uppercase tracking-wider mb-1.5 block">How are you feeling?</label>
          <div className="flex flex-wrap gap-1.5">
            {MOOD_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all capitalize ${
                  mood === m
                    ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                    : 'bg-white/5 text-white/70 hover:text-white/85'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Energy */}
        <div>
          <label className="text-[10px] text-white/60 uppercase tracking-wider mb-1.5 block">Energy level</label>
          <div className="flex gap-2">
            {ENERGY_OPTIONS.map(e => (
              <button
                key={e}
                onClick={() => setEnergy(e)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all capitalize ${
                  energy === e
                    ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                    : 'bg-white/5 text-white/70 hover:text-white/85'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div>
          <label className="text-[10px] text-white/60 uppercase tracking-wider mb-1.5 block">Available time</label>
          <div className="flex gap-1.5">
            {TIME_OPTIONS.map(t => (
              <button
                key={t}
                onClick={() => setMinutes(t)}
                className={`px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                  minutes === t
                    ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                    : 'bg-white/5 text-white/70 hover:text-white/85'
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
          className="w-full px-3 py-2 rounded-xl bg-white/5 text-white text-xs placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/10 input-focus-glow"
        />

        {/* Generate */}
        <button
          onClick={() => generateSession('custom')}
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
  const allComplete = steps ? completedSteps.size === steps.length : false

  return (
    <div className="glass-refined rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-white">Your AI Session</h3>
        </div>
        <button onClick={resetSession} className="p-1 rounded-full hover:bg-white/10">
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Progress bar */}
      {steps && steps.length > 0 && (
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-purple-500/50 transition-all duration-500"
            style={{ width: `${(completedSteps.size / steps.length) * 100}%` }}
          />
        </div>
      )}

      {/* Steps */}
      {steps && steps.map((step, i) => {
        const Icon = TYPE_ICONS[step.type as keyof typeof TYPE_ICONS] || CloudRain
        const color = TYPE_COLORS[step.type as keyof typeof TYPE_COLORS] || 'text-white/75'
        const isActive = i === currentStep
        const isComplete = completedSteps.has(i)

        return (
          <div key={i}>
            {i > 0 && step.transitionNote && (
              <p className="text-[10px] text-white/50 italic px-2 py-1">{step.transitionNote}</p>
            )}
            <div className="flex items-center gap-1.5">
              {/* Checkmark button */}
              <button
                onClick={(e) => toggleStepComplete(i, e)}
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                  isComplete
                    ? 'bg-purple-500/30 border-purple-500/50'
                    : 'border-white/15 hover:border-white/30'
                }`}
              >
                {isComplete && <Check className="w-3 h-3 text-purple-300" />}
              </button>

              {/* Step button */}
              <button
                onClick={() => { setCurrentStep(i); playStep(step); setShowAdvanceNudge(false) }}
                className={`flex-1 flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                  isActive ? 'bg-white/10 ring-1 ring-purple-500/30' : 'bg-white/5 hover:bg-white/8'
                } ${isComplete ? 'opacity-60' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-purple-500/20' : 'bg-white/5'
                }`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-xs font-medium text-white ${isComplete ? 'line-through opacity-70' : ''}`}>{step.title}</p>
                  <p className="text-[10px] text-white/60">{step.reason}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-white/50" />
                  <span className="text-[10px] text-white/60">{step.durationMinutes}m</span>
                </div>
                {isActive && !isComplete && (
                  <Play className="w-4 h-4 text-purple-400 fill-purple-400" />
                )}
              </button>
            </div>

            {/* Auto-advance nudge */}
            {isActive && showAdvanceNudge && currentStep < (steps?.length ?? 0) - 1 && (
              <button
                onClick={advanceToNextStep}
                className="ml-6.5 mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 active:scale-[0.97] transition-all"
              >
                <span className="text-[10px] text-purple-300">Ready for the next step?</span>
                <ChevronRight className="w-3 h-3 text-purple-300" />
              </button>
            )}
          </div>
        )
      })}

      {/* Session rating */}
      {allComplete && !rated && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <span className="text-[10px] text-white/60">How was this session?</span>
          <button
            onClick={() => rateSession('good')}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-green-500/15 active:scale-[0.95] transition-all"
          >
            <ThumbsUp className="w-3.5 h-3.5 text-white/70 hover:text-green-400" />
          </button>
          <button
            onClick={() => rateSession('bad')}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 active:scale-[0.95] transition-all"
          >
            <ThumbsDown className="w-3.5 h-3.5 text-white/70 hover:text-red-400" />
          </button>
        </div>
      )}

      {rated && (
        <p className="text-[10px] text-white/50 text-center">Thanks for the feedback!</p>
      )}

      {/* Total + actions */}
      {steps && (
        <>
          <p className="text-[10px] text-white/50 text-center">
            {completedSteps.size > 0 && `${completedSteps.size}/${steps.length} complete · `}
            Total: {steps.reduce((sum, s) => sum + s.durationMinutes, 0)} minutes
          </p>
          <button
            onClick={() => { setSteps(null); setView('form'); setError(false) }}
            className="w-full py-1.5 text-[10px] text-white/50 hover:text-white/70 transition-colors"
          >
            Customize & regenerate
          </button>
        </>
      )}
    </div>
  )
}
