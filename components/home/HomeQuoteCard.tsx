'use client'

import { useState, useCallback } from 'react'
import { Heart, Share2, Quote } from 'lucide-react'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MINDSET_QUOTES } from '@/lib/mindset/quotes'
import type { MindsetId } from '@/lib/mindset/types'
import { useShareCard } from '@/hooks/useShareCard'

function getDailyQuoteIndex(totalQuotes: number): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return dayOfYear % totalQuotes
}

const ACCENT_COLORS: Record<MindsetId, string> = {
  stoic: 'border-slate-400/30',
  existentialist: 'border-violet-400/30',
  cynic: 'border-orange-400/30',
  hedonist: 'border-emerald-400/30',
  samurai: 'border-red-400/30',
  scholar: 'border-blue-400/30',
}

export function HomeQuoteCard({ embedded = false }: { embedded?: boolean }) {
  const mindsetCtx = useMindsetOptional()
  const { shareAsImage, isGenerating } = useShareCard()
  const [favoriteId, setFavoriteId] = useState<string | null>(null)
  const [isToggling, setIsToggling] = useState(false)

  const mindset = mindsetCtx?.mindset || 'stoic'
  const quotes = MINDSET_QUOTES[mindset]
  if (!quotes?.length) return null

  const index = getDailyQuoteIndex(quotes.length)
  const quote = quotes[index]
  const accent = ACCENT_COLORS[mindset]

  const handleFavorite = useCallback(async () => {
    if (isToggling) return
    setIsToggling(true)
    try {
      if (favoriteId) {
        await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: favoriteId }),
        })
        setFavoriteId(null)
      } else {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_type: 'quote',
            content_text: quote.text,
            content_title: quote.author,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setFavoriteId(data.favorite?.id || null)
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsToggling(false)
    }
  }, [favoriteId, isToggling, quote.text, quote.author])

  const handleShare = useCallback(() => {
    shareAsImage(quote.text, 'quote', quote.author)
  }, [shareAsImage, quote.text, quote.author])

  if (embedded) {
    return (
      <div className="p-6 bg-black rounded-2xl border border-white/[0.15] press-scale">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.12]">
            <Quote className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Daily Quote</h2>
            <p className="text-xs text-white/95">Your daily dose of wisdom</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <blockquote className="pl-3 border-l-2 border-white/20 flex-1 mr-3">
            <p className="text-[13px] text-white italic leading-relaxed line-clamp-2">
              &ldquo;{quote.text}&rdquo;
            </p>
            <footer className="mt-1 text-xs text-white/70">— {quote.author}</footer>
          </blockquote>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); handleFavorite() }}
              disabled={isToggling}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${favoriteId ? 'fill-red-400 text-red-400' : 'text-white/50'}`}
              />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleShare() }}
              disabled={isGenerating}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Share2 className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 mb-4 liquid-reveal section-fade-bg">
      <div className="p-5 card-gradient-border-lg press-scale">
        <blockquote className={`pl-3 border-l-2 ${accent} mb-3`}>
          <p className="text-[14px] text-white italic leading-relaxed">
            &ldquo;{quote.text}&rdquo;
          </p>
          <footer className="mt-2 text-xs text-white/70">— {quote.author}</footer>
        </blockquote>

        <div className="flex items-center justify-between">
          {quote.category && (
            <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] text-white/60 uppercase tracking-wider">
              {quote.category}
            </span>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={handleFavorite}
              disabled={isToggling}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${favoriteId ? 'fill-red-400 text-red-400' : 'text-white/50'}`}
              />
            </button>
            <button
              onClick={handleShare}
              disabled={isGenerating}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Share2 className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
