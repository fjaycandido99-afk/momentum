'use client'

import { useState, useRef } from 'react'
import { Flower2, Plus, Check } from 'lucide-react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface HedonistPleasureExerciseProps {
  onPathActivity?: () => void
}

export function HedonistPleasureExercise({ onPathActivity }: HedonistPleasureExerciseProps) {
  const [pleasures, setPleasures] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [saved, setSaved] = useState(false)
  const trackedRef = useRef(false)

  const addPleasure = () => {
    if (!input.trim() || pleasures.length >= 3) return
    if (!trackedRef.current) {
      trackedRef.current = true
      fetch('/api/path/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: 'exercise' }),
      }).catch(() => {})
      onPathActivity?.()
    }
    setPleasures(prev => [...prev, input.trim()])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addPleasure()
    }
  }

  const handleSave = async () => {
    if (pleasures.length === 0) return
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_type: 'gratitude',
          content: pleasures.map((p, i) => `${i + 1}. ${p}`).join('\n'),
          prompt: 'Pleasure Garden: 3 simple pleasures I enjoyed today',
        }),
      })
      setSaved(true)
    } catch {
      // Silent fail
    }
  }

  const gardenEmojis = ['🌱', '🌿', '🌸']

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-emerald-500/10">
          <Flower2 className="w-4 h-4 text-emerald-300/70" />
        </div>
        <h3 className="text-sm font-medium text-white">Pleasure Garden</h3>
      </div>
      <p className="text-xs text-white/75 mb-4">Log 3 simple pleasures you enjoyed today.</p>

      {/* Garden visualization */}
      <div className="flex justify-center gap-6 mb-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className={`text-2xl transition-all duration-500 ${pleasures[i] ? 'scale-100 opacity-100' : 'scale-75 opacity-30'}`}>
              {gardenEmojis[i]}
            </span>
            {pleasures[i] && (
              <span className="text-[10px] text-white/75 max-w-[60px] text-center truncate animate-fade-in">
                {pleasures[i]}
              </span>
            )}
          </div>
        ))}
      </div>

      {saved ? (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-white/80">Your garden is saved. Epicurus smiles.</p>
            <Link href="/journal" className="text-xs text-white/75 hover:text-white/80 flex items-center gap-1 mt-1 transition-colors">
              View journal <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ) : pleasures.length < 3 ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Pleasure ${pleasures.length + 1} of 3...`}
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/15 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/25 focus:bg-white/[0.05] transition-all"
          />
          <button
            onClick={addPleasure}
            disabled={!input.trim()}
            className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 disabled:opacity-20 disabled:cursor-not-allowed transition-all press-scale"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleSave}
          className="w-full py-2.5 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15 transition-all press-scale"
        >
          Save to journal
        </button>
      )}
    </div>
  )
}
