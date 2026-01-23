'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  GENRE_THEMES,
  DEFAULT_GENRE,
  getTheme,
  getFallbackGradient,
  getRandomFromArray,
  getDailyFromArray,
  type GenreTheme,
} from '@/lib/theme/music-theme'

interface ThemeContextType {
  // Current genre and theme
  genre: string
  theme: GenreTheme

  // Background utilities
  backgroundImages: string[]
  backgroundsLoading: boolean
  getRandomBackground: () => string
  getDailyBackground: () => string

  // Theme management
  setGenre: (genre: string) => void
  isLoading: boolean

  // Onboarding state
  themeOnboardingDone: boolean
  setThemeOnboardingDone: (done: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

interface ThemeProviderProps {
  children: ReactNode
}

// Cache for backgrounds per genre
const backgroundsCache: Map<string, string[]> = new Map()

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [genre, setGenreState] = useState<string>(DEFAULT_GENRE)
  const [isLoading, setIsLoading] = useState(true)
  const [backgroundsLoading, setBackgroundsLoading] = useState(false)
  const [backgroundImages, setBackgroundImages] = useState<string[]>([])
  const [themeOnboardingDone, setThemeOnboardingDoneState] = useState(false)

  // Fetch backgrounds from Supabase Storage
  const fetchBackgrounds = useCallback(async (selectedGenre: string) => {
    // Check cache first
    if (backgroundsCache.has(selectedGenre)) {
      setBackgroundImages(backgroundsCache.get(selectedGenre)!)
      return
    }

    setBackgroundsLoading(true)
    try {
      const response = await fetch(`/api/backgrounds?genre=${selectedGenre}`)
      if (response.ok) {
        const data = await response.json()
        const urls = data.images?.map((img: { url: string }) => img.url) || []
        backgroundsCache.set(selectedGenre, urls)
        setBackgroundImages(urls)
      }
    } catch (error) {
      console.error('Error fetching backgrounds:', error)
      setBackgroundImages([])
    } finally {
      setBackgroundsLoading(false)
    }
  }, [])

  // Fetch user preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await fetch('/api/daily-guide/preferences')
        if (response.ok) {
          const prefs = await response.json()
          const preferredGenre = prefs.preferred_music_genre || DEFAULT_GENRE
          setGenreState(preferredGenre)
          setThemeOnboardingDoneState(prefs.theme_onboarding_done ?? false)
          // Fetch backgrounds for the preferred genre
          fetchBackgrounds(preferredGenre)
        }
      } catch (error) {
        console.error('Error fetching theme preferences:', error)
        // Still try to fetch backgrounds for default genre
        fetchBackgrounds(DEFAULT_GENRE)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreferences()
  }, [fetchBackgrounds])

  // Set genre and update in backend
  const setGenre = useCallback(async (newGenre: string) => {
    setGenreState(newGenre)
    // Fetch backgrounds for the new genre
    fetchBackgrounds(newGenre)

    try {
      await fetch('/api/daily-guide/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_music_genre: newGenre,
        }),
      })
    } catch (error) {
      console.error('Error updating theme preference:', error)
    }
  }, [fetchBackgrounds])

  // Set theme onboarding done
  const setThemeOnboardingDone = useCallback(async (done: boolean) => {
    setThemeOnboardingDoneState(done)

    try {
      await fetch('/api/daily-guide/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme_onboarding_done: done,
        }),
      })
    } catch (error) {
      console.error('Error updating theme onboarding status:', error)
    }
  }, [])

  // Get current theme
  const theme = getTheme(genre)

  // Background utilities - return gradient fallback if no images
  const handleGetRandomBackground = useCallback(() => {
    const bg = getRandomFromArray(backgroundImages)
    return bg || getFallbackGradient(genre)
  }, [backgroundImages, genre])

  const handleGetDailyBackground = useCallback(() => {
    const bg = getDailyFromArray(backgroundImages)
    return bg || getFallbackGradient(genre)
  }, [backgroundImages, genre])

  const value: ThemeContextType = {
    genre,
    theme,
    backgroundImages,
    backgroundsLoading,
    getRandomBackground: handleGetRandomBackground,
    getDailyBackground: handleGetDailyBackground,
    setGenre,
    isLoading,
    themeOnboardingDone,
    setThemeOnboardingDone,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Optional hook that doesn't throw if outside provider
export function useThemeOptional() {
  return useContext(ThemeContext)
}
