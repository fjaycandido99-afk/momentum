/**
 * Which of a cached pool of videos to show today.
 *
 * Why this exists: motivation and music used to cache exactly the 8 (or 10)
 * videos one YouTube search returned, keyed per topic, and serve those to
 * everyone all day. Relevance search returns nearly the same top results day
 * to day, an era keeps one topic for 30 days, and when YouTube's quota ran
 * out the old list was re-saved as today's — so people saw the same videos
 * for days. Now the cache keeps a larger rolling POOL, and each day shows a
 * different, day-seeded selection from it.
 *
 * Pure (no DB), so the rotation rules are tested directly.
 */

export interface PooledVideo {
  id: string
  youtubeId: string
  title: string
  channel: string
  duration?: number
  thumbnail?: string
}

/** Most videos kept per topic/genre. Every fresh search adds to the front. */
export const POOL_MAX = 40

/** Deterministic 0..1 from an integer seed. */
function rand(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/** A small stable hash, so each topic gets its own shuffle on the same day. */
export function hashKey(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** YYYYMMDD as a number, from the server's local date. */
export function daySeed(d: Date = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

/**
 * Today's `count` videos from the pool: the same all day for a given topic,
 * different tomorrow. A pool no bigger than `count` is still reordered, so
 * even a stale list stops opening on the same video every day.
 */
export function dailyPick<T>(pool: T[], key: string, count: number, day: number = daySeed()): T[] {
  const seed = day + hashKey(key)
  const out = [...pool]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand(seed + i) * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.slice(0, count)
}

/**
 * Fresh results in front of what was already pooled, without duplicates,
 * capped at POOL_MAX. Old videos age out as new searches bring new ones.
 */
export function mergePool<T extends { youtubeId: string }>(fresh: T[], existing: T[] | null | undefined): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const v of [...fresh, ...(existing ?? [])]) {
    if (!v?.youtubeId || seen.has(v.youtubeId)) continue
    seen.add(v.youtubeId)
    out.push(v)
    if (out.length >= POOL_MAX) break
  }
  return out
}
