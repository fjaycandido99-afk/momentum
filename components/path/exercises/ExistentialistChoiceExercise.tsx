'use client'

import { useState } from 'react'
import { Compass, Check } from 'lucide-react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface ExistentialistChoiceExerciseProps {
  onPathActivity?: () => void
}

export function ExistentialistChoiceExercise({ onPathActivity }: ExistentialistChoiceExerciseProps) {
  const [choice, setChoice] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!choice.trim()) return
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_type: 'reflection',
          content: choice,
          prompt: 'What choice will define you today?',
        }),
      })
      setSaved(true)
      fetch('/api/path/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: 'exercise' }),
      }).catch(() => {})
      onPathActivity?.()
    } catch {
      // Silent fail
    }
  }

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-violet-500/10">
          <Compass className="w-4 h-4 text-violet-300/70" />
        </div>
        <h3 className="text-sm font-medium text-white">Authentic Choice</h3>
      </div>
      <p className="text-[15px] text-white/80 leading-relaxed mb-4">What choice will define you today?</p>

      {saved ? (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-white/80">Your authentic choice has been recorded.</p>
            <Link href="/journal" className="text-xs text-white/60 hover:text-white/80 flex items-center gap-1 mt-1 transition-colors">
              View journal <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <textarea
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            placeholder="Today, I choose to..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/35 resize-none focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
          />
          <button
            onClick={handleSave}
            disabled={!choice.trim()}
            className="mt-3 w-full py-2.5 text-xs rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/15 disabled:opacity-20 disabled:cursor-not-allowed transition-all press-scale"
          >
            Commit to this choice
          </button>
        </>
      )}
    </div>
  )
}
