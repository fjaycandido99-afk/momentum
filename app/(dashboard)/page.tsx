'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [needsThemeSetup, setNeedsThemeSetup] = useState(false)

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const response = await fetch('/api/daily-guide/preferences')
        if (response.ok) {
          const prefs = await response.json()

          // First check if Daily Guide onboarding is complete
          if (!prefs.guide_onboarding_done) {
            setNeedsOnboarding(true)
          }
          // Then check if theme onboarding is complete
          else if (!prefs.theme_onboarding_done) {
            setNeedsThemeSetup(true)
          }
        }
      } catch (error) {
        console.error('Error checking onboarding:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkOnboarding()
  }, [])

  useEffect(() => {
    if (needsOnboarding) {
      router.push('/daily-guide/onboarding')
    } else if (needsThemeSetup) {
      router.push('/theme-setup')
    }
  }, [needsOnboarding, needsThemeSetup, router])

  if (isLoading || needsOnboarding || needsThemeSetup) {
    return <LoadingScreen />
  }

  return <DailyGuideHome />
}
