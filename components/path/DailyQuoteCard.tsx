'use client'

import { useEffect, useRef } from 'react'
import { Quote } from 'lucide-react'
import { ShareButton } from '@/components/sharing/ShareButton'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_QUOTES } from '@/lib/mindset/quotes'

interface DailyQuoteCardProps {
  mindsetId: MindsetId
  onPathActivity?: () => void
}

function getDailyQuoteIndex(totalQuotes: number): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return dayOfYear % totalQuotes
}

const QUOTE_ACCENTS: Record<MindsetId, string> = {
  stoic: 'border-slate-400/30',
  existentialist: 'border-violet-400/30',
  cynic: 'border-orange-400/30',
  hedonist: 'border-emerald-400/30',
  samurai: 'border-red-400/30',
  scholar: 'border-blue-400/30',
}

export function DailyQuoteCard({ mindsetId, onPathActivity }: DailyQuoteCardProps) {
  const trackedRef = useRef(false)
  const quotes = MINDSET_QUOTES[mindsetId]
  const index = getDailyQuoteIndex(quotes.length)
  const quote = quotes[index]
  const accent = QUOTE_ACCENTS[mindsetId]

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true
    fetch('/api/path/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity: 'quote' }),
    }).catch(() => {})
    onPathActivity?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card-path p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Quote className="w-4 h-4 text-white/85" />
          <h3 className="text-sm font-medium text-white">Daily Quote</h3>
        </div>
        <ShareButton
          title="Daily Quote"
          text={`"${quote.text}" — ${quote.author}`}
          size="sm"
        />
      </div>

      <blockquote className={`pl-3 border-l-2 ${accent}`}>
        <p className="text-[14px] text-white italic leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
        <footer className="mt-2 text-xs text-white/85">— {quote.author}</footer>
      </blockquote>

      {quote.category && (
        <div className="mt-3 flex">
          <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] text-white/75 uppercase tracking-wider">
            {quote.category}
          </span>
        </div>
      )}
    </div>
  )
}
