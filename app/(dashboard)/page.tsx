'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'

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
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    )
  }

  return <DailyGuideHome />
}
