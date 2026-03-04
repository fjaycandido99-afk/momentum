/**
 * Lightweight feature usage tracking — batches events and flushes via sendBeacon.
 * SSR-safe, never throws, never blocks UI.
 */

export type FeatureName =
  | 'focus_timer'
  | 'soundscapes'
  | 'music'
  | 'motivation'
  | 'guided'
  | 'journal'
  | 'coach'
  | 'daily_guide'
  | 'saved_content'
  | 'settings'
  | 'dream_interpretation'
  | 'meditation_gen'
  | 'smart_session'
  | 'morning_briefing'
  | 'letter_to_self'
  | 'wellness_score'

export type FeatureAction = 'open' | 'use' | 'complete'

interface QueuedEvent {
  feature: FeatureName
  action: FeatureAction
  metadata?: string
  ts: number
}

const FLUSH_INTERVAL = 5_000
const FLUSH_THRESHOLD = 20
const ENDPOINT = '/api/analytics/track'

let queue: QueuedEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null

function flush() {
  if (typeof window === 'undefined' || queue.length === 0) return
  const batch = queue.splice(0)
  const payload = JSON.stringify({ events: batch })

  // sendBeacon is fire-and-forget — survives page close / tab switch
  if (navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }))
  } else {
    fetch(ENDPOINT, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
  }
}

function scheduleFlush() {
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    flush()
  }, FLUSH_INTERVAL)
}

// Flush when tab goes hidden (critical for mobile)
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('pagehide', flush)
}

export function trackFeature(feature: FeatureName, action: FeatureAction, metadata?: string) {
  if (typeof window === 'undefined') return
  try {
    queue.push({ feature, action, metadata, ts: Date.now() })
    if (queue.length >= FLUSH_THRESHOLD) {
      flush()
    } else {
      scheduleFlush()
    }
  } catch {
    // Never throw
  }
}
