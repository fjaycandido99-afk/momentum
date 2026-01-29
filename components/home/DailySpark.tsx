'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles, X } from 'lucide-react'
import { QUOTES } from '@/lib/quotes'
import { getNextSpark, Spark } from '@/lib/daily-sparks'

const IDLE_TIMEOUT = 2.5 * 60 * 1000    // 2.5 minutes of no interaction
const MIN_RECURRING = 30 * 60 * 1000     // 30 minutes
const MAX_RECURRING = 60 * 60 * 1000     // 60 minutes
const AUTO_DISMISS = 60 * 1000           // 60 seconds
const INITIAL_DELAY = 2 * 1000           // 2 seconds on first mount

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export function DailySpark() {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [spark, setSpark] = useState<Spark | null>(null)

  const recurringTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isShowingRef = useRef(false)

  const showSpark = useCallback(() => {
    if (isShowingRef.current) return
    isShowingRef.current = true
    setSpark(getNextSpark(QUOTES))
    setDismissing(false)
    setVisible(true)
    requestAnimationFrame(() => setAnimating(true))

    // Auto-dismiss after 10s
    autoDismissTimer.current = setTimeout(() => {
      dismiss()
    }, AUTO_DISMISS)
  }, [])

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

  if (!visible || !spark) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-6 ${
        dismissing ? 'animate-spark-out' : animating ? 'animate-spark-in' : 'opacity-0 scale-95'
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => dismiss()} />

      <div className="relative max-w-sm w-full rounded-2xl overflow-hidden spark-card-glow">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-[#1a1a1a] to-amber-500/20" />
        <div className="absolute inset-0 bg-[#1a1a1a]/70" />

        {/* Accent glow orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/25 rounded-full blur-3xl animate-breathe" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '2s' }} />

        {/* Shimmer border */}
        <div className="absolute inset-0 rounded-2xl border border-white/10" />
        <div className="absolute top-0 left-0 right-0 h-[1px] spark-shimmer-border" />

        <div className="relative p-6">
          {/* Header — stagger 1 */}
          <div className="flex items-center justify-between mb-4 spark-text-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-violet-500/20">
                <Sparkles className="w-4 h-4 text-violet-300 spark-icon-glow" />
              </div>
              <span className="text-xs font-semibold text-violet-300/80 uppercase tracking-wider">
                {spark.type === 'quote' ? 'Daily Quote' : 'Daily Spark'}
              </span>
            </div>
            <button
              onClick={() => dismiss()}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
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

          {/* Action — stagger 3 */}
          <div className="mt-5 spark-text-in" style={{ animationDelay: '0.4s' }}>
            <button
              onClick={() => dismiss()}
              className="w-full py-2.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/20 text-sm text-violet-200 font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
