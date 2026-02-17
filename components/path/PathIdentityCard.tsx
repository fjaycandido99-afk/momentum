'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_DETAILS } from '@/lib/mindset/detail-content'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'

interface PathIdentityCardProps {
  mindsetId: MindsetId
}

const PATH_BADGES: Record<MindsetId, { label: string; gradient: string; text: string }> = {
  stoic: { label: 'Virtue & Reason', gradient: 'from-slate-500/30 to-zinc-500/30', text: 'text-slate-300' },
  existentialist: { label: 'Freedom & Meaning', gradient: 'from-violet-500/30 to-indigo-500/30', text: 'text-violet-300' },
  cynic: { label: 'Truth & Simplicity', gradient: 'from-orange-500/30 to-amber-500/30', text: 'text-orange-300' },
  hedonist: { label: 'Pleasure & Peace', gradient: 'from-emerald-500/30 to-teal-500/30', text: 'text-emerald-300' },
  samurai: { label: 'Honor & Mastery', gradient: 'from-red-500/30 to-rose-500/30', text: 'text-red-300' },
  scholar: { label: 'Depth & Wholeness', gradient: 'from-blue-500/30 to-indigo-500/30', text: 'text-blue-300' },
}

export function PathIdentityCard({ mindsetId }: PathIdentityCardProps) {
  const details = MINDSET_DETAILS[mindsetId]
  const config = MINDSET_CONFIGS[mindsetId]
  const badge = PATH_BADGES[mindsetId]

  return (
    <div className="card-cosmic p-5">
      {/* Header with icon + name */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{config.icon}</div>
          <div>
            <h2 className="text-xl font-medium text-white">{details.figureName}</h2>
            <p className="text-xs text-white/95">{details.figureDates}</p>
          </div>
        </div>
        <Link
          href="/settings"
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          aria-label="Change mindset"
        >
          <Settings className="w-4 h-4 text-white/95" />
        </Link>
      </div>

      {/* Path badge + title */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${badge.gradient} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      <p className="text-sm text-white/85 mb-4">{details.figureTitle}</p>

      {/* Hero quote */}
      <blockquote className="pl-3 border-l-2 border-white/25">
        <p className="text-sm text-white/90 italic leading-relaxed">&ldquo;{details.quote}&rdquo;</p>
      </blockquote>
    </div>
  )
}
