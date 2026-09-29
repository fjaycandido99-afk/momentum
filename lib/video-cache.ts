// Video cache with DB persistence for Vercel serverless
// In-memory Map serves as fast path within warm instances
// DB (VideoCache model) persists across cold starts

import { prisma } from '@/lib/prisma'
import { mergePool } from '@/lib/video-pick'

interface CachedVideos {
  date: string // YYYY-MM-DD
  videos: Array<{
    id: string
    youtubeId: string
    title: string
    channel: string
    duration?: number
    thumbnail?: string
  }>
}

// In-memory fast path (same-instance only)
const memoryCache: Map<string, CachedVideos> = new Map()

function getTodayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Get cached videos — checks memory first, then DB
export async function getCachedVideos(type: 'motivation' | 'music', key: string): Promise<CachedVideos['videos'] | null> {
  const cacheKey = `${type}-${key.toLowerCase()}`
  const today = getTodayString()

  // 1. Check in-memory (fast path)
  const memoryCached = memoryCache.get(cacheKey)
  if (memoryCached && memoryCached.date === today) {
    console.log(`[Video Cache] Memory hit for ${cacheKey}`)
    return memoryCached.videos
  }

  // 2. Check DB (persists across cold starts)
  try {
    const dbCached = await prisma.videoCache.findUnique({
      where: { cache_key: cacheKey },
    })

    if (dbCached) {
      const cachedDate = `${dbCached.cached_at.getFullYear()}-${String(dbCached.cached_at.getMonth() + 1).padStart(2, '0')}-${String(dbCached.cached_at.getDate()).padStart(2, '0')}`
      if (cachedDate === today) {
        const videos = dbCached.videos as CachedVideos['videos']
        // Warm the memory cache
        memoryCache.set(cacheKey, { date: today, videos })
        console.log(`[Video Cache] DB hit for ${cacheKey}`)
        return videos
      }
    }
  } catch (e) {
    console.error('[Video Cache] DB read error:', e)
  }

  return null
}

// Add a FRESH search's results to the pool (fresh first, deduped, capped —
// see lib/video-pick.ts) and mark it as today's. Returns the merged pool.
//
// Only ever call this with results that really came from YouTube today. It
// used to be called with the stale fallback when the API failed, which
// re-dated an old list as today's and served it again the next day, and the
// next — the main reason people kept seeing the same videos.
export async function setCachedVideos(
  type: 'motivation' | 'music',
  key: string,
  fresh: CachedVideos['videos']
): Promise<CachedVideos['videos']> {
  const cacheKey = `${type}-${key.toLowerCase()}`
  const today = getTodayString()
  const videos = mergePool(fresh, await getStaleCachedVideos(type, key))

  // Save to memory
  memoryCache.set(cacheKey, { date: today, videos })

  // Save to DB
  try {
    await prisma.videoCache.upsert({
      where: { cache_key: cacheKey },
      update: {
        videos: videos as any,
        cached_at: new Date(),
      },
      create: {
        cache_key: cacheKey,
        videos: videos as any,
      },
    })
  } catch (e) {
    console.error('[Video Cache] DB write error:', e)
  }

  console.log(`[Video Cache] Pooled ${videos.length} ${type} videos for "${key}" (${fresh.length} fresh)`)
  return videos
}

// Serve a stale pool for the rest of today from THIS instance's memory only,
// so a failing API isn't retried on every request — without writing it to
// the DB as today's. Tomorrow (or a cold start) tries YouTube again.
export function rememberForToday(type: 'motivation' | 'music', key: string, videos: CachedVideos['videos']): void {
  memoryCache.set(`${type}-${key.toLowerCase()}`, { date: getTodayString(), videos })
}

// Check if we have valid cache for today
export async function hasTodaysCache(type: 'motivation' | 'music', key: string): Promise<boolean> {
  return (await getCachedVideos(type, key)) !== null
}

// Get the most recent cached videos regardless of date (stale fallback)
// Used when the API fails and today's cache doesn't exist yet
export async function getStaleCachedVideos(type: 'motivation' | 'music', key: string): Promise<CachedVideos['videos'] | null> {
  const cacheKey = `${type}-${key.toLowerCase()}`

  // Check memory first (even if stale)
  const memoryCached = memoryCache.get(cacheKey)
  if (memoryCached && memoryCached.videos.length > 0) {
    return memoryCached.videos
  }

  // Check DB — any date
  try {
    const dbCached = await prisma.videoCache.findUnique({
      where: { cache_key: cacheKey },
    })
    if (dbCached) {
      const videos = dbCached.videos as CachedVideos['videos']
      if (videos && videos.length > 0) {
        console.log(`[Video Cache] Stale fallback for ${cacheKey} (cached ${dbCached.cached_at.toISOString().split('T')[0]})`)
        return videos
      }
    }
  } catch (e) {
    console.error('[Video Cache] DB stale read error:', e)
  }

  return null
}
