'use client'

import { useState, useEffect } from 'react'
import { Compass, X, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface EvolutionData {
  shouldSuggest: boolean
  suggestedMindset: string
  reasoning: string
  journalEvidence: string
  transitionInsight: string
}

const MINDSET_LABELS: Record<string, string> = {
  stoic: 'Stoic',
  existentialist: 'Existentialist',
  cynic: 'Cynic',
  hedonist: 'Hedonist',
  samurai: 'Samurai',
  scholar: 'Scholar',
}

export function MindsetEvolution() {
  const router = useRouter()
  const [data, setData] = useState<EvolutionData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/ai/mindset-evolution')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.shouldSuggest) setData(d) })
      .catch(() => {})
  }, [])

  if (!data || dismissed) return null

  return (
    <div className="glass-refined rounded-2xl p-5 border border-violet-500/20">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-medium text-white">Mindset Evolution</h3>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Dismiss suggestion"
        >
          <X className="w-3.5 h-3.5 text-white/50" />
        </button>
      </div>

      <p className="text-xs text-white/70 leading-relaxed mb-3">
        {data.reasoning}
      </p>

      {data.journalEvidence && (
        <p className="text-[10px] text-white/50 italic mb-3">
          &ldquo;{data.journalEvidence}&rdquo;
        </p>
      )}

      <div className="p-3 rounded-xl bg-violet-500/10 mb-3">
        <p className="text-xs text-violet-300 leading-relaxed">
          {data.transitionInsight}
        </p>
      </div>

      <button
        onClick={() => router.push('/mindset-selection')}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 text-xs font-medium transition-colors"
      >
        Explore {MINDSET_LABELS[data.suggestedMindset] || data.suggestedMindset}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
