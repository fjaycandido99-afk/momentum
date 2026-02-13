// Theme definitions for each music genre
// Each genre has its own visual aesthetic that themes the app
// Backgrounds are stored in Supabase Storage for optimal performance

export interface GenreTheme {
  name: string
  tagline: string
  accentColor: string
  vibe: string
  gradient: string // Fallback gradient when no images available
}

// Define theme for each genre (without backgrounds - loaded from Supabase Storage)
export const GENRE_THEMES: Record<string, GenreTheme> = {
  lofi: {
    name: 'Lo-Fi',
    tagline: 'Chill beats to relax',
    accentColor: 'purple',
    vibe: 'Cozy and nostalgic',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  piano: {
    name: 'Piano',
    tagline: 'Peaceful keys',
    accentColor: 'blue',
    vibe: 'Elegant and calm',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
  },
  jazz: {
    name: 'Jazz',
    tagline: 'Smooth vibes',
    accentColor: 'amber',
    vibe: 'Warm and sophisticated',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  classical: {
    name: 'Classical',
    tagline: 'Timeless elegance',
    accentColor: 'gold',
    vibe: 'Refined and majestic',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  },
  ambient: {
    name: 'Ambient',
    tagline: 'Atmospheric soundscapes',
    accentColor: 'teal',
    vibe: 'Ethereal and immersive',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  },
  study: {
    name: 'Study',
    tagline: 'Focus music',
    accentColor: 'green',
    vibe: 'Focused and productive',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  sleep: {
    name: 'Sleep',
    tagline: 'Drift into rest',
    accentColor: 'indigo',
    vibe: 'Calm and soothing',
    gradient: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)',
  },
}

// Default genre to use when none is selected
export const DEFAULT_GENRE = 'lofi'

// Get theme info for a genre
export function getTheme(genre: string): GenreTheme {
  return GENRE_THEMES[genre] || GENRE_THEMES[DEFAULT_GENRE]
}

// Get all available genres
export const AVAILABLE_GENRES = Object.keys(GENRE_THEMES)

// Get fallback gradient for a genre
export function getFallbackGradient(genre: string): string {
  const theme = GENRE_THEMES[genre]
  return theme?.gradient || GENRE_THEMES[DEFAULT_GENRE].gradient
}

// Helper to get random item from array
export function getRandomFromArray<T>(arr: T[]): T | null {
  if (!arr || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

// Helper to get daily item from array (same item for same day)
export function getDailyFromArray<T>(arr: T[]): T | null {
  if (!arr || arr.length === 0) return null
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )
  return arr[dayOfYear % arr.length]
}
