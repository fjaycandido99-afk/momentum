'use client'

import { Play, Wind, Music, Mic, Timer, CloudRain } from 'lucide-react'

const STEP_ICONS: Record<string, typeof Wind> = {
  soundscape: CloudRain,
  breathing: Wind,
  motivation: Mic,
  music: Music,
  focus: Timer,
}

interface RoutineStep {
  id: string
  activity_type: string
  title: string
}

interface RoutineCardProps {
  id: string
  name: string
  icon?: string | null
  steps: RoutineStep[]
  timesCompleted: number
  onPlay: (id: string) => void
  onOpen: (id: string) => void
}

export function RoutineCard({ id, name, icon, steps, timesCompleted, onPlay, onOpen }: RoutineCardProps) {
  return (
    <button
      onClick={() => onOpen(id)}
      className="shrink-0 w-44 text-left glass-refined rounded-2xl p-4 press-scale transition-all hover:bg-white/[0.06]"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg">{icon || '🔄'}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(id) }}
          className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center press-scale hover:bg-white/25"
          aria-label={`Play ${name}`}
        >
          <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
        </button>
      </div>
      <p className="text-sm font-medium text-white mb-1 truncate">{name}</p>
      <div className="flex items-center gap-1 mb-2">
        {steps.slice(0, 4).map(step => {
          const StepIcon = STEP_ICONS[step.activity_type] || Music
          return <StepIcon key={step.id} className="w-3 h-3 text-white/40" />
        })}
        {steps.length > 4 && <span className="text-[10px] text-white/40">+{steps.length - 4}</span>}
      </div>
      <p className="text-[10px] text-white/40">{timesCompleted}x completed</p>
    </button>
  )
}
