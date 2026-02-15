'use client'

import { useState, useRef } from 'react'
import { Brain, ChevronRight } from 'lucide-react'

const ARCHETYPES = [
  { name: 'The Hero', shadow: 'Arrogance — believing you must save everyone, or that you alone can.', description: 'You are driven, courageous, and willing to face challenges head-on.' },
  { name: 'The Sage', shadow: 'Detachment — retreating into theory and analysis to avoid feeling or acting.', description: 'You seek knowledge, truth, and understanding above all else.' },
  { name: 'The Caregiver', shadow: 'Martyrdom — giving so much that you lose yourself, or giving to control.', description: 'You nurture, protect, and support those around you.' },
  { name: 'The Trickster', shadow: 'Manipulation — using wit and charm to deceive rather than liberate.', description: 'You challenge norms, find creative solutions, and bring humor to the serious.' },
  { name: 'The Creator', shadow: 'Perfectionism — endless revision that prevents anything from being born.', description: 'You are compelled to build, express, and bring new things into the world.' },
  { name: 'The Explorer', shadow: 'Restlessness — running from commitment disguised as seeking freedom.', description: 'You crave new experiences, autonomy, and the thrill of discovery.' },
]

interface ScholarExerciseProps {
  onPathActivity?: () => void
}

export function ScholarExercise({ onPathActivity }: ScholarExerciseProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [reflection, setReflection] = useState('')
  const [showShadow, setShowShadow] = useState(false)
  const trackedRef = useRef(false)

  const handleSelect = (index: number) => {
    setSelected(index)
    setShowShadow(false)
    setReflection('')
    if (!trackedRef.current) {
      trackedRef.current = true
      fetch('/api/path/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: 'exercise' }),
      }).catch(() => {})
      onPathActivity?.()
    }
  }

  const archetype = selected !== null ? ARCHETYPES[selected] : null

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-blue-500/10">
          <Brain className="w-4 h-4 text-blue-300/70" />
        </div>
        <h3 className="text-sm font-medium text-white">Archetype Reflection</h3>
      </div>
      <p className="text-xs text-white/60 mb-4">Which archetype are you embodying today? Explore its light and shadow.</p>

      {/* Archetype selector */}
      <div className="grid grid-cols-2 gap-1.5 mb-4">
        {ARCHETYPES.map((a, i) => (
          <button
            key={a.name}
            onClick={() => handleSelect(i)}
            className={`py-2 px-3 text-xs rounded-lg border transition-all press-scale text-left ${
              selected === i
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                : 'bg-white/[0.03] border-white/10 text-white/70'
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>

      {archetype && (
        <div className="animate-fade-in space-y-3">
          {/* Light side */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Light</p>
            <p className="text-xs text-white/80 leading-relaxed">{archetype.description}</p>
          </div>

          {/* Shadow reveal */}
          {!showShadow ? (
            <button
              onClick={() => setShowShadow(true)}
              className="w-full py-2.5 rounded-lg text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 press-scale transition-all flex items-center justify-center gap-1.5"
            >
              Reveal the Shadow <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15 animate-fade-in">
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Shadow</p>
              <p className="text-xs text-white/80 leading-relaxed">{archetype.shadow}</p>
            </div>
          )}

          {/* Reflection */}
          {showShadow && (
            <div className="animate-fade-in">
              <label className="block text-[11px] text-white/60 mb-1.5">How does this shadow show up in your life?</label>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Write your reflection..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/35 resize-none focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
