'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles, X, Heart, Send } from 'lucide-react'
import { QUOTES } from '@/lib/quotes'
import { getNextSpark, Spark } from '@/lib/daily-sparks'

const IDLE_TIMEOUT = 10 * 60 * 1000     // 10 minutes of no interaction
const MIN_RECURRING = 30 * 60 * 1000     // 30 minutes
const MAX_RECURRING = 60 * 60 * 1000     // 60 minutes
const AUTO_DISMISS = 60 * 1000           // 60 seconds
const INITIAL_DELAY = 2 * 1000           // 2 seconds on first mount

// Shared popup lock — prevents AffirmationPopup and DailySpark from overlapping
declare global {
  interface Window { __popupActive?: boolean }
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export function DailySpark() {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [spark, setSpark] = useState<Spark | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [answer, setAnswer] = useState('')
  const [answerFocused, setAnswerFocused] = useState(false)

  const recurringTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isShowingRef = useRef(false)

  const showSpark = useCallback(async () => {
    if (isShowingRef.current || window.__popupActive) return
    isShowingRef.current = true
    window.__popupActive = true
    setDismissing(false)
    setSaved(false)
    setSaving(false)
    setAnswer('')
    setAnswerFocused(false)

    // Try AI-powered spark API first, fall back to local
    let picked: Spark | null = null
    try {
      const res = await fetch('/api/daily-guide/spark')
      if (res.ok) {
        const data = await res.json()
        picked = {
          type: data.type === 'quote' ? 'quote' : data.type === 'affirmation' ? 'affirmation' : 'question',
          text: data.text,
          ...(data.author ? { author: data.author } : {}),
        }
      }
    } catch {
      // fall through to local
    }

    if (!picked) {
      picked = getNextSpark(QUOTES)
    }

    setSpark(picked)
    setVisible(true)
    requestAnimationFrame(() => setAnimating(true))

    // Auto-dismiss after timeout (paused when user is answering)
    autoDismissTimer.current = setTimeout(() => {
      dismiss()
    }, AUTO_DISMISS)
  }, [])

  // Pause auto-dismiss while user is typing an answer
  useEffect(() => {
    if (answerFocused && autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current)
      autoDismissTimer.current = null
    } else if (!answerFocused && visible && !dismissing && !saved && isShowingRef.current) {
      // Resume auto-dismiss with fresh timeout
      autoDismissTimer.current = setTimeout(() => {
        dismiss()
      }, AUTO_DISMISS)
    }
  }, [answerFocused]) // eslint-disable-line react-hooks/exhaustive-deps

  const clearAllTimers = useCallback(() => {
    if (recurringTimer.current) clearTimeout(recurringTimer.current)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current)
    recurringTimer.current = null
    idleTimer.current = null
    autoDismissTimer.current = null
  }, [])

  const scheduleNext = useCallback(() => {
    // Start both a recurring timer and idle watcher — whichever fires first wins
    recurringTimer.current = setTimeout(() => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = null
      showSpark()
    }, randomBetween(MIN_RECURRING, MAX_RECURRING))

    resetIdleTimer()
  }, [showSpark])

  const resetIdleTimer = useCallback(() => {
    // Don't reset idle while a spark is showing
    if (isShowingRef.current) return
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      if (recurringTimer.current) clearTimeout(recurringTimer.current)
      recurringTimer.current = null
      showSpark()
    }, IDLE_TIMEOUT)
  }, [showSpark])

  const dismiss = useCallback((onComplete?: () => void) => {
    if (!isShowingRef.current) return
    setDismissing(true)
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current)
      autoDismissTimer.current = null
    }
    setTimeout(() => {
      setVisible(false)
      setAnimating(false)
      setDismissing(false)
      isShowingRef.current = false
      window.__popupActive = false
      // Schedule next spark after dismissal
      scheduleNext()
      onComplete?.()
    }, 300)
  }, [scheduleNext])

  // Initial spark on mount + activity listeners
  useEffect(() => {
    let initialTimer: ReturnType<typeof setTimeout> | null = null
    const alreadyShown = sessionStorage.getItem('voxu_spark_shown')

    if (!alreadyShown) {
      // First time this session — show after delay
      initialTimer = setTimeout(() => {
        sessionStorage.setItem('voxu_spark_shown', '1')
        showSpark()
      }, INITIAL_DELAY)
    } else {
      // Already shown this session — just start idle/recurring timers
      scheduleNext()
    }

    // Track user activity for idle detection
    const onActivity = () => resetIdleTimer()
    const events = ['pointerdown', 'scroll', 'keydown'] as const
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }))

    return () => {
      if (initialTimer) clearTimeout(initialTimer)
      clearAllTimers()
      events.forEach(e => window.removeEventListener(e, onActivity))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitAnswer = async () => {
    if (!spark || !answer.trim() || saving || saved) return
    setSaving(true)
    try {
      const contentText = JSON.stringify({
        question: spark.text,
        answer: answer.trim(),
      })
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'reflection',
          content_text: contentText,
        }),
      })
      if (res.ok) {
        setSaved(true)
        // Auto-dismiss after a short delay so user sees the saved state
        setTimeout(() => dismiss(), 1500)
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!spark || saving || saved) return
    setSaving(true)
    try {
      const contentText = spark.author
        ? `"${spark.text}" — ${spark.author}`
        : spark.text
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: spark.type === 'quote' ? 'quote' : 'affirmation',
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

  if (!visible || !spark) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={spark.type === 'quote' ? 'Daily Quote' : spark.type === 'affirmation' ? 'Daily Affirmation' : 'Daily Spark'}
      className={`fixed inset-0 z-50 flex items-center justify-center px-6 ${
        dismissing ? 'animate-spark-out' : animating ? 'animate-spark-in' : 'opacity-0 scale-95'
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => dismiss()} />

      <div className="relative max-w-sm w-full rounded-2xl overflow-hidden spark-card-glow glass-refined glass-elevated">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-[#1a1a1a] to-amber-500/20" />
        <div className="absolute inset-0 bg-[#1a1a1a]/70" />

        {/* Accent glow orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/25 rounded-full blur-3xl animate-breathe" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '2s' }} />

        {/* Shimmer border */}
        <div className="absolute inset-0 rounded-2xl border border-white/15" />
        <div className="absolute top-0 left-0 right-0 h-[1px] spark-shimmer-border" />

        <div className="relative p-6">
          {/* Header — stagger 1 */}
          <div className="flex items-center justify-between mb-4 spark-text-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-violet-500/20">
                <Sparkles className="w-4 h-4 text-violet-300 spark-icon-glow" />
              </div>
              <span className="text-xs font-semibold text-violet-300/80 uppercase tracking-wider">
                {spark.type === 'quote' ? 'Daily Quote' : spark.type === 'affirmation' ? 'Daily Affirmation' : 'Daily Spark'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                aria-label={saved ? 'Saved to favorites' : 'Save to favorites'}
                aria-pressed={saved}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    saved ? 'text-rose-400 fill-rose-400' : 'text-white/95 hover:text-white/95'
                  }`}
                />
              </button>
              <button
                onClick={() => dismiss()}
                aria-label="Dismiss"
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <X className="w-4 h-4 text-white/95" />
              </button>
            </div>
          </div>

          {/* Content — stagger 2 */}
          <div className="spark-text-in" style={{ animationDelay: '0.25s' }}>
            <p className="text-[15px] text-white/95 leading-relaxed font-medium">
              &ldquo;{spark.text}&rdquo;
            </p>
            {spark.author && (
              <p className="text-xs text-amber-300/60 mt-2">&mdash; {spark.author}</p>
            )}
          </div>

          {/* Answer input for questions — stagger 3 */}
          {spark.type === 'question' && !saved ? (
            <div className="mt-4 spark-text-in" style={{ animationDelay: '0.4s' }}>
              <div className="relative">
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onFocus={() => setAnswerFocused(true)}
                  onBlur={() => setAnswerFocused(false)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmitAnswer()
                    }
                  }}
                  placeholder="Type your reflection..."
                  rows={2}
                  aria-label="Type your reflection"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/15 focus:border-violet-400/40 focus:bg-white/[0.07] text-sm text-white/95 placeholder:text-white/95 outline-none resize-none transition-colors focus-visible:ring-1 focus-visible:ring-violet-400/30"
                />
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!answer.trim() || saving}
                  aria-label="Save reflection"
                  className="absolute right-2 bottom-2 p-2 rounded-lg bg-violet-500/30 hover:bg-violet-500/40 disabled:opacity-30 disabled:hover:bg-violet-500/30 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  <Send className={`w-4 h-4 ${saving ? 'text-white/95' : 'text-violet-300'}`} />
                </button>
              </div>
              <button
                onClick={() => dismiss()}
                className="w-full mt-2 py-2 rounded-xl text-xs text-white/95 hover:text-white/95 transition-colors"
              >
                Skip
              </button>
            </div>
          ) : spark.type === 'question' && saved ? (
            <div className="mt-4 spark-text-in" style={{ animationDelay: '0.4s' }}>
              <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-400 font-medium mb-1">Saved!</p>
                <p className="text-sm text-white/95 italic">{answer}</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 spark-text-in" style={{ animationDelay: '0.4s' }}>
              <button
                onClick={() => dismiss()}
                className="w-full py-2.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/20 text-sm text-violet-200 font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
