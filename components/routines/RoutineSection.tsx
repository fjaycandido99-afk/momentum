'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { RoutineCard } from './RoutineCard'
import { RoutineBuilder } from './RoutineBuilder'
import { RoutinePlayer } from './RoutinePlayer'

interface RoutineStep {
  id: string
  activity_type: string
  activity_id: string
  title: string
  subtitle?: string | null
  duration_minutes?: number | null
}

interface RoutineData {
  id: string
  name: string
  icon?: string | null
  steps: RoutineStep[]
  times_completed: number
}

export function RoutineSection() {
  const [routines, setRoutines] = useState<RoutineData[]>([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [playingRoutine, setPlayingRoutine] = useState<RoutineData | null>(null)

  const fetchRoutines = () => {
    fetch('/api/routines')
      .then(r => r.ok ? r.json() : { routines: [] })
      .then(data => setRoutines(data.routines || []))
      .catch(() => {})
  }

  useEffect(() => { fetchRoutines() }, [])

  if (routines.length === 0 && !showBuilder) {
    return (
      <div className="mb-8 liquid-reveal section-fade-bg">
        <h2 className="text-lg font-semibold text-white px-6 mb-4 parallax-header">Routines</h2>
        <div className="px-6">
          <button
            onClick={() => setShowBuilder(true)}
            className="w-full py-6 rounded-2xl border border-dashed border-white/15 hover:bg-white/5 flex flex-col items-center gap-2 transition-colors press-scale"
          >
            <Plus className="w-6 h-6 text-white/30" />
            <span className="text-sm text-white/50">Create your first routine</span>
          </button>
        </div>
        {showBuilder && (
          <RoutineBuilder
            onClose={() => setShowBuilder(false)}
            onCreated={fetchRoutines}
          />
        )}
      </div>
    )
  }

  return (
    <div className="mb-8 liquid-reveal section-fade-bg">
      <h2 className="text-lg font-semibold text-white px-6 mb-4 parallax-header">Routines</h2>
      <div className="flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide">
        {routines.map(routine => (
          <RoutineCard
            key={routine.id}
            id={routine.id}
            name={routine.name}
            icon={routine.icon}
            steps={routine.steps}
            timesCompleted={routine.times_completed}
            onPlay={(id) => {
              const r = routines.find(rt => rt.id === id)
              if (r) setPlayingRoutine(r)
            }}
            onOpen={(id) => {
              const r = routines.find(rt => rt.id === id)
              if (r) setPlayingRoutine(r)
            }}
          />
        ))}
        <button
          onClick={() => setShowBuilder(true)}
          className="shrink-0 w-44 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 hover:bg-white/5 transition-colors press-scale"
        >
          <Plus className="w-5 h-5 text-white/30 mb-1" />
          <span className="text-xs text-white/50">New</span>
        </button>
      </div>

      {showBuilder && (
        <RoutineBuilder
          onClose={() => setShowBuilder(false)}
          onCreated={fetchRoutines}
        />
      )}

      {playingRoutine && (
        <RoutinePlayer
          routineId={playingRoutine.id}
          routineName={playingRoutine.name}
          steps={playingRoutine.steps}
          onClose={() => { setPlayingRoutine(null); fetchRoutines() }}
        />
      )}
    </div>
  )
}
