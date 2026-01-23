'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'

export default function DailyGuidePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isOnboarded, setIsOnboarded] = useState(false)

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const response = await fetch('/api/daily-guide/preferences')
        if (response.ok) {
          const data = await response.json()
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

  return <DailyGuideHome />
}
