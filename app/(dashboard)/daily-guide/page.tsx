'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { authFetch } from '@/lib/auth-fetch'
import { isSessionType } from '@/lib/daily-guide/decision-tree'

function DailyGuideContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [isOnboarded, setIsOnboarded] = useState(false)

  useEffect(() => {
    const checkOnboarding = async () => {
      const minDelay = new Promise(resolve => setTimeout(resolve, 2500))
      try {
        const [response] = await Promise.all([
          authFetch('/api/daily-guide/preferences'),
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

  // ?session=<id> lets a notification open the card it was about, rather
  // than whichever one the clock happens to land on.
  const requested = searchParams.get('session')
  const initialSession = isSessionType(requested) ? requested : null

  return (
    <ErrorBoundary>
      <DailyGuideHome initialSession={initialSession} />
    </ErrorBoundary>
  )
}

export default function DailyGuidePage() {
  // useSearchParams needs a Suspense boundary to avoid opting the whole
  // route into client-side-only rendering.
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DailyGuideContent />
    </Suspense>
  )
}
