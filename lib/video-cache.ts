import fs from 'fs'
import path from 'path'

const CACHE_DIR = path.join(process.cwd(), '.video-cache')

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

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

// Get today's date string
function getTodayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Get cached videos for a topic/genre
export function getCachedVideos(type: 'motivation' | 'music', key: string): CachedVideos['videos'] | null {
  ensureCacheDir()

  const cacheFile = path.join(CACHE_DIR, `${type}-${key.toLowerCase()}.json`)

  if (!fs.existsSync(cacheFile)) {
    return null
  }

  try {
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) as CachedVideos

    // Check if cache is from today
    if (data.date === getTodayString()) {
      return data.videos
    }

    // Cache is stale (from a different day)
    return null
  } catch (error) {
    console.error(`[Video Cache] Error reading cache for ${type}/${key}:`, error)
    return null
  }
}

// Save videos to cache
export function setCachedVideos(
  type: 'motivation' | 'music',
  key: string,
  videos: CachedVideos['videos']
): void {
  ensureCacheDir()

  const cacheFile = path.join(CACHE_DIR, `${type}-${key.toLowerCase()}.json`)

  try {
    const data: CachedVideos = {
      date: getTodayString(),
      videos,
    }
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2))
    console.log(`[Video Cache] Cached ${videos.length} ${type} videos for "${key}"`)
  } catch (error) {
    console.error(`[Video Cache] Error writing cache for ${type}/${key}:`, error)
  }
}

// Check if we have valid cache for today
export function hasTodaysCache(type: 'motivation' | 'music', key: string): boolean {
  return getCachedVideos(type, key) !== null
}
