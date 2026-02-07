'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, Share2 } from 'lucide-react'
import { useShareCard } from '@/hooks/useShareCard'

interface AffirmationCardProps {
  isPremium: boolean
}

export function AffirmationCard({ isPremium }: AffirmationCardProps) {
  const [affirmation, setAffirmation] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { shareAsImage, isGenerating: isShareGenerating } = useShareCard()

  useEffect(() => {
    if (!isPremium) return

    const fetchAffirmation = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/daily-guide/affirmation')
        if (response.ok) {
          const data = await response.json()
          setAffirmation(data.affirmation)
        }
      } catch (error) {
        console.error('Failed to fetch affirmation:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAffirmation()
  }, [isPremium])

  if (!isPremium) return null

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          </div>
          <div className="flex-1">
            <div className="h-3 w-24 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-3 w-48 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!affirmation) return null

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-4 animate-scale-in">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-indigo-500/20 shrink-0">
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-medium tracking-widest text-indigo-400/70 uppercase">
              Daily Affirmation
            </p>
            <button
              onClick={() => affirmation && shareAsImage(affirmation, 'affirmation')}
              disabled={isShareGenerating}
              aria-label="Share affirmation as image"
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isShareGenerating ? (
                <Loader2 className="w-3.5 h-3.5 text-white/60 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-white/50 hover:text-white/80 transition-colors" />
              )}
            </button>
          </div>
          <p className="text-sm text-white/95 italic leading-relaxed">
            {affirmation}
          </p>
        </div>
      </div>
    </div>
  )
}
