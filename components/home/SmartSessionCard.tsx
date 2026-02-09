'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Play, Clock, ChevronRight, X, Loader2, Wind, Music, CloudRain, Mic } from 'lucide-react'

interface SessionStep {
  type: 'soundscape' | 'breathing' | 'music' | 'motivation'
  id: string
  title: string
  durationMinutes: number
  reason: string
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

export function SmartSessionCard({ isPremium, onPlaySoundscape, onPlayGuide, onPlayGenre, onOpenUpgrade }: SmartSessionCardProps) {
  const [steps, setSteps] = useState<SessionStep[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const generateSession = useCallback(async () => {
    if (!isPremium) {
      onOpenUpgrade()
      return
    }

    setLoading(true)
    try {
      const hour = new Date().getHours()
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

      const res = await fetch('/api/ai/smart-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableMinutes: 15,
          timeOfDay,
        }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSteps(data.steps)
      setExpanded(true)
      setCurrentStep(0)
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [isPremium, onOpenUpgrade])

  const playStep = useCallback((step: SessionStep) => {
    switch (step.type) {
      case 'soundscape':
        onPlaySoundscape(step.id)
        break
      case 'breathing':
        onPlayGuide(step.id)
        break
      case 'music':
        onPlayGenre(step.id)
        break
      case 'motivation':
        // Motivation plays via genre/topic in the home page
        onPlayGenre(step.id)
        break
    }
  }, [onPlaySoundscape, onPlayGuide, onPlayGenre])

  // Collapsed card
  if (!expanded) {
    return (
      <button
        onClick={generateSession}
        disabled={loading}
        className="w-full glass-refined rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
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
          <p className="text-[10px] text-white/40">Get a personalized wellness plan</p>
        </div>
        {!isPremium && (
          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full">PRO</span>
        )}
        <ChevronRight className="w-4 h-4 text-white/30" />
      </button>
    )
  }

  // Expanded with steps
  return (
    <div className="glass-refined rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-white">Your AI Session</h3>
        </div>
        <button
          onClick={() => { setExpanded(false); setSteps(null) }}
          className="p-1 rounded-full hover:bg-white/10"
        >
          <X className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Steps */}
      {steps && steps.map((step, i) => {
        const Icon = TYPE_ICONS[step.type as keyof typeof TYPE_ICONS] || CloudRain
        const color = TYPE_COLORS[step.type as keyof typeof TYPE_COLORS] || 'text-white/60'
        const isActive = i === currentStep

        return (
          <button
            key={i}
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
        )
      })}

      {/* Total duration */}
      {steps && (
        <p className="text-[10px] text-white/30 text-center">
          Total: {steps.reduce((sum, s) => sum + s.durationMinutes, 0)} minutes
        </p>
      )}
    </div>
  )
}
