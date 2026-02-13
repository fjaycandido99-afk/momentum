'use client'

import { useState } from 'react'
import { Swords, Check } from 'lucide-react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const TRAINING_FOCUSES = [
  { skill: 'Deep Focus', practice: 'Spend 25 minutes on one task with zero distractions. No phone, no tabs.' },
  { skill: 'Physical Discipline', practice: 'Complete a set of exercises with perfect form, not speed. Quality over quantity.' },
  { skill: 'Patience', practice: 'Wait before reacting to something that frustrates you. Count to ten, then respond.' },
  { skill: 'Precision', practice: 'Do one routine task today with exceptional attention to detail.' },
  { skill: 'Stillness', practice: 'Sit in silence for 10 minutes. Observe your thoughts without following them.' },
  { skill: 'Honesty', practice: 'In every interaction today, say exactly what you mean. No softening, no hedging.' },
  { skill: 'Awareness', practice: 'Walk somewhere slowly, noticing every detail around you. See what you usually miss.' },
  { skill: 'Endurance', practice: 'When you want to quit something today, push past it for 5 more minutes.' },
  { skill: 'Simplicity', practice: 'Eliminate one unnecessary step or item from your daily routine.' },
  { skill: 'Gratitude', practice: 'At the end of the day, name three specific moments you are thankful for.' },
  { skill: 'Courage', practice: 'Do one thing today that makes you slightly uncomfortable.' },
  { skill: 'Presence', practice: 'During your next meal, eat without screens. Taste every bite.' },
  { skill: 'Mastery', practice: 'Practice your primary skill for 30 minutes with full intention.' },
  { skill: 'Self-Control', practice: 'Resist one temptation or impulse today. Note how it feels after.' },
]

function getDailyTrainingIndex(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return dayOfYear % TRAINING_FOCUSES.length
}

interface SamuraiTrainingExerciseProps {
  onPathActivity?: () => void
}

export function SamuraiTrainingExercise({ onPathActivity }: SamuraiTrainingExerciseProps) {
  const [completed, setCompleted] = useState(false)
  const training = TRAINING_FOCUSES[getDailyTrainingIndex()]

  const handleComplete = async () => {
    setCompleted(true)
    fetch('/api/path/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity: 'exercise' }),
    }).catch(() => {})
    onPathActivity?.()
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_type: 'reflection',
          content: `Completed training: ${training.skill} — ${training.practice}`,
          prompt: `Today's Training: ${training.skill}`,
        }),
      })
    } catch {
      // Silent fail
    }
  }

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-red-500/10">
          <Swords className="w-4 h-4 text-red-300/70" />
        </div>
        <h3 className="text-sm font-medium text-white">Today&apos;s Training</h3>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 mb-4">
        <p className="text-[10px] text-red-300/60 uppercase tracking-wider font-medium mb-1.5">{training.skill}</p>
        <p className="text-[15px] text-white leading-relaxed">{training.practice}</p>
      </div>

      {completed ? (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-white/80">Training complete. The way is in practice.</p>
            <Link href="/journal" className="text-xs text-white/60 hover:text-white/80 flex items-center gap-1 mt-1 transition-colors">
              View journal <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ) : (
        <button
          onClick={handleComplete}
          className="w-full py-2.5 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/15 transition-all press-scale"
        >
          Mark as completed
        </button>
      )}
    </div>
  )
}
