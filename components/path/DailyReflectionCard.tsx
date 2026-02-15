'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, ArrowRight, Check } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_DAILY_QUESTIONS } from '@/lib/mindset/daily-questions'

interface DailyReflectionCardProps {
  mindsetId: MindsetId
  onPathActivity?: () => void
}

function getDailyQuestionIndex(totalQuestions: number): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return dayOfYear % totalQuestions
}

export function DailyReflectionCard({ mindsetId, onPathActivity }: DailyReflectionCardProps) {
  const [reflection, setReflection] = useState('')
  const [saved, setSaved] = useState(false)
  const questions = MINDSET_DAILY_QUESTIONS[mindsetId]
  const index = getDailyQuestionIndex(questions.length)
  const question = questions[index]

  const handleSave = async () => {
    if (!reflection.trim()) return
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_type: 'reflection',
          content: reflection,
          prompt: question,
        }),
      })
      setSaved(true)
      // Track path activity
      fetch('/api/path/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: 'reflection' }),
      }).catch(() => {})
      onPathActivity?.()
    } catch {
      // Silent fail
    }
  }

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <MessageCircle className="w-4 h-4 text-white/70" />
        <h3 className="text-sm font-medium text-white">Daily Reflection</h3>
      </div>

      <p className="text-[14px] text-white leading-relaxed mb-4">{question}</p>

      {saved ? (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-white/80">Saved to your journal</p>
            <Link href="/journal" className="text-xs text-white/60 hover:text-white/80 flex items-center gap-1 mt-1 transition-colors">
              View journal <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Write your reflection..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/35 resize-none focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
          />
          <div className="flex items-center justify-between mt-3">
            <Link href="/journal" className="text-xs text-white/50 hover:text-white/70 flex items-center gap-1 transition-colors">
              Full journal <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={handleSave}
              disabled={!reflection.trim()}
              className="px-4 py-1.5 text-xs rounded-lg bg-white/10 text-white hover:bg-white/15 disabled:opacity-20 disabled:cursor-not-allowed transition-all press-scale"
            >
              Save
            </button>
          </div>
        </>
      )}
    </div>
  )
}
