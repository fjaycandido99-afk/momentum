'use client'

import { useState, useEffect } from 'react'
import { Flame } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'

interface EvolutionStage {
  emoji: string
  name: string
  description: string
  minDays: number
}

const EVOLUTION_STAGES: Record<MindsetId, EvolutionStage[]> = {
  stoic: [
    { emoji: '🪨', name: 'Rough Stone', description: 'Raw material. The sculptor has not yet begun.', minDays: 0 },
    { emoji: '🗿', name: 'Carved Form', description: 'A shape emerges from the stone. Intention takes hold.', minDays: 3 },
    { emoji: '🏛️', name: 'Standing Column', description: 'You bear weight now. Others may lean on your strength.', minDays: 7 },
    { emoji: '⚔️', name: 'Philosopher King', description: 'Wisdom and power in balance. Marcus would nod.', minDays: 14 },
    { emoji: '👑', name: 'Marble Immortal', description: 'Your virtue is carved in stone that outlasts empires.', minDays: 30 },
  ],
  existentialist: [
    { emoji: '✨', name: 'Single Star', description: 'A spark of awareness in the infinite dark.', minDays: 0 },
    { emoji: '🌟', name: 'Scattered Stars', description: 'Points of meaning begin to appear — scattered, searching.', minDays: 3 },
    { emoji: '⭐', name: 'Connected Pattern', description: 'Lines form between stars. Your constellation takes shape.', minDays: 7 },
    { emoji: '🌌', name: 'Galaxy', description: 'A spiral of purpose — vast, complex, uniquely yours.', minDays: 14 },
    { emoji: '💫', name: 'Supernova', description: 'You burn so brightly that your light creates new stars.', minDays: 30 },
  ],
  cynic: [
    { emoji: '💨', name: 'Spark', description: 'A tiny ember. The question has been asked.', minDays: 0 },
    { emoji: '🕯️', name: 'Candle', description: 'A steady flame. You see through one illusion.', minDays: 3 },
    { emoji: '🔥', name: 'Bonfire', description: 'Convention burns. Others notice your warmth.', minDays: 7 },
    { emoji: '☄️', name: 'Inferno', description: 'Nothing false survives your presence.', minDays: 14 },
    { emoji: '🌋', name: 'Eternal Flame', description: 'A beacon that burns away the fog for miles. Diogenes found his honest person.', minDays: 30 },
  ],
  hedonist: [
    { emoji: '🌱', name: 'Seed', description: 'Planted in the earth. Potential sleeps beneath the surface.', minDays: 0 },
    { emoji: '🌿', name: 'Sprout', description: 'Green shoots push through. You taste the first pleasures of growth.', minDays: 3 },
    { emoji: '🌸', name: 'Flowering', description: 'Beauty unfolds. Friends gather in your garden.', minDays: 7 },
    { emoji: '🌳', name: 'Orchard', description: 'Abundance and shade. Your roots run deep.', minDays: 14 },
    { emoji: '🏝️', name: 'Paradise Garden', description: 'Epicurus himself would tend this garden with joy.', minDays: 30 },
  ],
  samurai: [
    { emoji: '⛏️', name: 'Raw Ore', description: 'Unrefined metal pulled from the mountain.', minDays: 0 },
    { emoji: '🔨', name: 'Forged Steel', description: 'Heated and hammered. The blade begins to take shape.', minDays: 3 },
    { emoji: '🗡️', name: 'Shaped Blade', description: 'Edge and form align. You cut through distraction.', minDays: 7 },
    { emoji: '⚔️', name: 'Polished Katana', description: 'Mirror-bright and deadly sharp. The warrior is nearly complete.', minDays: 14 },
    { emoji: '🏆', name: 'Legendary Blade', description: 'A weapon spoken of in stories — your name echoes through dojos.', minDays: 30 },
  ],
  scholar: [
    { emoji: '🔮', name: 'Dreamer', description: 'The unconscious stirs. You have begun to listen.', minDays: 0 },
    { emoji: '🌙', name: 'Shadow Walker', description: 'You face what others deny. Integration begins.', minDays: 3 },
    { emoji: '🪞', name: 'Mirror Gazer', description: 'You see the archetypes at work. Self-knowledge deepens.', minDays: 7 },
    { emoji: '🌌', name: 'Depth Diver', description: 'The collective unconscious opens its library to you.', minDays: 14 },
    { emoji: '☀️', name: 'Individuated Soul', description: 'Jung would recognize a fellow traveler of the deep.', minDays: 30 },
  ],
}

