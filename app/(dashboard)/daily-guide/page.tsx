'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'

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
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    )
  }

  if (!isOnboarded) {
    return null
  }

  return <DailyGuideHome />
}
