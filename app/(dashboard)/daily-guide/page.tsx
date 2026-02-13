'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function DailyGuidePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isOnboarded, setIsOnboarded] = useState(false)

  useEffect(() => {
    const checkOnboarding = async () => {
      const minDelay = new Promise(resolve => setTimeout(resolve, 2500))
      try {
        const [response] = await Promise.all([
          fetch('/api/daily-guide/preferences'),
          minDelay,
        ])
        if (response.ok) {
          const data = await response.json()

          // Guests can use app immediately
          if (data.isGuest) {
            setIsOnboarded(true)
            setIsLoading(false)
            return
          }

          if (data.guide_onboarding_done) {
            setIsOnboarded(true)
          } else {
            router.push('/daily-guide/onboarding')
            return
          }
        } else {
          router.push('/daily-guide/onboarding')
          return
        }
      } catch (error) {
        console.error('Error checking onboarding:', error)
        router.push('/daily-guide/onboarding')
        return
      } finally {
        setIsLoading(false)
      }
    }

    checkOnboarding()
  }, [router])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isOnboarded) {
    return null
  }

  return <ErrorBoundary><DailyGuideHome /></ErrorBoundary>
}