const ACCENT_STYLES: Record<MindsetId, { active: string; bar: string; glow: string }> = {
  stoic: { active: 'bg-slate-400/15 border-slate-400/25', bar: 'bg-slate-400/40', glow: 'rgba(148,163,184,0.1)' },
  existentialist: { active: 'bg-violet-400/15 border-violet-400/25', bar: 'bg-violet-400/40', glow: 'rgba(167,139,250,0.1)' },
  cynic: { active: 'bg-orange-400/15 border-orange-400/25', bar: 'bg-orange-400/40', glow: 'rgba(251,146,60,0.1)' },
  hedonist: { active: 'bg-emerald-400/15 border-emerald-400/25', bar: 'bg-emerald-400/40', glow: 'rgba(52,211,153,0.1)' },
  samurai: { active: 'bg-red-400/15 border-red-400/25', bar: 'bg-red-400/40', glow: 'rgba(248,113,113,0.1)' },
  scholar: { active: 'bg-blue-400/15 border-blue-400/25', bar: 'bg-blue-400/40', glow: 'rgba(147,197,253,0.1)' },
}

function getCurrentStage(stages: EvolutionStage[], streak: number): number {
  let current = 0
  for (let i = 0; i < stages.length; i++) {
    if (streak >= stages[i].minDays) current = i
  }
  return current
}

interface StreakEvolutionProps {
  mindsetId: MindsetId
}

export function StreakEvolution({ mindsetId }: StreakEvolutionProps) {
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/path/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.streak !== undefined) setStreak(d.streak)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const stages = EVOLUTION_STAGES[mindsetId]
  const style = ACCENT_STYLES[mindsetId]
  const currentStage = getCurrentStage(stages, streak)
  const stage = stages[currentStage]
  const nextStage = stages[currentStage + 1]

  // Progress to next stage
  const progressToNext = nextStage
    ? Math.min(1, (streak - stage.minDays) / (nextStage.minDays - stage.minDays))
    : 1

  if (loading) {
    return (
      <div className="card-path p-5">
        <div className="h-40 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-white/25 border-t-white/60 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-white/5">
          <Flame className="w-4 h-4 text-white/85" />
        </div>
        <h3 className="text-sm font-medium text-white">Evolution</h3>
        <span className="text-[10px] text-white/60 ml-auto">{streak} day streak</span>
      </div>

      {/* Current stage hero */}
      <div className="flex flex-col items-center mb-5">
        <div
          className="relative mb-3"
          style={{
            filter: currentStage >= 3 ? 'drop-shadow(0 0 12px ' + style.glow + ')' : undefined,
          }}
        >
          <span
            className={`text-5xl block ${currentStage >= 4 ? 'animate-[evolve-glow_3s_ease-in-out_infinite]' : ''}`}
          >
            {stage.emoji}
          </span>
          {/* Particle effects for higher stages */}
          {currentStage >= 2 && (
            <div className="absolute inset-0 flex items-center justify-center">
              {Array.from({ length: currentStage }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-white/20"
                  style={{
                    animation: `float ${2 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                    top: `${-5 - i * 4}px`,
                    left: `${45 + (i * 13) % 20}%`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <p className="text-sm font-medium text-white">{stage.name}</p>
        <p className="text-xs text-white/70 text-center mt-1 max-w-[240px] leading-relaxed">
          {stage.description}
        </p>
      </div>

      {/* Progress to next */}
      {nextStage && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[10px] text-white/60 mb-1.5">
            <span>Next: {nextStage.name}</span>
            <span>{nextStage.minDays - streak} days to go</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full ${style.bar} transition-all duration-700`}
              style={{ width: `${progressToNext * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Stage timeline */}
      <div className="flex items-center justify-between gap-1">
        {stages.map((s, i) => {
          const unlocked = i <= currentStage
          return (
            <div key={i} className="flex flex-col items-center flex-1">
              <span
                className={`text-lg transition-all duration-500 ${
                  unlocked ? '' : 'grayscale opacity-30'
                } ${i === currentStage ? 'scale-110' : ''}`}
              >
                {s.emoji}
              </span>
              <span className={`text-[8px] mt-0.5 ${unlocked ? 'text-white/70' : 'text-white/20'}`}>
                {s.minDays}d
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
