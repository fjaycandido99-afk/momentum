'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Quote, Zap, Heart, X } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { getRandomQuotes } from '@/lib/quotes'

type ContentType = 'affirmation' | 'quote' | 'spark'

interface PopupContent {
  type: ContentType
  text: string
  author?: string
  label: string
}

const SPARKS: string[] = [
  'You are doing better than you think.',
  'Small steps still move you forward.',
  'Progress, not perfection.',
  'You showed up today — that counts.',
  'Breathe. You are exactly where you need to be.',
  'Your effort matters, even when the results are slow.',
  'One moment of calm can change your whole day.',
  'You are allowed to rest and still be enough.',
  'Today is full of possibility.',
  'Be gentle with yourself — growth takes time.',
]

function getTodayKey(): string {
  const d = new Date()
  return `affirmation_popup_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function hasShownToday(): boolean {
  try {
    return localStorage.getItem(getTodayKey()) === 'shown'
  } catch {
    return false
  }
}

function markShownToday(): void {
  try {
    localStorage.setItem(getTodayKey(), 'shown')
  } catch {
    // localStorage unavailable
  }
}

export function AffirmationPopup() {
  const { isPremium } = useSubscription()
  const [content, setContent] = useState<PopupContent | null>(null)
  const [visible, setVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const dismiss = useCallback(() => {
    setDismissing(true)
    setTimeout(() => {
      setVisible(false)
      setDismissing(false)
      window.__popupActive = false
    }, 300)
  }, [])

  // Pick and load content
  useEffect(() => {
    if (!isPremium || hasShownToday()) return

    const timer = setTimeout(async () => {
      // Skip if another popup (DailySpark) is already showing
      if (window.__popupActive) return

      const roll = Math.random()
      let picked: PopupContent

      if (roll < 0.4) {
        // Try fetching an AI affirmation
        try {
          const res = await fetch('/api/daily-guide/affirmation')
          if (res.ok) {
            const data = await res.json()
            picked = {
              type: 'affirmation',
              text: data.affirmation,
              label: 'Daily Affirmation',
            }
          } else {
            // Fallback to spark
            picked = {
              type: 'spark',
              text: SPARKS[Math.floor(Math.random() * SPARKS.length)],
              label: 'Daily Spark',
            }
          }
        } catch {
          picked = {
            type: 'spark',
            text: SPARKS[Math.floor(Math.random() * SPARKS.length)],
            label: 'Daily Spark',
          }
        }
      } else if (roll < 0.7) {
        // Random quote
        const [quote] = getRandomQuotes(1)
        picked = {
          type: 'quote',
          text: quote.text,
          author: quote.author,
          label: 'Daily Quote',
        }
      } else {
        // Motivational spark
        picked = {
          type: 'spark',
          text: SPARKS[Math.floor(Math.random() * SPARKS.length)],
          label: 'Daily Spark',
        }
      }

      window.__popupActive = true
      setContent(picked)
      setVisible(true)
      markShownToday()
    }, 3000)

    return () => clearTimeout(timer)
  }, [isPremium])

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!visible || dismissing) return
    const timer = setTimeout(dismiss, 8000)
    return () => clearTimeout(timer)
  }, [visible, dismissing, dismiss])

  const handleSave = async () => {
    if (!content || saving || saved) return
    setSaving(true)
    try {
      const contentText = content.author
        ? `"${content.text}" — ${content.author}`
        : content.text
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: content.type === 'quote' ? 'quote' : 'affirmation',
          content_text: contentText,
        }),
      })
      if (res.ok) {
        setSaved(true)
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  if (!visible || !content) return null

  const Icon = content.type === 'affirmation' ? Sparkles
    : content.type === 'quote' ? Quote
    : Zap

  const iconColor = content.type === 'affirmation' ? 'text-indigo-400'
    : content.type === 'quote' ? 'text-amber-400'
    : 'text-violet-400'

  const iconBg = content.type === 'affirmation' ? 'bg-indigo-500/20'
    : content.type === 'quote' ? 'bg-amber-500/20'
    : 'bg-violet-500/20'

  const labelColor = content.type === 'affirmation' ? 'text-indigo-400/70'
    : content.type === 'quote' ? 'text-amber-400/70'
    : 'text-violet-400/70'

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-40 transition-all duration-300 ${
        dismissing
          ? 'opacity-0 -translate-y-4'
          : 'opacity-100 translate-y-0 animate-slide-down'
      }`}
    >
      <div className="max-w-md mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 backdrop-blur-xl shadow-lg shadow-black/20 overflow-hidden">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${iconBg}`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <span className={`text-[10px] font-medium tracking-widest uppercase ${labelColor}`}>
                {content.label}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                title={saved ? 'Saved' : 'Save to favorites'}
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    saved ? 'text-rose-400 fill-rose-400' : 'text-white/95 hover:text-white/95'
                  }`}
                />
              </button>
              <button
                onClick={dismiss}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-white/95" />
              </button>
            </div>
          </div>

          {/* Content */}
          <p className="text-sm text-white/95 italic leading-relaxed">
            &ldquo;{content.text}&rdquo;
          </p>
          {content.author && (
            <p className="text-xs text-white/95 mt-1.5">&mdash; {content.author}</p>
          )}
        </div>
      </div>
    </div>
  )
}
