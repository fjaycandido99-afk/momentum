'use client'

import { useState, useEffect } from 'react'
import { Star, Check, Sparkles, Share2, Heart } from 'lucide-react'
import { ZODIAC_SYMBOLS } from '@/lib/astrology/constants'

interface CosmicInsight {
  text: string
  influence: string
  affirmation: string
}

interface CosmicInsightCardProps {
  isCompleted: boolean
  onComplete: () => void
  zodiacSign?: string | null
  dayType?: string | null
  variant?: 'default' | 'cosmic'
}

// Get today's date key for localStorage
function getTodayKey() {
  const now = new Date()
  return `cosmic_revealed_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`
}

export function CosmicInsightCard({ isCompleted, onComplete, zodiacSign, dayType, variant = 'default' }: CosmicInsightCardProps) {
  const isCosmic = variant === 'cosmic'
  const [insight, setInsight] = useState<CosmicInsight | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRevealed, setIsRevealed] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)

  // Load cosmic insight
  useEffect(() => {
    const loadInsight = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (zodiacSign) params.set('zodiac', zodiacSign)
        if (dayType) params.set('day_type', dayType)

        const response = await fetch(`/api/daily-guide/cosmic-insight?${params}`)
        if (response.ok) {
          const data = await response.json()
          if (data.insight) {
            setInsight(data.insight)
          }
        }
      } catch (error) {
        console.error('Failed to load cosmic insight:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInsight()

    // Check localStorage for today's revealed state
    const todayKey = getTodayKey()
    const wasRevealed = localStorage.getItem(todayKey) === 'true'
    if (wasRevealed) {
      setIsRevealed(true)
    }

    // Clean up old keys (keep only today's)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cosmic_revealed_') && key !== todayKey) {
        localStorage.removeItem(key)
      }
    })
  }, [zodiacSign, dayType])

  // Also set revealed if completed from server
  useEffect(() => {
    if (isCompleted) {
      setIsRevealed(true)
    }
  }, [isCompleted])

  const handleReveal = () => {
    setIsRevealed(true)
    localStorage.setItem(getTodayKey(), 'true')
  }

  const handleDone = () => {
    onComplete()
  }

  const handleShare = async () => {
    if (!insight) return

    const zodiacLabel = zodiacSign ? `\n${ZODIAC_SYMBOLS[zodiacSign] || ''} ${zodiacSign.charAt(0).toUpperCase() + zodiacSign.slice(1)}` : ''
    const shareText = `${insight.text}\n\nAffirmation: "${insight.affirmation}"${zodiacLabel}\n\nFrom Voxu`

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
      } catch {
        await copyToClipboard(shareText)
      }
    } else {
      await copyToClipboard(shareText)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  const handleFavorite = async () => {
    if (!insight) return

    if (isFavorited && favoriteId) {
      try {
        await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: favoriteId }),
        })
        setIsFavorited(false)
        setFavoriteId(null)
      } catch (error) {
        console.error('Failed to remove favorite:', error)
      }
    } else {
      try {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_type: 'cosmic_insight',
            content_text: `${insight.text}\n\nAffirmation: "${insight.affirmation}"`,
          }),
        })
        if (response.ok) {
          const data = await response.json()
          setIsFavorited(true)
          setFavoriteId(data.favorite?.id || null)
        }
      } catch (error) {
        console.error('Failed to add favorite:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className={`overflow-hidden p-4 ${isCosmic ? 'card-cosmic rounded-2xl' : 'rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-pulse">
            <Star className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!insight) return null

  return (
    <div
      className={`overflow-hidden transition-all duration-500 ${
        isCosmic
          ? 'card-cosmic rounded-2xl'
          : isCompleted
            ? 'rounded-2xl bg-white/[0.03] border border-white/10'
            : 'rounded-2xl bg-gradient-to-br from-indigo-500/[0.08] to-purple-500/[0.08] border border-indigo-500/20 shadow-[0_0_15px_rgba(139,92,246,0.08)] card-hover'
      }`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium tracking-widest text-indigo-400/80 uppercase">
            Cosmic Insight
          </span>
          {zodiacSign && (
            <span className="text-sm text-indigo-300/80">
              {ZODIAC_SYMBOLS[zodiacSign] || ''}
            </span>
          )}
        </div>
        {isCompleted && (
          <div className="flex items-center gap-1.5 text-emerald-400/80">
            <Check className="w-3.5 h-3.5" />
            <span className="text-xs">Done</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            isCompleted
              ? 'bg-white/5'
              : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20'
          }`}>
            <Sparkles className={`w-5 h-5 ${isCompleted ? 'text-white/70' : 'text-indigo-400'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`font-medium mb-1 ${isCompleted ? 'text-white/70' : 'text-white'}`}>
              {zodiacSign
                ? `${zodiacSign.charAt(0).toUpperCase() + zodiacSign.slice(1)} Insight`
                : 'Daily Cosmic Insight'}
            </h3>

            {isRevealed || isCompleted ? (
              <div className="mt-3 space-y-3">
                {/* Planetary influence */}
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span className={`text-xs ${isCompleted ? 'text-white/50' : 'text-indigo-300/80'}`}>
                    {insight.influence}
                  </span>
                </div>

                {/* Main insight text */}
                <p className={`text-sm leading-relaxed ${
                  isCompleted ? 'text-white/60' : 'text-white/90'
                }`}>
                  {insight.text}
                </p>

                {/* Affirmation */}
                <div className={`p-3 rounded-xl ${
                  isCompleted
                    ? 'bg-white/5'
                    : 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20'
                }`}>
                  <p className={`text-xs uppercase tracking-wider mb-1 ${
                    isCompleted ? 'text-white/40' : 'text-indigo-400/70'
                  }`}>
                    Today&apos;s Affirmation
                  </p>
                  <p className={`text-sm italic ${
                    isCompleted ? 'text-white/60' : 'text-white/90'
                  }`}>
                    &ldquo;{insight.affirmation}&rdquo;
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleFavorite}
                      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                      aria-pressed={isFavorited}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                    >
                      <Heart className={`w-3.5 h-3.5 transition-colors ${
                        isFavorited ? 'text-pink-400 fill-pink-400' : isCompleted ? 'text-white/50' : 'text-white/70 hover:text-pink-400'
                      }`} />
                    </button>
                    <button
                      onClick={handleShare}
                      aria-label="Share cosmic insight"
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors group/share focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                    >
                      <Share2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-white/50' : 'text-white/70'} group-hover/share:text-white/90 transition-colors`} />
                    </button>
                  </div>

                  {/* Done button */}
                  {!isCompleted && (
                    <button
                      onClick={handleDone}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:from-indigo-500/30 hover:to-purple-500/30 transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Done
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={handleReveal}
                className="mt-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500/15 to-purple-500/15 hover:from-indigo-500/25 hover:to-purple-500/25 border border-indigo-500/20 transition-all text-sm text-indigo-300 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <Star className="w-4 h-4" />
                Reveal Today&apos;s Cosmic Insight
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Copied toast */}
      {showCopied && (
        <div className="px-4 pb-3">
          <div role="status" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Copied!</span>
          </div>
        </div>
      )}
    </div>
  )
}
