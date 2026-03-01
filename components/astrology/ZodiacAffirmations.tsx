'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Heart, Share2, Check, Loader2 } from 'lucide-react'
import { ZODIAC_SYMBOLS } from '@/lib/astrology/constants'

interface ZodiacAffirmationsProps {
  zodiacSign?: string | null
}

function getCacheKey(sign: string) {
  const now = new Date()
  return `zodiac_affirmations_${sign}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`
}

export function ZodiacAffirmations({ zodiacSign }: ZodiacAffirmationsProps) {
  const [affirmations, setAffirmations] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [favorites, setFavorites] = useState<Record<number, string | null>>({})
  const [favoriteError, setFavoriteError] = useState<number | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!zodiacSign) {
      setIsLoading(false)
      return
    }

    const loadAffirmations = async () => {
      setIsLoading(true)

      // Check localStorage cache first
      const cacheKey = getCacheKey(zodiacSign)
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length === 3) {
            setAffirmations(parsed)
            setIsLoading(false)
            return
          }
        } catch {
          // Invalid cache, fetch fresh
        }
      }

      // Clean up old cache keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('zodiac_affirmations_') && key !== cacheKey) {
          localStorage.removeItem(key)
        }
      })

      try {
        const response = await fetch(`/api/astrology/affirmations?sign=${zodiacSign}`)
        if (response.ok) {
          const data = await response.json()
          if (data.affirmations && Array.isArray(data.affirmations)) {
            setAffirmations(data.affirmations)
            localStorage.setItem(cacheKey, JSON.stringify(data.affirmations))
          }
        }
      } catch (error) {
        console.error('Failed to load affirmations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAffirmations()
  }, [zodiacSign])

  const handleShare = async (text: string, index: number) => {
    const symbol = zodiacSign ? ZODIAC_SYMBOLS[zodiacSign] || '' : ''
    const signLabel = zodiacSign ? zodiacSign.charAt(0).toUpperCase() + zodiacSign.slice(1) : ''
    const shareText = `${symbol} ${signLabel} Affirmation:\n\n"${text}"\n\nFrom Voxu`

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
        return
      } catch {
        // Fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = shareText
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleFavorite = async (text: string, index: number) => {
    setFavoriteError(null)
    if (favorites[index]) {
      try {
        const res = await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: favorites[index] }),
        })
        if (res.ok) {
          setFavorites(prev => ({ ...prev, [index]: null }))
        } else {
          setFavoriteError(index)
        }
      } catch {
        setFavoriteError(index)
      }
    } else {
      try {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_type: 'zodiac_affirmation',
            content_text: text,
          }),
        })
        if (response.ok) {
          const data = await response.json()
          setFavorites(prev => ({ ...prev, [index]: data.favorite?.id || 'saved' }))
        } else {
          setFavoriteError(index)
        }
      } catch {
        setFavoriteError(index)
      }
    }
  }

  if (!zodiacSign) return null

  if (isLoading) {
    return (
      <div className="card-cosmic p-5">
        <p className="text-[10px] font-medium tracking-widest text-indigo-400/80 uppercase mb-3">
          Zodiac Affirmations
        </p>
        <div className="flex items-center gap-2 text-white/70">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Channeling your sign&apos;s energy...</span>
        </div>
      </div>
    )
  }

  if (affirmations.length === 0) return null

  return (
    <div className="card-cosmic p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <p className="text-[10px] font-medium tracking-widest text-indigo-400/80 uppercase">
          Zodiac Affirmations
        </p>
      </div>

      <div className="space-y-3">
        {affirmations.map((text, index) => (
          <div
            key={index}
            className="p-3 rounded-xl bg-white/5 border border-white/15"
          >
            <p className="text-sm text-white/70 italic leading-relaxed mb-2">
              &ldquo;{text}&rdquo;
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleFavorite(text, index)}
                aria-label={favorites[index] ? 'Remove from favorites' : 'Add to favorites'}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Heart className={`w-3.5 h-3.5 transition-colors ${
                  favorites[index] ? 'text-pink-400 fill-pink-400' : favoriteError === index ? 'text-red-400 animate-pulse' : 'text-white/50 hover:text-pink-400'
                }`} />
              </button>
              <button
                onClick={() => handleShare(text, index)}
                aria-label="Share affirmation"
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                {copiedIndex === index ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-white/50 hover:text-white/80 transition-colors" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
