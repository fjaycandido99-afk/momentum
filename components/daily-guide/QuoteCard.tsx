'use client'

import { useState, useEffect } from 'react'
import { Quote, Check, Sparkles, Share2, Heart } from 'lucide-react'
import { getDayOfYearQuote } from '@/lib/quotes'

interface QuoteCardProps {
  isCompleted: boolean
  onComplete: () => void
  mood?: string | null
  energy?: string | null
  dayType?: string | null
}

// Get today's date key for localStorage
function getTodayKey() {
  const now = new Date()
  return `quote_revealed_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`
}

export function QuoteCard({ isCompleted, onComplete, mood, energy, dayType }: QuoteCardProps) {
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)

  // Load quote: try smart API first, fall back to local
  useEffect(() => {
    const loadQuote = async () => {
      // If we have context, try the smart quote API
      if (mood || energy || dayType) {
        try {
          const params = new URLSearchParams()
          if (mood) params.set('mood', mood)
          if (energy) params.set('energy', energy)
          if (dayType) params.set('day_type', dayType)
          const response = await fetch(`/api/daily-guide/quote?${params}`)
          if (response.ok) {
            const data = await response.json()
            if (data.quote) {
              setQuote(data.quote)
              return
            }
          }
        } catch {
          // Fall through to local fallback
        }
      }
      // Fallback: dayOfYear quote
      setQuote(getDayOfYearQuote())
    }

    loadQuote()

    // Check localStorage for today's revealed state
    const todayKey = getTodayKey()
    const wasRevealed = localStorage.getItem(todayKey) === 'true'
    if (wasRevealed) {
      setIsRevealed(true)
    }

    // Clean up old keys (keep only today's)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('quote_revealed_') && key !== todayKey) {
        localStorage.removeItem(key)
      }
    })
  }, [mood, energy, dayType])

  // Also set revealed if completed from server
  useEffect(() => {
    if (isCompleted) {
      setIsRevealed(true)
    }
  }, [isCompleted])

  const handleReveal = () => {
    setIsRevealed(true)
    // Save to localStorage
    localStorage.setItem(getTodayKey(), 'true')
  }

  const handleDone = () => {
    onComplete()
  }

  const handleShare = async () => {
    if (!quote) return

    const shareText = `"${quote.text}" — ${quote.author}\n\nFrom Voxu`

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
      } catch {
        // User cancelled or share failed, fall back to clipboard
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
      // Fallback for older browsers
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
    if (!quote) return

    if (isFavorited && favoriteId) {
      // Remove favorite
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
      // Add favorite
      try {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_type: 'quote',
            content_text: `"${quote.text}" — ${quote.author}`,
          }),
        })
        if (response.ok) {
          const data = await response.json()
          setIsFavorited(true)
          setFavoriteId(data.favorite.id)
        }
      } catch (error) {
        console.error('Failed to add favorite:', error)
      }
    }
  }

  if (!quote) return null

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-500 ${
        isCompleted
          ? 'bg-white/[0.03] border border-white/10'
          : 'bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/15 shadow-[0_0_15px_rgba(255,255,255,0.06)] card-hover'
      }`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium tracking-widest text-white/95 uppercase">
            Wisdom
          </span>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-1.5 text-emerald-400/80">
            <Check className="w-3.5 h-3.5" />
            <span className="text-xs">Done</span>
          </div>
        )}
      </div>

      {/* Quote Content */}
      <div className="px-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            isCompleted ? 'bg-white/5' : 'bg-white/10'
          }`}>
            <Sparkles className={`w-5 h-5 ${isCompleted ? 'text-white/95' : 'text-amber-300'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`font-medium mb-1 ${isCompleted ? 'text-white/95' : 'text-white'}`}>
              Quote of the Day
            </h3>

            {isRevealed || isCompleted ? (
              <div className="mt-3">
                <div className="relative">
                  <Quote className="absolute -left-1 -top-1 w-4 h-4 text-white/95" />
                  <p className={`text-sm leading-relaxed pl-4 italic ${
                    isCompleted ? 'text-white/95' : 'text-white/95'
                  }`}>
                    "{quote.text}"
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2 pl-4">
                  <p className={`text-xs ${isCompleted ? 'text-white/95' : 'text-white/95'}`}>
                    — {quote.author}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleFavorite}
                      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                      aria-pressed={isFavorited}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                    >
                      <Heart className={`w-3.5 h-3.5 transition-colors ${
                        isFavorited ? 'text-pink-400 fill-pink-400' : isCompleted ? 'text-white/95' : 'text-white/95 hover:text-pink-400'
                      }`} />
                    </button>
                    <button
                      onClick={handleShare}
                      aria-label="Share quote"
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors group/share focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                    >
                      <Share2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-white/95' : 'text-white/95'} group-hover/share:text-white/95 transition-colors`} />
                    </button>
                  </div>
                </div>
                {/* Explicit Done button — only show after reveal, before completion */}
                {!isCompleted && (
                  <button
                    onClick={handleDone}
                    className="mt-3 w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Done
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleReveal}
                className="mt-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-all text-sm text-white/95 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <Sparkles className="w-4 h-4" />
                Reveal Today's Quote
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
