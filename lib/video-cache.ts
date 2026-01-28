// Video cache with DB persistence for Vercel serverless
// In-memory Map serves as fast path within warm instances
// DB (VideoCache model) persists across cold starts

import { prisma } from '@/lib/prisma'

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

// Save videos to both memory and DB
export async function setCachedVideos(
  type: 'motivation' | 'music',
  key: string,
  videos: CachedVideos['videos']
): Promise<void> {
  const cacheKey = `${type}-${key.toLowerCase()}`
  const today = getTodayString()

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

  console.log(`[Video Cache] Cached ${videos.length} ${type} videos for "${key}"`)
}

// Check if we have valid cache for today
export async function hasTodaysCache(type: 'motivation' | 'music', key: string): Promise<boolean> {
  return (await getCachedVideos(type, key)) !== null
}
