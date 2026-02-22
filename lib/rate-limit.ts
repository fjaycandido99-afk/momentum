/**
 * Simple in-memory rate limiter for API routes.
 * Tracks request counts per key (user ID) within a sliding window.
 * Resets automatically when the window expires.
 *
 * Note: This is per-instance (not shared across Vercel functions).
 * For production scale, consider Upstash Redis rate limiting.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodic cleanup to prevent unbounded memory growth
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 60_000 // 1 minute

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  { limit, windowSeconds }: RateLimitOptions
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + windowSeconds * 1000
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}
