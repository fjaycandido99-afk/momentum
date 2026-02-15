'use client'

import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { ShareButton } from '@/components/sharing/ShareButton'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_PARABLES } from '@/lib/mindset/parables'

interface DailyParableCardProps {
  mindsetId: MindsetId
}

function getDailyIndex(total: number): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return dayOfYear % total
}

const MORAL_ACCENTS: Record<MindsetId, string> = {
  stoic: 'bg-slate-500/10 border-slate-400/20',
  existentialist: 'bg-violet-500/10 border-violet-400/20',
  cynic: 'bg-orange-500/10 border-orange-400/20',
  hedonist: 'bg-emerald-500/10 border-emerald-400/20',
  samurai: 'bg-red-500/10 border-red-400/20',
  scholar: 'bg-blue-500/10 border-blue-400/20',
}

export function DailyParableCard({ mindsetId }: DailyParableCardProps) {
  const parables = MINDSET_PARABLES[mindsetId]
  const index = getDailyIndex(parables.length)
  const parable = parables[index]
  const [expanded, setExpanded] = useState(false)
  const accent = MORAL_ACCENTS[mindsetId]

  const isLong = parable.story.length > 300
  const displayStory = isLong && !expanded ? parable.story.slice(0, 280) + '...' : parable.story

  return (
    <div className="card-path p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-white/70" />
          <h3 className="text-sm font-medium text-white">Daily Parable</h3>
        </div>
        <ShareButton
          title={parable.title}
          text={`${parable.story}\n\nMoral: ${parable.moral}`}
          size="sm"
        />
      </div>

      <h4 className="text-[14px] font-medium text-white mb-2">{parable.title}</h4>

      <p className="text-[13px] text-white/90 leading-relaxed mb-3">{displayStory}</p>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] text-white/60 mb-3 press-scale"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      <div className={`rounded-xl border p-3 ${accent}`}>
        <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Moral</p>
        <p className="text-[12px] text-white/90 leading-relaxed">{parable.moral}</p>
      </div>
    </div>
  )
}
