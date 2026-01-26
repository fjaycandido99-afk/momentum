// In-memory cache for serverless environment (Vercel)
// Cache persists within the same instance but resets on cold starts

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

// In-memory cache store
const memoryCache: Map<string, CachedVideos> = new Map()

// Get today's date string
function getTodayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Get cached videos for a topic/genre
export function getCachedVideos(type: 'motivation' | 'music', key: string): CachedVideos['videos'] | null {
  const cacheKey = `${type}-${key.toLowerCase()}`
  const cached = memoryCache.get(cacheKey)

  if (!cached) {
    return null
  }

  // Check if cache is from today
  if (cached.date === getTodayString()) {
    console.log(`[Video Cache] Hit for ${cacheKey}`)
    return cached.videos
  }

  // Cache is stale (from a different day)
  memoryCache.delete(cacheKey)
  return null
}

// Save videos to cache
export function setCachedVideos(
  type: 'motivation' | 'music',
  key: string,
  videos: CachedVideos['videos']
): void {
  const cacheKey = `${type}-${key.toLowerCase()}`

  const data: CachedVideos = {
    date: getTodayString(),
    videos,
  }

  memoryCache.set(cacheKey, data)
  console.log(`[Video Cache] Cached ${videos.length} ${type} videos for "${key}"`)
}

// Check if we have valid cache for today
export function hasTodaysCache(type: 'motivation' | 'music', key: string): boolean {
  return getCachedVideos(type, key) !== null
}
