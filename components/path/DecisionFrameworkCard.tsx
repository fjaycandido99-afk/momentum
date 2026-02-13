'use client'

import { useState } from 'react'
import { Scale, ChevronRight } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_FRAMEWORKS } from '@/lib/mindset/decision-frameworks'

interface DecisionFrameworkCardProps {
  mindsetId: Exclude<MindsetId, 'scholar'>
}

function getDailyIndex(total: number): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return dayOfYear % total
}

const ACCENT_BG: Record<Exclude<MindsetId, 'scholar'>, string> = {
  stoic: 'bg-slate-500/15',
  existentialist: 'bg-violet-500/15',
  cynic: 'bg-orange-500/15',
  hedonist: 'bg-emerald-500/15',
  samurai: 'bg-red-500/15',
}

const ACCENT_BORDER: Record<Exclude<MindsetId, 'scholar'>, string> = {
  stoic: 'border-slate-400/20',
  existentialist: 'border-violet-400/20',
  cynic: 'border-orange-400/20',
  hedonist: 'border-emerald-400/20',
  samurai: 'border-red-400/20',
}

export function DecisionFrameworkCard({ mindsetId }: DecisionFrameworkCardProps) {
  const frameworks = MINDSET_FRAMEWORKS[mindsetId]
  const index = getDailyIndex(frameworks.length)
  const framework = frameworks[index]
  const [answers, setAnswers] = useState<string[]>(new Array(framework.questions.length).fill(''))
  const [currentQ, setCurrentQ] = useState(0)
  const [showConclusion, setShowConclusion] = useState(false)
  const [started, setStarted] = useState(false)
  const accentBg = ACCENT_BG[mindsetId]
  const accentBorder = ACCENT_BORDER[mindsetId]

  const allAnswered = answers.every(a => a.trim().length > 0)
  const isLastQuestion = currentQ >= framework.questions.length - 1

  const handleNext = () => {
    if (isLastQuestion) {
      setShowConclusion(true)
    } else {
      setCurrentQ(currentQ + 1)
    }
  }

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <Scale className="w-4 h-4 text-white/70" />
        <h3 className="text-sm font-medium text-white">Decision Framework</h3>
      </div>

      <h4 className="text-[14px] font-medium text-white mb-1">{framework.title}</h4>
      <p className="text-[12px] text-white/70 leading-relaxed mb-4">{framework.description}</p>

      {!started && (
        <button
          onClick={() => setStarted(true)}
          className={`w-full py-2.5 rounded-lg text-sm font-medium text-white ${accentBg} press-scale transition-all`}
        >
          Start Framework
        </button>
      )}

      {started && !showConclusion && (
        <div className="animate-fade-in">
          {/* Progress */}
          <div className="flex gap-1 mb-3">
            {framework.questions.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-all ${
                  i <= currentQ ? 'bg-white/25' : 'bg-white/[0.06]'
                }`}
              />
            ))}
          </div>

          <label className="block text-[13px] text-white/80 mb-2">
            {framework.questions[currentQ].prompt}
          </label>
          <textarea
            value={answers[currentQ]}
            onChange={(e) => {
              const newAnswers = [...answers]
              newAnswers[currentQ] = e.target.value
              setAnswers(newAnswers)
            }}
            placeholder={framework.questions[currentQ].placeholder}
            rows={3}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-[13px] text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/15 transition-colors"
          />

          <button
            onClick={handleNext}
            disabled={!answers[currentQ].trim()}
            className={`w-full mt-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5
              ${answers[currentQ].trim()
                ? `text-white ${accentBg} press-scale`
                : 'text-white/30 bg-white/[0.07] cursor-not-allowed'
              }`}
          >
            {isLastQuestion ? 'See Conclusion' : <>Next <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      )}

      {showConclusion && (
        <div className={`animate-fade-in rounded-lg border p-4 ${accentBg} ${accentBorder}`}>
          <p className="text-[10px] text-white/60 uppercase tracking-wider mb-2">Conclusion</p>
          <p className="text-[14px] text-white/80 leading-relaxed">{framework.conclusion}</p>
        </div>
      )}
    </div>
  )
}
