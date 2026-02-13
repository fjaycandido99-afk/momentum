'use client'

import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_DETAILS } from '@/lib/mindset/detail-content'

interface CorePrinciplesCardProps {
  mindsetId: Exclude<MindsetId, 'scholar'>
}

const ACCENT_COLORS: Record<Exclude<MindsetId, 'scholar'>, string> = {
  stoic: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  existentialist: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  cynic: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  hedonist: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  samurai: 'bg-red-500/20 text-red-300 border-red-500/30',
}

export function CorePrinciplesCard({ mindsetId }: CorePrinciplesCardProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const details = MINDSET_DETAILS[mindsetId]
  const accent = ACCENT_COLORS[mindsetId]

  const toggle = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index))
  }

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <BookOpen className="w-4 h-4 text-white/70" />
        <h3 className="text-sm font-medium text-white">Core Principles</h3>
      </div>

      <div className="space-y-2">
        {details.principles.map((principle, index) => {
          const isExpanded = expandedIndex === index
          return (
            <div
              key={index}
              role="button"
              tabIndex={0}
              onClick={() => toggle(index)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(index) } }}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                isExpanded ? 'bg-white/[0.05] border-white/12' : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 border ${accent}`}>
                  {index + 1}
                </span>
                <span className="text-[13px] font-medium text-white flex-1">{principle.title}</span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-white/50 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/50 flex-shrink-0" />
                )}
              </div>
              {isExpanded && (
                <p className="text-[13px] text-white/70 leading-relaxed mt-2.5 ml-9 animate-fade-in">
                  {principle.description}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
