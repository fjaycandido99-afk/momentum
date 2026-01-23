// Theme definitions for each music genre
// Each genre has its own visual aesthetic that themes the app

export interface GenreTheme {
  name: string
  tagline: string
  backgroundFolder: string
  accentColor: string
  vibe: string
  // Background images for this genre
  backgrounds: string[]
}

// Define theme for each genre
export const GENRE_THEMES: Record<string, GenreTheme> = {
  lofi: {
    name: 'Lo-Fi',
    tagline: 'Chill beats to relax',
    backgroundFolder: '/backgrounds/lofi',
    accentColor: 'purple',
    vibe: 'Cozy and nostalgic',
    backgrounds: Array.from({ length: 34 }, (_, i) => `/backgrounds/lofi/lofi${i + 1}.jpg`),
  },
  piano: {
    name: 'Piano',
    tagline: 'Peaceful keys',
    backgroundFolder: '/backgrounds/piano',
    accentColor: 'blue',
    vibe: 'Elegant and calm',
    backgrounds: Array.from({ length: 5 }, (_, i) => `/backgrounds/piano/piano${i + 1}.jpg`),
  },
  jazz: {
    name: 'Jazz',
    tagline: 'Smooth vibes',
    backgroundFolder: '/backgrounds/jazz',
    accentColor: 'amber',
    vibe: 'Warm and sophisticated',
    backgrounds: Array.from({ length: 5 }, (_, i) => `/backgrounds/jazz/jazz${i + 1}.jpg`),
  },
  classical: {
    name: 'Classical',
    tagline: 'Timeless elegance',
    backgroundFolder: '/backgrounds/classical',
    accentColor: 'gold',
    vibe: 'Refined and majestic',
    backgrounds: Array.from({ length: 5 }, (_, i) => `/backgrounds/classical/classical${i + 1}.jpg`),
  },
  ambient: {
    name: 'Ambient',
    tagline: 'Atmospheric soundscapes',
    backgroundFolder: '/backgrounds/ambient',
    accentColor: 'teal',
    vibe: 'Ethereal and immersive',
    backgrounds: Array.from({ length: 5 }, (_, i) => `/backgrounds/ambient/ambient${i + 1}.jpg`),
  },
  study: {
    name: 'Study',
    tagline: 'Focus music',
    backgroundFolder: '/backgrounds/study',
    accentColor: 'green',
    vibe: 'Focused and productive',
    backgrounds: Array.from({ length: 5 }, (_, i) => `/backgrounds/study/study${i + 1}.jpg`),
  },
}

// Default genre to use when none is selected
export const DEFAULT_GENRE = 'lofi'

// Fallback backgrounds when genre-specific images are unavailable
export const FALLBACK_BACKGROUNDS = Array.from({ length: 31 }, (_, i) => `/backgrounds/bg${i + 1}.jpg`)

// Get a random background for a given genre
export function getRandomBackground(genre: string): string {
  const theme = GENRE_THEMES[genre]
  if (theme && theme.backgrounds.length > 0) {
    const randomIndex = Math.floor(Math.random() * theme.backgrounds.length)
    return theme.backgrounds[randomIndex]
  }
  // Fallback to general backgrounds
  const fallbackIndex = Math.floor(Math.random() * FALLBACK_BACKGROUNDS.length)
  return FALLBACK_BACKGROUNDS[fallbackIndex]
}

// Get a deterministic background based on date (same background for same day)
export function getDailyBackground(genre: string): string {
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )

  const theme = GENRE_THEMES[genre]
  if (theme && theme.backgrounds.length > 0) {
    return theme.backgrounds[dayOfYear % theme.backgrounds.length]
  }
  // Fallback to general backgrounds
  return FALLBACK_BACKGROUNDS[dayOfYear % FALLBACK_BACKGROUNDS.length]
}

// Get theme info for a genre
export function getTheme(genre: string): GenreTheme {
  return GENRE_THEMES[genre] || GENRE_THEMES[DEFAULT_GENRE]
}

// Get all available genres
export const AVAILABLE_GENRES = Object.keys(GENRE_THEMES)
