'use client'

import { Sparkles } from 'lucide-react'

interface SocialProofCardProps {
  nudges: { message: string; icon: string }[]
}

export function SocialProofCard({ nudges }: SocialProofCardProps) {
  if (nudges.length === 0) return null

  return (
    <div className="glass-refined rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400/60" />
        <span className="text-[10px] uppercase tracking-wider text-white/50">Did you know?</span>
      </div>
      <div className="space-y-2">
        {nudges.map((nudge, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="text-base shrink-0">{nudge.icon}</span>
            <p className="text-xs text-white/85 leading-relaxed">{nudge.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
