'use client'

import Link from 'next/link'
import { PenLine, Sparkles, Heart, Target } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_JOURNAL_PROMPTS } from '@/lib/mindset/journal-prompts'

interface JournalPromptsCardProps {
  mindsetId: Exclude<MindsetId, 'scholar'>
}

const ICONS = {
  sparkles: Sparkles,
  heart: Heart,
  target: Target,
} as const

export function JournalPromptsCard({ mindsetId }: JournalPromptsCardProps) {
  const prompts = MINDSET_JOURNAL_PROMPTS[mindsetId]
  const promptList = [prompts.prompt1, prompts.prompt2, prompts.prompt3]

  return (
    <div className="card-cosmic p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-white/5">
          <PenLine className="w-4 h-4 text-white/70" />
        </div>
        <h3 className="text-sm font-medium text-white/90">Journal Prompts</h3>
      </div>

      <div className="space-y-2">
        {promptList.map((prompt, index) => {
          const Icon = ICONS[prompt.icon]
          return (
            <Link
              key={index}
              href={`/journal?prompt=${encodeURIComponent(prompt.label)}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors press-scale"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-white/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90">{prompt.label}</p>
                <p className="text-xs text-white/40 truncate">{prompt.placeholder}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
