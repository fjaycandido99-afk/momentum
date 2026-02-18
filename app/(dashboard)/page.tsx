'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ImmersiveHome } from '@/components/home/ImmersiveHome'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [needsMindsetSelection, setNeedsMindsetSelection] = useState(false)

  useEffect(() => {
    async function checkOnboarding() {
      const minDelay = new Promise(resolve => setTimeout(resolve, 300))
      try {
        const [response] = await Promise.all([
          fetch('/api/daily-guide/preferences'),
          minDelay,
        ])
        if (response.ok) {
          const prefs = await response.json()

          // Guests can use app immediately - no onboarding required
          if (prefs.isGuest) {
            setIsLoading(false)
            return
          }

          // For signed-in users, check mindset selection first
          if (!prefs.mindset_selected_at) {
            setNeedsMindsetSelection(true)
            setIsLoading(false)
            return
          }

          // Then check onboarding status
          if (!prefs.guide_onboarding_done) {
            setNeedsOnboarding(true)
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
    if (needsMindsetSelection) {
      router.push('/mindset-selection')
    }
  }, [needsMindsetSelection, router])

  useEffect(() => {
    if (needsOnboarding) {
      router.push('/daily-guide/onboarding')
    }
  }, [needsOnboarding, router])

  if (isLoading || needsOnboarding || needsMindsetSelection) {
    return <LoadingScreen />
  }

  return <ErrorBoundary><ImmersiveHome /></ErrorBoundary>
}
