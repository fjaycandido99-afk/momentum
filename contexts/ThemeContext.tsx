'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  GENRE_THEMES,
  DEFAULT_GENRE,
  getRandomBackground,
  getDailyBackground,
  getTheme,
  type GenreTheme,
} from '@/lib/theme/music-theme'

interface ThemeContextType {
  // Current genre and theme
  genre: string
  theme: GenreTheme

  // Background utilities
  backgroundImages: string[]
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

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [genre, setGenreState] = useState<string>(DEFAULT_GENRE)
  const [isLoading, setIsLoading] = useState(true)
  const [themeOnboardingDone, setThemeOnboardingDoneState] = useState(false)

  // Fetch user preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await fetch('/api/daily-guide/preferences')
        if (response.ok) {
          const prefs = await response.json()
          if (prefs.preferred_music_genre) {
            setGenreState(prefs.preferred_music_genre)
          }
          setThemeOnboardingDoneState(prefs.theme_onboarding_done ?? false)
        }
      } catch (error) {
        console.error('Error fetching theme preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreferences()
  }, [])

  // Set genre and update in backend
  const setGenre = useCallback(async (newGenre: string) => {
    setGenreState(newGenre)

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
  }, [])

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

  // Background utilities
  const handleGetRandomBackground = useCallback(() => {
    return getRandomBackground(genre)
  }, [genre])

  const handleGetDailyBackground = useCallback(() => {
    return getDailyBackground(genre)
  }, [genre])

  const value: ThemeContextType = {
    genre,
    theme,
    backgroundImages: theme.backgrounds,
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
