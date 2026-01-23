/**
 * Background Images Storage Helper
 * Manages background images stored in Supabase Storage
 */

import { createClient } from '@/lib/supabase/client'

export const BACKGROUND_BUCKET = 'backgrounds'

export const BACKGROUND_GENRES = [
  'lofi',
  'piano',
  'jazz',
  'classical',
  'ambient',
  'study',
] as const

export type BackgroundGenre = typeof BACKGROUND_GENRES[number]

// Cache for background URLs (avoid refetching)
const backgroundCache: Map<string, string[]> = new Map()

/**
 * Get the public URL for a background image
 */
export function getBackgroundUrl(genre: BackgroundGenre, filename: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${supabaseUrl}/storage/v1/object/public/${BACKGROUND_BUCKET}/${genre}/${filename}`
}

/**
 * List all background images for a genre
 */
export async function listBackgrounds(genre: BackgroundGenre): Promise<string[]> {
  // Check cache first
  const cacheKey = `backgrounds-${genre}`
  if (backgroundCache.has(cacheKey)) {
    return backgroundCache.get(cacheKey)!
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .storage
    .from(BACKGROUND_BUCKET)
    .list(genre, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    })

  if (error) {
    console.error(`Error listing backgrounds for ${genre}:`, error)
    return []
  }

  // Filter for image files only
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif']
  const images = data
    .filter(file => imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext)))
    .map(file => getBackgroundUrl(genre, file.name))

  // Cache the result
  backgroundCache.set(cacheKey, images)

  return images
}

/**
 * Get a random background image for a genre
 */
export async function getRandomBackground(genre: BackgroundGenre): Promise<string | null> {
  const backgrounds = await listBackgrounds(genre)

  if (backgrounds.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * backgrounds.length)
  return backgrounds[randomIndex]
}

/**
 * Get today's background (consistent for the day, changes daily)
 */
export async function getDailyBackground(genre: BackgroundGenre): Promise<string | null> {
  const backgrounds = await listBackgrounds(genre)

  if (backgrounds.length === 0) {
    return null
  }

  // Use day of year to pick a consistent background for today
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))

  const index = dayOfYear % backgrounds.length
  return backgrounds[index]
}

/**
 * Get multiple random backgrounds for a genre (for preloading/carousel)
 */
export async function getRandomBackgrounds(genre: BackgroundGenre, count: number = 5): Promise<string[]> {
  const backgrounds = await listBackgrounds(genre)

  if (backgrounds.length === 0) {
    return []
  }

  // Shuffle and take first N
  const shuffled = [...backgrounds].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/**
 * Clear the background cache (useful after uploading new images)
 */
export function clearBackgroundCache(): void {
  backgroundCache.clear()
}

/**
 * Preload a background image (returns a promise that resolves when loaded)
 */
export function preloadBackground(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
}

/**
 * Get fallback background if storage is empty
 */
export function getFallbackBackground(genre: BackgroundGenre): string {
  // Use gradient fallbacks based on genre
  const gradients: Record<BackgroundGenre, string> = {
    lofi: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    piano: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    jazz: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    classical: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    ambient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    study: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  }
  return gradients[genre]
}
