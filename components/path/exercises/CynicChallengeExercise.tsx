'use client'

import { useState } from 'react'
import { Flame, Check } from 'lucide-react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const DAILY_CHALLENGES = [
  'Go without checking social media for 4 hours.',
  'Say "no" to something you would normally agree to out of politeness.',
  'Eat the simplest meal you can — just what you need, nothing more.',
  'Tell someone an honest truth they might not want to hear.',
  'Walk somewhere instead of driving or ordering a ride.',
  'Spend 30 minutes doing absolutely nothing — no phone, no screen.',
  'Identify one possession you own that you don\'t need. Let it go.',
  'Question a belief you\'ve never challenged before.',
  'Wear the simplest outfit you own. Notice if it changes anything.',
  'Have a conversation without trying to impress the other person.',
  'Skip one purchase today that you\'d normally make on autopilot.',
  'Compliment someone with zero expectation of anything in return.',
  'Sit in silence for 10 minutes. What surfaces?',
  'Do something useful for someone without telling anyone about it.',
]

function getDailyChallengeIndex(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return dayOfYear % DAILY_CHALLENGES.length
}

interface CynicChallengeExerciseProps {
  onPathActivity?: () => void
}

export function CynicChallengeExercise({ onPathActivity }: CynicChallengeExerciseProps) {
  const [challenged, setChallenged] = useState(false)
  const [reflection, setReflection] = useState('')
  const [saved, setSaved] = useState(false)

  const challenge = DAILY_CHALLENGES[getDailyChallengeIndex()]

  const handleSave = async () => {
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_type: 'reflection',
          content: reflection || 'Challenge accepted.',
          prompt: `Convention Breaker: ${challenge}`,
        }),
      })
      setSaved(true)
    } catch {
      // Silent fail
    }
  }

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-orange-500/10">
          <Flame className="w-4 h-4 text-orange-300/70" />
        </div>
        <h3 className="text-sm font-medium text-white">Convention Breaker</h3>
      </div>

      <p className="text-[15px] text-white leading-relaxed mb-4">{challenge}</p>

      {saved ? (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-white/80">Challenge logged. Diogenes would be proud.</p>
            <Link href="/journal" className="text-xs text-white/75 hover:text-white/80 flex items-center gap-1 mt-1 transition-colors">
              View journal <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ) : challenged ? (
        <>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="How did it go? (optional)"
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/15 text-sm text-white placeholder:text-white/35 resize-none focus:outline-none focus:border-white/25 focus:bg-white/[0.05] transition-all"
          />
          <button
            onClick={handleSave}
            className="mt-3 w-full py-2.5 text-xs rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 hover:bg-orange-500/15 transition-all press-scale"
          >
            Save reflection
          </button>
        </>
      ) : (
        <button
          onClick={() => {
            setChallenged(true)
            fetch('/api/path/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ activity: 'exercise' }),
            }).catch(() => {})
            onPathActivity?.()
          }}
          className="w-full py-2.5 text-xs rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 hover:bg-orange-500/15 transition-all press-scale"
        >
          I challenged this
        </button>
      )}
    </div>
  )
}
