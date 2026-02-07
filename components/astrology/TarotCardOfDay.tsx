'use client'

import { Sparkles, Share2, Loader2 } from 'lucide-react'
import { getDailyTarotCard } from '@/lib/astrology/tarot-data'
import { useShareCard } from '@/hooks/useShareCard'
import { TarotCardVisual } from './TarotCardVisual'

interface TarotCardOfDayProps {
  zodiacSign: string
}

export function TarotCardOfDay({ zodiacSign }: TarotCardOfDayProps) {
  const { card, elementHint } = getDailyTarotCard(zodiacSign)
  const { shareAsImage, isGenerating: isShareGenerating } = useShareCard()

  const handleShare = () => {
    const content = `${card.name}\n${card.keywords.join(' \u2022 ')}\n\n${card.uprightMeaning}`
    shareAsImage(content, 'tarot', card.numeral)
  }

  return (
    <div className="card-cosmic p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/30 to-purple-500/30">
          <Sparkles className="w-5 h-5 text-amber-300" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <h2 className="font-medium text-white">Tarot Card of the Day</h2>
          <p className="text-xs text-white/95">Your daily cosmic draw</p>
        </div>
        <button
          onClick={handleShare}
          disabled={isShareGenerating}
          aria-label="Share tarot card as image"
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          {isShareGenerating ? (
            <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4 text-white/50 hover:text-white/80 transition-colors" />
          )}
        </button>
      </div>

      {/* Card Display */}
      <div className="flex items-start gap-4 mb-4">
        {/* SVG Tarot Card Visual */}
        <div className="flex-shrink-0 w-[70px]">
          <TarotCardVisual numeral={card.numeral} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Card Name */}
          <h3 className="text-lg font-semibold text-white mb-1.5">{card.name}</h3>

          {/* Keyword Pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {card.keywords.map((keyword) => (
              <span
                key={keyword}
                className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] text-white/95 capitalize"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Upright Meaning */}
      <p className="text-sm text-white/90 leading-relaxed mb-3">
        {card.uprightMeaning}
      </p>

      {/* Element-Personalized Hint */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-400/10">
        <p className="text-sm text-amber-200/90 leading-relaxed">
          <span className="font-medium text-amber-300">For you: </span>
          {elementHint}
        </p>
      </div>
    </div>
  )
}
