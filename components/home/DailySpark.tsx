'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles, X, Heart, Send } from 'lucide-react'
import { QUOTES, displayAuthor } from '@/lib/quotes'
import { getNextSpark, Spark } from '@/lib/daily-sparks'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { isDismissed, localDayKey, setDismissed } from '@/lib/ui/dismiss'

/**
 * ONCE A DAY, and not for the first few seconds.
 *
 * This used to show two seconds after home mounted, then re-arm itself
 * forever: a 30–60 minute recurring timer AND a 10-minute idle watcher,
 * whichever came first, re-armed on every dismissal and reset from scratch
 * every time you navigated back to home. Sitting with the app open meant a
 * quote every ten minutes, and there was no way to stop it.
 *
 * Now: at most one per local day, only once the screen has settled, never
 * on top of another popup, and with a permanent "don't show these" for
 * anyone who doesn't want it at all.
 */
const AUTO_DISMISS = 60 * 1000           // 60 seconds
const INITIAL_DELAY = 6 * 1000           // let home finish arriving first

/** Once per local day. */
const SHOWN_KEY = 'voxu.spark.shown-on'
/** Their permanent off switch, via the shared dismissal store. */
const OFF_ID = 'daily-spark'

// Shared popup lock — prevents AffirmationPopup and DailySpark from overlapping
declare global {
  interface Window { __popupActive?: boolean }
}

/** Has today's already been shown? Local day, so it rolls at midnight here. */
function shownToday(): boolean {
  try {
    return localStorage.getItem(SHOWN_KEY) === localDayKey()
  } catch {
    return false
  }
}

function markShownToday() {
  try {
    localStorage.setItem(SHOWN_KEY, localDayKey())
  } catch {
    // Worst case it shows once more this session.
  }
}

