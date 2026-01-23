'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MusicThemeSelector } from '@/components/onboarding/MusicThemeSelector'

export default function ThemeSetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSelect = async (genre: string) => {
    setIsLoading(true)
    try {
      // Save the selected genre and mark theme onboarding as done
      await fetch('/api/daily-guide/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_music_genre: genre,
          theme_onboarding_done: true,
        }),
      })

      // Navigate to the home page
      router.push('/')
    } catch (error) {
      console.error('Error saving theme preference:', error)
      setIsLoading(false)
    }
  }

  const handleSkip = async () => {
    setIsLoading(true)
    try {
      // Mark theme onboarding as done with default (lofi)
      await fetch('/api/daily-guide/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_music_genre: 'lofi',
          theme_onboarding_done: true,
        }),
      })

      // Navigate to the home page
      router.push('/')
    } catch (error) {
      console.error('Error saving theme preference:', error)
      setIsLoading(false)
    }
  }

  return (
    <MusicThemeSelector
      onSelect={handleSelect}
      onSkip={handleSkip}
      isLoading={isLoading}
    />
  )
}