export function DailySpark() {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [spark, setSpark] = useState<Spark | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [answer, setAnswer] = useState('')
  const [answerFocused, setAnswerFocused] = useState(false)
  // Daily Read: the score tapped, and the answered-count we show back.
  const [rating, setRating] = useState<number | null>(null)
  const [ratingCount, setRatingCount] = useState<number | null>(null)

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
    setSaveError(false)
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
      // Deliberately does NOT schedule another. One a day.
      onComplete?.()
    }, 300)
  }, [])

  /** "Don't show these" — off for good, from inside the popup itself. */
  const turnOff = useCallback(() => {
    setDismissed(OFF_ID, 'forever')
    dismiss()
  }, [dismiss])

  // Once a day, after the screen has settled, and never over another popup.
  useEffect(() => {
    if (isDismissed(OFF_ID) || shownToday()) return

    const timer = setTimeout(() => {
      // Another popup owns the screen (the morning hero, say): today's spark
      // simply doesn't happen. Queueing it behind would be two interruptions.
      if (window.__popupActive) return
      markShownToday()
      showSpark()
    }, INITIAL_DELAY)

    return () => {
      clearTimeout(timer)
      clearAllTimers()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Daily Read: one tap answers the item and closes the popup.
   *
   * The score is shown as chosen straight away and the request runs behind it
   * — the whole point of this type is that it costs a second, so it must not
   * make anyone wait on a round trip. A failed write loses one item out of
   * forty, which is not worth an error state that interrupts the morning.
   */
  const handleRate = async (score: number) => {
    if (!spark?.itemId || rating !== null) return
    setRating(score)
    setRatingCount((spark.answered ?? 0) + 1)
    setTimeout(() => dismiss(), 1100)
    try {
      const res = await fetch('/api/assessment/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: spark.itemId, score }),
      })
      if (res.ok) {
        const data = await res.json()
        if (typeof data?.read?.answered === 'number') setRatingCount(data.read.answered)
      }
    } catch {
      // Silent by design — see above.
    }
  }

  const handleSubmitAnswer = async () => {
    if (!spark || !answer.trim() || saving || saved) return
    setSaving(true)
    setSaveError(false)
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
      } else {
        setSaveError(true)
      }
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!spark || saving || saved) return
    setSaving(true)
    setSaveError(false)
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
      } else {
        setSaveError(true)
      }
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  // Freeze the page underneath: this popup is a fixed overlay, and without
  // this the app-shell container behind it still scrolls under the finger.
  useBodyScrollLock(visible)

  if (!visible || !spark) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={spark.type === 'quote' ? 'Daily Quote' : spark.type === 'affirmation' ? 'Daily Affirmation' : spark.type === 'assessment' ? 'Daily Read' : 'Daily Spark'}
      className={`fixed inset-0 z-[60] flex items-center justify-center px-6 ${
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
                {spark.type === 'quote' ? 'Daily Quote' : spark.type === 'affirmation' ? 'Daily Affirmation' : spark.type === 'assessment' ? 'Daily Read' : 'Daily Spark'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Nothing to favourite on an assessment item — it's a question
                  about you, not a piece of writing worth keeping. */}
              {spark.type !== 'assessment' && (
              <button
                onClick={handleSave}
                disabled={saving || saved}
                aria-label={saved ? 'Saved to favorites' : 'Save to favorites'}
                aria-pressed={saved}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    saved ? 'text-rose-400 fill-rose-400' : saveError ? 'text-red-400' : 'text-white/70 hover:text-white'
                  }`}
                />
              </button>
              )}
              <button
                onClick={() => dismiss()}
                aria-label="Dismiss"
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>

          {/* Content — stagger 2 */}
          <div className="spark-text-in" style={{ animationDelay: '0.25s' }}>
            <p className="text-[15px] text-white leading-relaxed font-medium">
              {/* An assessment item is a statement about the reader, not a
                  quotation — wrapping it in quote marks reads as someone
                  else's words. */}
              {spark.type === 'assessment' ? spark.text : <>&ldquo;{spark.text}&rdquo;</>}
            </p>
            {displayAuthor(spark.author) && (
              <p className="text-xs text-amber-300/60 mt-2">&mdash; {displayAuthor(spark.author)}</p>
            )}
          </div>

          {/* Daily Read scale — stagger 3.
              Five points, not seven: this is one question on a phone, often
              first thing, and seven targets is precision a half-awake thumb
              can't deliver. False precision would only pollute the score. */}
          {spark.type === 'assessment' ? (
            <div className="mt-5 spark-text-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-stretch gap-1.5" role="radiogroup" aria-label={spark.text}>
                {(spark.scale ?? []).map(point => {
                  const chosen = rating === point.score
                  return (
                    <button
                      key={point.score}
                      role="radio"
                      aria-checked={chosen}
                      aria-label={point.label}
                      disabled={rating !== null}
                      onClick={() => handleRate(point.score)}
                      className={`flex-1 min-h-[3.25rem] px-1 py-2 rounded-xl border text-[11px] leading-tight font-medium transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
                        chosen
                          ? 'bg-violet-500/40 border-violet-300/50 text-white scale-[1.04]'
                          : rating !== null
                            ? 'bg-white/[0.03] border-white/10 text-white/30'
                            : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white active:scale-95'
                      }`}
                    >
                      {point.label}
                    </button>
                  )
                })}
              </div>
              {rating !== null ? (
                <p className="text-xs text-emerald-400/90 mt-3 text-center">
                  Noted{ratingCount ? ` · ${ratingCount} answered` : ''}
                </p>
              ) : (
                <button
                  onClick={() => dismiss()}
                  className="w-full mt-2.5 py-2 rounded-xl text-xs text-white/50 hover:text-white/70 transition-colors"
                >
                  Skip
                </button>
              )}
            </div>
          ) : spark.type === 'question' && !saved ? (
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
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/15 focus:border-violet-400/40 focus:bg-white/[0.07] text-sm text-white placeholder:text-white/50 outline-none resize-none transition-colors focus-visible:ring-1 focus-visible:ring-violet-400/30"
                />
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!answer.trim() || saving}
                  aria-label="Save reflection"
                  className="absolute right-2 bottom-2 p-2 rounded-lg bg-violet-500/30 hover:bg-violet-500/40 disabled:opacity-30 disabled:hover:bg-violet-500/30 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  <Send className={`w-4 h-4 ${saving ? 'text-white/50' : 'text-violet-300'}`} />
                </button>
              </div>
              {saveError && (
                <p className="text-xs text-red-400 mt-2 text-center">Couldn&apos;t save — tap to retry</p>
              )}
              <button
                onClick={() => dismiss()}
                className="w-full mt-2 py-2 rounded-xl text-xs text-white/50 hover:text-white/70 transition-colors"
              >
                Skip
              </button>
            </div>
          ) : spark.type === 'question' && saved ? (
            <div className="mt-4 spark-text-in" style={{ animationDelay: '0.4s' }}>
              <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-400 font-medium mb-1">Saved!</p>
                <p className="text-sm text-white/70 italic">{answer}</p>
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

          {/* The off switch, where someone who is tired of these will look
              for it. Small, but present — a popup with no way to stop it is
              the reason people close an app instead of a card. */}
          <button
            onClick={turnOff}
            className="block mx-auto mt-4 text-[11px] text-white/35 hover:text-white/60"
          >
            Don&rsquo;t show these
          </button>
        </div>
      </div>
    </div>
  )
}
